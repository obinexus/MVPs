"""
OBI VAT Enforcement System
Real-time VAT compliance enforcement based on stability metrics
Integrates with OBI Consciousness Stability Framework
"""

from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json
import uuid

class ServiceStatus(Enum):
    """Service delivery status for VAT purposes"""
    AI_COMPLETED = "ai_completed"
    AI_PARTIAL_HUMAN_COMPLETE = "ai_partial_human_complete"
    HUMAN_TAKEOVER = "human_takeover"
    SERVICE_VOID = "service_void"
    EMERGENCY_STOP = "emergency_stop"

class VATTreatment(Enum):
    """VAT treatment based on service delivery"""
    STANDARD_RATE = "standard"
    REDUCED_RATE = "reduced"
    ZERO_RATED = "zero"
    EXEMPT = "exempt"
    REVERSE_CHARGE = "reverse"
    NOT_APPLICABLE = "void"

@dataclass
class ServiceTransaction:
    """Represents a service transaction for VAT purposes"""
    transaction_id: str
    timestamp: datetime
    service_type: str
    human_loop_type: str  # HOTL, HONTL, HITL
    initial_stability: float
    final_stability: float
    peak_stability: float
    service_status: ServiceStatus
    human_intervention_seconds: float = 0.0
    ai_percentage: float = 100.0

