#!/usr/bin/env python3
"""
RIFT Governance Validation Engine
OBINexus AEGIS Methodology Compliance
Systematic validation of gov.substage.stage.riftrc.{N} configurations
"""

import json
import hashlib
import datetime
import subprocess
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum

class StageType(Enum):
    LEGACY = "legacy"
    EXPERIMENTAL = "experimental" 
    STABLE = "stable"

class ValidationResult(Enum):
    VALID = "valid"
    EXPIRED = "expired"
    INVALID_SCHEMA = "invalid_schema"
    SEMVERX_VIOLATION = "semverx_violation"
    MISSING_GOVERNANCE = "missing_governance"

@dataclass
class GovernanceConfig:
    package_name: str
    version: str
    timestamp: str
    stage: int
    stage_type: StageType
    semverx_lock: bool
    entry_point: str
    nlink_enabled: bool
    custom_stages: List[Dict] = None

class RIFTGovernanceValidator:
    """
    Machine-verifiable governance validation for RIFT compiler pipeline
    Enforces lifecycle-aware configuration naming and behavioral validation
    """
    
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.governance_cache = {}
        self.validation_log = []
        
    def validate_governance_file(self, governance_path: str) -> Tuple[ValidationResult, GovernanceConfig]:
        """
        Validates individual governance configuration file
        Returns validation result and parsed config if valid
        """
        try:
            with open(governance_path, 'r') as f:
                config_data = json.load(f)
            
            # Schema validation
            if not self._validate_required_fields(config_data):
                return ValidationResult.INVALID_SCHEMA, None
            
            config = self._parse_governance_config(config_data)
            
            # Timestamp freshness check
            if not self._validate_timestamp_freshness(config.timestamp):
                return ValidationResult.EXPIRED, config
            
            # SemVerX lock enforcement
            if config.semverx_lock and not self._validate_semverx_compliance(config):
                return ValidationResult.SEMVERX_VIOLATION, config
            
            return ValidationResult.VALID, config
            
        except (json.JSONDecodeError, FileNotFoundError, KeyError) as e:
            self._log_validation_error(f"Governance file validation failed: {e}")
            return ValidationResult.INVALID_SCHEMA, None
    
    def validate_stage_governance(self, stage_id: int) -> Dict[str, ValidationResult]:
        """
        Validates all substage governance files for a given compiler stage
        """
        results = {}
        
        # Standard substages mapping
        substage_mapping = {
            0: ["tokenizer"],
            1: ["parser"], 
            2: ["semantic"],
            3: ["validator"],
            4: ["bytecode"],
            5: ["optimizer", "verifier"],  # Stage 5 includes security optimization
            6: ["emitter"]
        }
        
        # Validate primary stage governance
        primary_config_path = f"{self.project_root}/.riftrc.{stage_id}"
        if os.path.exists(primary_config_path):
            result, config = self.validate_governance_file(primary_config_path)
            results[f"stage_{stage_id}_primary"] = result
        
        # Validate substage governance files
        if stage_id in substage_mapping:
            for substage in substage_mapping[stage_id]:
                gov_path = f"{self.project_root}/gov.{substage}.stage.riftrc.{stage_id}"
                if os.path.exists(gov_path):
                    result, config = self.validate_governance_file(gov_path)
                    results[f"{substage}_governance"] = result
                    
                    # Stage 5 optimizer security validation
                    if stage_id == 5 and substage == "optimizer":
                        security_result = self._validate_stage5_security_governance(config)
                        results["optimizer_security"] = security_result
                else:
                    # Missing governance file - check if fallback exists
                    fallback_result = self._handle_missing_governance(stage_id, substage)
                    results[f"{substage}_fallback"] = fallback_result
        
        return results
    
    def validate_complete_pipeline(self) -> Dict[int, Dict[str, ValidationResult]]:
        """
        Validates governance across all RIFT pipeline stages (0-6)
        """
        pipeline_results = {}
        
        for stage_id in range(7):  # Stages 0-6
            stage_results = self.validate_stage_governance(stage_id)
            pipeline_results[stage_id] = stage_results
            
            # Critical failure check
            if any(result in [ValidationResult.SEMVERX_VIOLATION, ValidationResult.EXPIRED] 
                   for result in stage_results.values()):
                self._trigger_build_halt(stage_id, stage_results)
        
        return pipeline_results
    
    def validate_custom_stages(self, custom_stage_configs: List[Dict]) -> Dict[str, ValidationResult]:
        """
        Validates user-defined custom stages (backlog, preprod, chaos, etc.)
        """
        results = {}
        
        for stage_config in custom_stage_configs:
            stage_name = stage_config.get("name")
            stage_id = stage_config.get("stage_id")
            
            if not stage_name or not stage_id:
                results[f"custom_{stage_name or 'unnamed'}"] = ValidationResult.INVALID_SCHEMA
                continue
            
            # Check for governance file
            custom_gov_path = f"{self.project_root}/gov.{stage_name}.stage.riftrc.custom"
            if os.path.exists(custom_gov_path):
                result, config = self.validate_governance_file(custom_gov_path)
                results[f"custom_{stage_name}"] = result
            else:
                # Custom stages can be optional if not activated
                if stage_config.get("activated", False):
                    results[f"custom_{stage_name}"] = ValidationResult.MISSING_GOVERNANCE
                else:
                    results[f"custom_{stage_name}"] = ValidationResult.VALID
        
        return results
    
    def _validate_stage5_security_governance(self, config: GovernanceConfig) -> ValidationResult:
        """
        Stage 5 Optimizer Security Governance Enforcement
        Validates AST minimization and path sanitization compliance
        """
        if not hasattr(config, 'stage_5_optimizer'):
            return ValidationResult.MISSING_GOVERNANCE
        
        optimizer_config = getattr(config, 'stage_5_optimizer', {})
        
        # Required security validations for Stage 5
        required_fields = ["optimizer_model", "minimization_verified", "audit_enabled"]
        for field in required_fields:
            if field not in optimizer_config:
                return ValidationResult.INVALID_SCHEMA
        
        # Verify minimization was actually performed
        if not optimizer_config.get("minimization_verified", False):
            return ValidationResult.SEMVERX_VIOLATION
        
        # Check for audit trail
        if optimizer_config.get("audit_enabled", True):
            audit_path = f"{self.project_root}/logs/opt_trace.sig"
            if not os.path.exists(audit_path):
                return ValidationResult.MISSING_GOVERNANCE
        
        return ValidationResult.VALID
    
    def _validate_required_fields(self, config_data: Dict) -> bool:
        """Validates required fields are present in governance config"""
        required_fields = ["package_name", "version", "stage", "timestamp"]
        return all(field in config_data for field in required_fields)
    
    def _parse_governance_config(self, config_data: Dict) -> GovernanceConfig:
        """Parses JSON config data into GovernanceConfig object"""
        return GovernanceConfig(
            package_name=config_data["package_name"],
            version=config_data["version"],
            timestamp=config_data["timestamp"],
            stage=config_data["stage"],
            stage_type=StageType(config_data.get("stage_type", "experimental")),
            semverx_lock=config_data.get("semverx_lock", False),
            entry_point=config_data.get("entry_point", ""),
            nlink_enabled=config_data.get("nlink_enabled", False),
            custom_stages=config_data.get("custom_stages", [])
        )
    
    def _validate_timestamp_freshness(self, timestamp_str: str) -> bool:
        """Validates timestamp hasn't expired (configurable expiration window)"""
        try:
            config_timestamp = datetime.datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            current_time = datetime.datetime.now(datetime.timezone.utc)
            
            # 90-day expiration window for governance configs
            expiration_window = datetime.timedelta(days=90)
            
            return (current_time - config_timestamp) < expiration_window
        except ValueError:
            return False
    
    def _validate_semverx_compliance(self, config: GovernanceConfig) -> bool:
        """Validates SemVerX lock compliance using NLink integration"""
        if not config.nlink_enabled:
            return True  # Skip if NLink not enabled
        
        # Execute NLink validation
        try:
            result = subprocess.run([
                "nlink", "--semverx-validate", 
                "--project-root", self.project_root,
                "--package", config.package_name,
                "--version", config.version
            ], capture_output=True, text=True, timeout=30)
            
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            self._log_validation_error("NLink validation failed - treating as non-compliant")
            return False
    
    def _handle_missing_governance(self, stage_id: int, substage: str) -> ValidationResult:
        """
        Handles missing governance files with fallback logic
        """
        # Check for fallback governance in irift/ directory
        fallback_path = f"{self.project_root}/irift/gov.{substage}.stage.riftrc.{stage_id}"
        if os.path.exists(fallback_path):
            result, config = self.validate_governance_file(fallback_path)
            self._log_validation_error(f"Using fallback governance for {substage} stage {stage_id}")
            return result
        
        # No fallback available - check if stage is experimental
        primary_config_path = f"{self.project_root}/.riftrc.{stage_id}"
        if os.path.exists(primary_config_path):
            with open(primary_config_path, 'r') as f:
                primary_config = json.load(f)
            
            if primary_config.get("stage_type") == "experimental":
                # Experimental stages can operate without full governance
                return ValidationResult.VALID
        
        return ValidationResult.MISSING_GOVERNANCE
    
    def _trigger_build_halt(self, stage_id: int, stage_results: Dict[str, ValidationResult]):
        """
        Triggers build halt on critical governance violations
        """
        critical_failures = [res for res in stage_results.values() 
                           if res in [ValidationResult.SEMVERX_VIOLATION, ValidationResult.EXPIRED]]
        
        if critical_failures:
            halt_message = f"AEGIS BUILD HALT: Stage {stage_id} governance violation detected"
            self._log_validation_error(halt_message)
            raise RuntimeError(halt_message)
    
    def _log_validation_error(self, message: str):
        """Logs validation errors for audit trail"""
        timestamp = datetime.datetime.now().isoformat()
        log_entry = f"[{timestamp}] GOVERNANCE_VALIDATION: {message}"
        self.validation_log.append(log_entry)
        print(log_entry)  # Also output to console
    
    def generate_governance_report(self) -> Dict:
        """
        Generates comprehensive governance validation report
        """
        pipeline_results = self.validate_complete_pipeline()
        
        # Load and validate custom stages if they exist
        custom_results = {}
        main_config_path = f"{self.project_root}/.riftrc"
        if os.path.exists(main_config_path):
            with open(main_config_path, 'r') as f:
                main_config = json.load(f)
            custom_stages = main_config.get("custom_stages", [])
            custom_results = self.validate_custom_stages(custom_stages)
        
        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "project_root": self.project_root,
            "pipeline_validation": pipeline_results,
            "custom_stage_validation": custom_results,
            "validation_log": self.validation_log,
            "overall_status": self._determine_overall_status(pipeline_results, custom_results)
        }
    
    def _determine_overall_status(self, pipeline_results: Dict, custom_results: Dict) -> str:
        """Determines overall validation status"""
        all_results = []
        
        for stage_results in pipeline_results.values():
            all_results.extend(stage_results.values())
        all_results.extend(custom_results.values())
        
        if any(result == ValidationResult.SEMVERX_VIOLATION for result in all_results):
            return "CRITICAL_FAILURE"
        elif any(result == ValidationResult.EXPIRED for result in all_results):
            return "EXPIRED_GOVERNANCE"
        elif any(result == ValidationResult.MISSING_GOVERNANCE for result in all_results):
            return "MISSING_GOVERNANCE"
        elif any(result == ValidationResult.INVALID_SCHEMA for result in all_results):
            return "SCHEMA_VIOLATIONS"
        else:
            return "COMPLIANT"


