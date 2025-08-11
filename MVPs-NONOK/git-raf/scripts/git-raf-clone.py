#!/usr/bin/env python3
"""
Git-RAF Clone Commits Integration
OBINexus Project - Enhanced rollback and versioning system
Integrates sinphase-based tagging with commit cloning
"""

import os
import subprocess
import argparse
import shutil
import json
import hashlib
from datetime import datetime
from pathlib import Path


class GitRAFCloneCommits:
    """Enhanced clone commits with Git-RAF governance integration"""
    
    def __init__(self, repo_path, clone_base_dir):
        self.repo_path = Path(repo_path).resolve()
        self.clone_base_dir = Path(clone_base_dir).resolve()
        self.raf_config = self._load_raf_config()
        
    def _load_raf_config(self):
        """Load Git-RAF configuration from repository"""
        config_file = self.repo_path / ".git" / "raf-config"
        default_config = {
            "sinphase_threshold": 0.5,
            "tag_prefix": "diram-stable",
            "governance_level": "standard",
            "rollback_enabled": True
        }
        
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    # Parse simple key=value format
                    config = {}
                    for line in f:
                        if '=' in line and not line.startswith('#'):
                            key, value = line.strip().split('=', 1)
                            config[key.strip()] = value.strip()
                    return {**default_config, **config}
            except Exception as e:
                print(f"[WARN] Failed to load RAF config: {e}")
                
        return default_config
    
    def get_commits_with_tags(self, branch="main", include_metadata=True):
        """Get commits with RAF tagging information"""
        # Get all commits with their tags
        cmd = [
            "git", "log", branch,
            "--pretty=format:%h|%s|%ai|%d",
            "--reverse"
        ]
        
        result = subprocess.run(
            cmd, cwd=self.repo_path, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Git log failed: {result.stderr}")
            
        commits = []
        for line in result.stdout.splitlines():
            if not line:
                continue
                
            parts = line.split('|', 3)
            if len(parts) < 3:
                continue
                
            commit_hash, message, timestamp = parts[:3]
            tags = parts[3] if len(parts) > 3 else ""
            
            # Extract RAF tags
            raf_tags = []
            if tags:
                # Parse decorations for tags
                for decoration in tags.strip().split(','):
                    decoration = decoration.strip()
                    if 'tag:' in decoration and self.raf_config['tag_prefix'] in decoration:
                        tag_name = decoration.split('tag:')[1].strip().rstrip(')')
                        raf_tags.append(tag_name)
            
            commit_info = {
                "hash": commit_hash,
                "message": message,
                "timestamp": timestamp,
                "raf_tags": raf_tags
            }
            
            if include_metadata:
                # Get sinphase value if available
                commit_info["sinphase"] = self._get_commit_sinphase(commit_hash)
                commit_info["governance_status"] = self._check_governance_status(commit_hash)
                
            commits.append(commit_info)
            
        return commits
    
    def _get_commit_sinphase(self, commit_hash):
        """Get sinphase value for a specific commit"""
        try:
            # Check if commit has RAF metadata
            cmd = ["git", "show", f"{commit_hash}:.raf-metadata"]
            result = subprocess.run(
                cmd, cwd=self.repo_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            if result.returncode == 0:
                # Parse metadata JSON
                metadata = json.loads(result.stdout)
                return metadata.get("sinphase", 0.0)
        except:
            pass
            
        return 0.0
    
    def _check_governance_status(self, commit_hash):
        """Check governance validation status"""
        # Check for AuraSeal
        cmd = ["git", "notes", "show", commit_hash, "--ref=refs/notes/auraseal"]
        result = subprocess.run(
            cmd, cwd=self.repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode == 0:
            return "sealed"
        
        # Check for governance violations
        cmd = ["git", "notes", "show", commit_hash, "--ref=refs/notes/governance"]
        result = subprocess.run(
            cmd, cwd=self.repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if result.returncode == 0 and "violation" in result.stdout.lower():
            return "violation"
            
        return "unverified"
    
    def clone_commits_with_governance(self, branch="main", commit_range=None, 
                                     filter_stable=False):
        """Clone commits with RAF governance awareness"""
        commits = self.get_commits_with_tags(branch, include_metadata=True)
        
        # Apply commit range filter if specified
        if commit_range:
            start, end = commit_range.split(":")
            hash_list = [c["hash"] for c in commits]
            try:
                start_idx = hash_list.index(start)
                end_idx = hash_list.index(end) + 1
                commits = commits[start_idx:end_idx]
            except ValueError:
                raise ValueError(f"Invalid commit range: {commit_range}")
        
        # Filter for stable commits if requested
        if filter_stable:
            stable_commits = []
            for commit in commits:
                sinphase = commit.get("sinphase", 0.0)
                if sinphase >= float(self.raf_config["sinphase_threshold"]):
                    stable_commits.append(commit)
            commits = stable_commits
        
        # Create base directory
        self.clone_base_dir.mkdir(parents=True, exist_ok=True)
        
        # Clone each commit
        cloned = []
        for i, commit in enumerate(commits):
            commit_dir = self._create_commit_directory(commit, i)
            
            print(f"[{i+1}/{len(commits)}] Cloning {commit['hash']}: {commit['message']}")
            
            # Create temporary working directory
            temp_dir = self.clone_base_dir / f"temp_{commit['hash']}"
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                
            # Clone at specific commit
            cmd = [
                "git", "clone", 
                "--no-checkout", 
                str(self.repo_path), 
                str(temp_dir)
            ]
            subprocess.run(cmd, check=True)
            
            # Checkout specific commit
            cmd = ["git", "checkout", commit['hash']]
            subprocess.run(cmd, cwd=temp_dir, check=True)
            
            # Copy to final location
            if commit_dir.exists():
                shutil.rmtree(commit_dir)
            shutil.copytree(temp_dir, commit_dir)
            
            # Clean up temp directory
            shutil.rmtree(temp_dir)
            
            # Add RAF metadata to cloned directory
            self._add_raf_metadata(commit_dir, commit)
            
            cloned.append({
                "commit": commit,
                "directory": str(commit_dir)
            })
            
        # Generate rollback manifest
        self._generate_rollback_manifest(cloned)
        
        return cloned
    
    def _create_commit_directory(self, commit, index):
        """Create directory name for commit clone"""
        # Sanitize message for filesystem
        safe_message = "".join(
            c if c.isalnum() or c in "-_" else "_" 
            for c in commit["message"][:50]
        )
        
        # Include RAF tag if available
        tag_suffix = ""
        if commit["raf_tags"]:
            tag_suffix = f"-{commit['raf_tags'][0]}"
        
        # Include governance status
        gov_status = commit.get("governance_status", "unverified")
        
        dir_name = f"{index:03d}-{commit['hash']}-{safe_message}{tag_suffix}-{gov_status}"
        return self.clone_base_dir / dir_name
    
    def _add_raf_metadata(self, commit_dir, commit_info):
        """Add RAF metadata to cloned commit directory"""
        metadata = {
            "commit_hash": commit_info["hash"],
            "commit_message": commit_info["message"],
            "timestamp": commit_info["timestamp"],
            "sinphase": commit_info.get("sinphase", 0.0),
            "governance_status": commit_info.get("governance_status", "unverified"),
            "raf_tags": commit_info.get("raf_tags", []),
            "clone_timestamp": datetime.utcnow().isoformat(),
            "raf_config": self.raf_config
        }
        
        metadata_file = commit_dir / ".raf-clone-metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _generate_rollback_manifest(self, cloned_commits):
        """Generate manifest for rollback operations"""
        manifest = {
            "created": datetime.utcnow().isoformat(),
            "repository": str(self.repo_path),
            "total_commits": len(cloned_commits),
            "stable_commits": sum(
                1 for c in cloned_commits 
                if c["commit"].get("sinphase", 0) >= float(self.raf_config["sinphase_threshold"])
            ),
            "commits": []
        }
        
        for item in cloned_commits:
            commit = item["commit"]
            manifest["commits"].append({
                "hash": commit["hash"],
                "message": commit["message"],
                "directory": item["directory"],
                "sinphase": commit.get("sinphase", 0.0),
                "governance_status": commit.get("governance_status", "unverified"),
                "raf_tags": commit.get("raf_tags", []),
                "rollback_safe": commit.get("sinphase", 0) >= float(self.raf_config["sinphase_threshold"])
            })
        
        manifest_file = self.clone_base_dir / "raf-rollback-manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
            
        print(f"\n[SUCCESS] Rollback manifest created: {manifest_file}")
        print(f"[INFO] Total commits: {manifest['total_commits']}")
        print(f"[INFO] Stable commits: {manifest['stable_commits']}")
    
    def perform_rollback(self, target_commit=None, force=False):
        """Perform RAF-aware rollback to specific commit"""
        manifest_file = self.clone_base_dir / "raf-rollback-manifest.json"
        
        if not manifest_file.exists():
            raise RuntimeError("No rollback manifest found. Run clone_commits first.")
            
        with open(manifest_file, 'r') as f:
            manifest = json.load(f)
        
        if not target_commit:
            # Find latest stable commit
            stable_commits = [
                c for c in manifest["commits"] 
                if c["rollback_safe"]
            ]
            
            if not stable_commits:
                if not force:
                    raise RuntimeError("No stable commits found for rollback. Use --force to override.")
                print("[WARN] No stable commits found, using latest commit")
                target = manifest["commits"][-1]
            else:
                target = stable_commits[-1]
                
        else:
            # Find specific commit
            target = None
            for commit in manifest["commits"]:
                if commit["hash"].startswith(target_commit):
                    target = commit
                    break
                    
            if not target:
                raise ValueError(f"Commit {target_commit} not found in manifest")
        
        # Verify governance status
        if target["governance_status"] == "violation" and not force:
            raise RuntimeError(
                f"Cannot rollback to commit with governance violation: {target['hash']}\n"
                f"Use --force to override (not recommended)"
            )
        
        print(f"\n[ROLLBACK] Target commit: {target['hash']}")
        print(f"[ROLLBACK] Message: {target['message']}")
        print(f"[ROLLBACK] Sinphase: {target['sinphase']}")
        print(f"[ROLLBACK] Governance: {target['governance_status']}")
        
        if not force:
            response = input("\nProceed with rollback? [y/N]: ")
            if response.lower() != 'y':
                print("[ABORT] Rollback cancelled")
                return
        
        # Perform the rollback
        print(f"\n[ROLLBACK] Executing rollback to {target['hash']}...")
        
        # Create backup branch
        backup_branch = f"backup-before-rollback-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        cmd = ["git", "checkout", "-b", backup_branch]
        subprocess.run(cmd, cwd=self.repo_path, check=True)
        print(f"[BACKUP] Created backup branch: {backup_branch}")
        
        # Reset to target commit
        cmd = ["git", "reset", "--hard", target['hash']]
        subprocess.run(cmd, cwd=self.repo_path, check=True)
        
        print(f"[SUCCESS] Rolled back to commit {target['hash']}")
        print(f"[INFO] Previous state backed up to branch: {backup_branch}")


def main():
    parser = argparse.ArgumentParser(
        description="Git-RAF Enhanced Clone Commits - Governance-aware rollback system"
    )
    
    parser.add_argument(
        "action",
        choices=["clone", "rollback", "list"],
        help="Action to perform"
    )
    
    parser.add_argument(
        "repo_path",
        nargs="?",
        default=".",
        help="Path to Git repository (default: current directory)"
    )
    
    parser.add_argument(
        "--branch",
        default="main",
        help="Branch to work with (default: main)"
    )
    
    parser.add_argument(
        "--clone-dir",
        default="./raf-clones",
        help="Base directory for cloned commits"
    )
    
    parser.add_argument(
        "--range",
        help="Commit range as start_hash:end_hash"
    )
    
    parser.add_argument(
        "--stable-only",
        action="store_true",
        help="Only clone commits that meet sinphase threshold"
    )
    
    parser.add_argument(
        "--target",
        help="Target commit for rollback"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rollback even with governance violations"
    )
    
    args = parser.parse_args()
    
    # Initialize RAF clone system
    raf_clone = GitRAFCloneCommits(args.repo_path, args.clone_dir)
    
    if args.action == "clone":
        cloned = raf_clone.clone_commits_with_governance(
            branch=args.branch,
            commit_range=args.range,
            filter_stable=args.stable_only
        )
        
        print(f"\n[COMPLETE] Cloned {len(cloned)} commits")
        
    elif args.action == "rollback":
        raf_clone.perform_rollback(
            target_commit=args.target,
            force=args.force
        )
        
    elif args.action == "list":
        commits = raf_clone.get_commits_with_tags(args.branch)
        
        print(f"\n[COMMITS] Branch: {args.branch}")
        print("-" * 80)
        
        for commit in commits:
            tags = ", ".join(commit["raf_tags"]) if commit["raf_tags"] else "none"
            sinphase = commit.get("sinphase", 0.0)
            governance = commit.get("governance_status", "unverified")
            
            print(f"{commit['hash']} | {commit['message'][:50]:50} | "
                  f"S:{sinphase:.2f} | G:{governance:10} | Tags: {tags}")


if __name__ == "__main__":
    main()