class VATEnforcementEngine:
    """
    Main enforcement engine that determines VAT treatment
    based on real-time stability metrics
    """
    
    def __init__(self):
        self.uk_standard_rate = Decimal("0.20")
        self.enforcement_log = []
        
    def determine_vat_treatment(self, 
                               transaction: ServiceTransaction,
                               customer_location: str,
                               b2b: bool = False) -> Tuple[VATTreatment, Decimal, Dict]:
        """
        Determine VAT treatment based on stability and service delivery
        
        Returns:
            Tuple of (treatment_type, rate, enforcement_details)
        """
        enforcement_details = {
            "transaction_id": transaction.transaction_id,
            "timestamp": datetime.utcnow().isoformat(),
            "stability_assessment": self._assess_stability(transaction),
            "service_classification": self._classify_service(transaction),
            "enforcement_actions": []
        }
        
        # Rule 1: Emergency stops void VAT
        if transaction.service_status == ServiceStatus.EMERGENCY_STOP:
            enforcement_details["enforcement_actions"].append("VOID_DUE_TO_EMERGENCY")
            return VATTreatment.NOT_APPLICABLE, Decimal("0.00"), enforcement_details
        
        # Rule 2: High stability breaches require review
        if transaction.peak_stability > 6:
            enforcement_details["enforcement_actions"].append("MANUAL_REVIEW_REQUIRED")
            enforcement_details["review_reason"] = "Critical stability breach during service"
            
            if transaction.service_status == ServiceStatus.SERVICE_VOID:
                return VATTreatment.NOT_APPLICABLE, Decimal("0.00"), enforcement_details
        
        # Rule 3: Service classification based on AI/Human split
        if transaction.ai_percentage < 50:
            enforcement_details["service_classification"] = "PRIMARILY_HUMAN"
            rate = self._determine_human_service_rate(transaction.service_type)
        else:
            enforcement_details["service_classification"] = "PRIMARILY_AI"
            rate = self._determine_ai_service_rate(
                transaction.service_type, 
                customer_location, 
                b2b
            )
        
        # Rule 4: Stability-based adjustments
        if 3 < transaction.peak_stability <= 6:
            enforcement_details["enforcement_actions"].append("STABILITY_DISCOUNT_APPLIED")
            rate = rate * Decimal("0.95")  # 5% discount for service disruption
            
        # Rule 5: Cross-border digital services
        if (transaction.service_type in ["AI_CONCIERGE", "AUTOMATED_CHECKIN"] and
            customer_location != "UK" and b2b):
            return VATTreatment.REVERSE_CHARGE, Decimal("0.00"), enforcement_details
        
        treatment = VATTreatment.STANDARD_RATE if rate == self.uk_standard_rate else VATTreatment.REDUCED_RATE
        return treatment, rate, enforcement_details
    
    def _assess_stability(self, transaction: ServiceTransaction) -> Dict:
        """Assess stability throughout service delivery"""
        return {
            "initial": transaction.initial_stability,
            "final": transaction.final_stability,
            "peak": transaction.peak_stability,
            "average": (transaction.initial_stability + transaction.final_stability) / 2,
            "breach_level": "CRITICAL" if transaction.peak_stability > 6 else
                           "WARNING" if transaction.peak_stability > 3 else
                           "NORMAL"
        }
    
    def _classify_service(self, transaction: ServiceTransaction) -> str:
        """Classify service based on delivery method"""
        if transaction.human_loop_type == "HOTL":
            if transaction.human_intervention_seconds > 0:
                return "HOTL_WITH_INTERVENTION"
            return "PURE_HOTL"
        elif transaction.human_loop_type == "HONTL":
            if transaction.ai_percentage > 80:
                return "HONTL_AI_PRIMARY"
            return "HONTL_BALANCED"
        else:
            return "HITL"
    
    def _determine_ai_service_rate(self, 
                                  service_type: str,
                                  customer_location: str,
                                  b2b: bool) -> Decimal:
        """Determine VAT rate for AI services"""
        # Digital services generally standard rated
        if service_type in ["AI_CONCIERGE", "AUTOMATED_CHECKIN"]:
            return self.uk_standard_rate
        
        # Transport services have complex rules
        if service_type == "AUTONOMOUS_TRANSPORT":
            if customer_location == "UK":
                return self.uk_standard_rate
            else:
                return Decimal("0.00")  # Zero-rated international
        
        # Hotel accommodation
        if service_type == "HOTEL_ACCOMMODATION":
            return self.uk_standard_rate
        
        return self.uk_standard_rate
    
    def _determine_human_service_rate(self, service_type: str) -> Decimal:
        """Determine VAT rate for human-delivered services"""
        # Generally same as AI but may have different treatments
        return self.uk_standard_rate
    
    def generate_enforcement_record(self,
                                   transaction: ServiceTransaction,
                                   vat_treatment: VATTreatment,
                                   rate: Decimal,
                                   amount: Decimal,
                                   enforcement_details: Dict) -> Dict:
        """Generate complete enforcement record for audit"""
        vat_amount = (amount * rate).quantize(Decimal("0.01"))
        
        record = {
            "enforcement_id": str(uuid.uuid4()),
            "transaction": {
                "id": transaction.transaction_id,
                "timestamp": transaction.timestamp.isoformat(),
                "service_type": transaction.service_type,
                "human_loop_type": transaction.human_loop_type,
                "service_status": transaction.service_status.value
            },
            "stability_metrics": {
                "initial": transaction.initial_stability,
                "final": transaction.final_stability,
                "peak": transaction.peak_stability,
                "compliant": transaction.peak_stability <= 3
            },
            "vat_calculation": {
                "treatment": vat_treatment.value,
                "rate": str(rate),
                "net_amount": str(amount),
                "vat_amount": str(vat_amount),
                "gross_amount": str(amount + vat_amount)
            },
            "enforcement": enforcement_details,
            "compliance_flags": self._generate_compliance_flags(transaction, vat_treatment)
        }
        
        self.enforcement_log.append(record)
        return record
    
    def _generate_compliance_flags(self, 
                                  transaction: ServiceTransaction,
                                  vat_treatment: VATTreatment) -> List[str]:
        """Generate compliance flags for reporting"""
        flags = []
        
        if transaction.peak_stability > 3:
            flags.append("STABILITY_BREACH")
        
        if transaction.service_status == ServiceStatus.EMERGENCY_STOP:
            flags.append("EMERGENCY_STOP")
        
        if transaction.human_intervention_seconds > 60:
            flags.append("SIGNIFICANT_HUMAN_INTERVENTION")
        
        if vat_treatment == VATTreatment.NOT_APPLICABLE:
            flags.append("VAT_VOID")
        
        if transaction.human_loop_type == "HOTL" and transaction.peak_stability > 6:
            flags.append("HOTL_CRITICAL_EVENT")
        
        return flags
    
    def generate_daily_enforcement_report(self) -> Dict:
        """Generate daily VAT enforcement summary"""
        if not self.enforcement_log:
            return {"message": "No transactions to report"}
        
        report = {
            "report_date": datetime.utcnow().date().isoformat(),
            "total_transactions": len(self.enforcement_log),
            "enforcement_summary": {
                "standard_rate": 0,
                "reduced_rate": 0,
                "zero_rated": 0,
                "void": 0,
                "manual_review": 0
            },
            "stability_summary": {
                "compliant_transactions": 0,
                "warning_level": 0,
                "critical_level": 0
            },
            "vat_totals": {
                "net": Decimal("0.00"),
                "vat": Decimal("0.00"),
                "gross": Decimal("0.00")
            },
            "compliance_issues": []
        }
        
        for record in self.enforcement_log:
            # Update counts
            treatment = record["vat_calculation"]["treatment"]
            if treatment == "standard":
                report["enforcement_summary"]["standard_rate"] += 1
            elif treatment == "void":
                report["enforcement_summary"]["void"] += 1
            
            # Check manual review
            if "MANUAL_REVIEW_REQUIRED" in record["enforcement"]["enforcement_actions"]:
                report["enforcement_summary"]["manual_review"] += 1
            
            # Stability compliance
            if record["stability_metrics"]["compliant"]:
                report["stability_summary"]["compliant_transactions"] += 1
            elif record["stability_metrics"]["peak"] > 6:
                report["stability_summary"]["critical_level"] += 1
            else:
                report["stability_summary"]["warning_level"] += 1
            
            # VAT totals
            report["vat_totals"]["net"] += Decimal(record["vat_calculation"]["net_amount"])
            report["vat_totals"]["vat"] += Decimal(record["vat_calculation"]["vat_amount"])
            report["vat_totals"]["gross"] += Decimal(record["vat_calculation"]["gross_amount"])
            
            # Compliance issues
            if record["compliance_flags"]:
                report["compliance_issues"].append({
                    "transaction_id": record["transaction"]["id"],
                    "flags": record["compliance_flags"]
                })
        
        return report