def main():
    """
    Main execution function for governance validation
    """
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python rift_governance_validator.py <project_root>")
        sys.exit(1)
    
    project_root = sys.argv[1]
    validator = RIFTGovernanceValidator(project_root)
    
    try:
        report = validator.generate_governance_report()
        
        # Output validation report
        print("\n" + "="*60)
        print("RIFT GOVERNANCE VALIDATION REPORT")
        print("="*60)
        print(f"Project: {report['project_root']}")
        print(f"Timestamp: {report['timestamp']}")
        print(f"Overall Status: {report['overall_status']}")
        
        # Detailed results
        for stage_id, results in report['pipeline_validation'].items():
            print(f"\nStage {stage_id} Results:")
            for component, result in results.items():
                print(f"  {component}: {result.value}")
        
        if report['custom_stage_validation']:
            print(f"\nCustom Stage Results:")
            for stage, result in report['custom_stage_validation'].items():
                print(f"  {stage}: {result.value}")
        
        # Exit with appropriate code
        if report['overall_status'] in ['CRITICAL_FAILURE', 'EXPIRED_GOVERNANCE']:
            sys.exit(1)  # Build halt
        elif report['overall_status'] in ['MISSING_GOVERNANCE', 'SCHEMA_VIOLATIONS']:
            sys.exit(2)  # Warning state
        else:
            sys.exit(0)  # Success
            
    except RuntimeError as e:
        print(f"FATAL: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