# Example usage
def demonstrate_enforcement():
    """Demonstrate VAT enforcement for different scenarios"""
    
    engine = VATEnforcementEngine()
    
    # Scenario 1: Normal HOTL autonomous vehicle journey
    transaction1 = ServiceTransaction(
        transaction_id="TXN-001",
        timestamp=datetime.utcnow(),
        service_type="AUTONOMOUS_TRANSPORT",
        human_loop_type="HOTL",
        initial_stability=0.2,
        final_stability=0.3,
        peak_stability=0.8,
        service_status=ServiceStatus.AI_COMPLETED
    )
    
    treatment1, rate1, details1 = engine.determine_vat_treatment(
        transaction1, "UK", False
    )
    
    record1 = engine.generate_enforcement_record(
        transaction1, treatment1, rate1, Decimal("85.00"), details1
    )
    
    print("Scenario 1 - Normal HOTL Journey:")
    print(json.dumps(record1, indent=2, default=str))
    print("\n" + "="*80 + "\n")
    
    # Scenario 2: HONTL hotel check-in with stability breach
    transaction2 = ServiceTransaction(
        transaction_id="TXN-002",
        timestamp=datetime.utcnow(),
        service_type="AUTOMATED_CHECKIN",
        human_loop_type="HONTL",
        initial_stability=0.5,
        final_stability=1.2,
        peak_stability=4.5,  # Stability breach!
        service_status=ServiceStatus.AI_PARTIAL_HUMAN_COMPLETE,
        human_intervention_seconds=45,
        ai_percentage=60
    )
    
    treatment2, rate2, details2 = engine.determine_vat_treatment(
        transaction2, "UK", True
    )
    
    record2 = engine.generate_enforcement_record(
        transaction2, treatment2, rate2, Decimal("150.00"), details2
    )
    
    print("Scenario 2 - HONTL Check-in with Breach:")
    print(json.dumps(record2, indent=2, default=str))
    print("\n" + "="*80 + "\n")
    
    # Scenario 3: Emergency stop scenario
    transaction3 = ServiceTransaction(
        transaction_id="TXN-003",
        timestamp=datetime.utcnow(),
        service_type="AUTONOMOUS_TRANSPORT",
        human_loop_type="HOTL",
        initial_stability=0.3,
        final_stability=11.5,  # PANIC!
        peak_stability=12.0,
        service_status=ServiceStatus.EMERGENCY_STOP
    )
    
    treatment3, rate3, details3 = engine.determine_vat_treatment(
        transaction3, "UK", False
    )
    
    record3 = engine.generate_enforcement_record(
        transaction3, treatment3, rate3, Decimal("85.00"), details3
    )
    
    print("Scenario 3 - Emergency Stop:")
    print(json.dumps(record3, indent=2, default=str))
    print("\n" + "="*80 + "\n")
    
    # Generate daily report
    daily_report = engine.generate_daily_enforcement_report()
    print("Daily Enforcement Report:")
    print(json.dumps(daily_report, indent=2, default=str))


if __name__ == "__main__":
    demonstrate_enforcement()
