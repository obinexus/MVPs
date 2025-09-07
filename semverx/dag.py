import heapq
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class SemVerXNode:
    name: str
    version: str
    state_vector: Tuple[str, str, str]  # (major_state, minor_state, patch_state)
    nlm_coord: Tuple[float, float, float]
    abi_hash: str

class SemVerXResolver:
    def __init__(self, alpha=1.0, beta=2.0, gamma=0.5):
        self.alpha = alpha  # NLM distance weight
        self.beta = beta    # Compatibility penalty weight
        self.gamma = gamma  # Runtime cost weight
        
    def compute_nlm_coordinates(self, state_vector: Tuple[str, str, str], 
                               version_nums: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Compute NLM coordinates from SemVerX state vector"""
        state_map = {
            'legacy': (0.6, 0.7, -0.5),
            'lts': (0.9, 0.9, 0.0),
            'experimental': (-0.6, -0.7, 0.8)
        }
        
        # Weight contributions: major=0.6, minor=0.3, patch=0.1
        weights = [0.6, 0.3, 0.1]
        x, y, z = 0.0, 0.0, 0.0
        
        for i, (state, weight) in enumerate(zip(state_vector, weights)):
            coords = state_map.get(state, (0.0, 0.0, 0.0))
            version_factor = min(version_nums[i] / 100.0, 1.0)
            x += coords[0] * weight * version_factor
            y += coords[1] * weight * version_factor
            z += coords[2] * weight * version_factor
            
        return (max(-1, min(1, x)), max(-1, min(1, y)), max(-1, min(1, z)))
    
    def nlm_distance(self, a: Tuple[float, float, float], 
                    b: Tuple[float, float, float]) -> float:
        """Weighted Euclidean distance in NLM space"""
        weights = (1.5, 1.0, 2.0)  # Z-axis weighted higher for evolution safety
        return math.sqrt(sum(weights[i] * (a[i] - b[i])**2 for i in range(3)))
    
    def compatibility_penalty(self, current: SemVerXNode, candidate: SemVerXNode) -> float:
        """Estimate compatibility penalty based on state transitions"""
        # Same major version transitions
        if current.version.split('.')[0] == candidate.version.split('.')[0]:
            if 'experimental' in candidate.state_vector and 'lts' in current.state_vector:
                return 0.5  # High risk
            elif candidate.state_vector == current.state_vector:
                return 0.0  # No risk
            else:
                return 0.2  # Medium risk
        else:
            # Major version change
            return 0.9
    
    def resolve_dag_update(self, current_node: SemVerXNode, 
                          candidates: List[SemVerXNode], 
                          constraints: Dict) -> Dict:
        """Find optimal update path using A* with NLM heuristic"""
        pq = [(0.0, 0, current_node, [])]  # (f_score, g_score, node, path)
        visited = set()
        
        while pq:
            f_score, g_score, node, path = heapq.heappop(pq)
            
            if node.name in visited:
                continue
            visited.add(node.name)
            
            new_path = path + [node]
            
            # Check if we've reached a satisfactory candidate
            if self._satisfies_constraints(node, constraints) and node != current_node:
                return {
                    'path': new_path,
                    'cost': g_score,
                    'nlm_distance': self.nlm_distance(current_node.nlm_coord, node.nlm_coord),
                    'selected': node
                }
            
            # Explore candidates
            for candidate in candidates:
                if candidate.name in visited:
                    continue
                    
                # Compute costs
                nlm_dist = self.nlm_distance(node.nlm_coord, candidate.nlm_coord)
                compat_penalty = self.compatibility_penalty(node, candidate)
                runtime_cost = 0.1  # Could be from historical metrics
                
                g_new = g_score + (self.alpha * nlm_dist + 
                                  self.beta * compat_penalty + 
                                  self.gamma * runtime_cost)
                
                # A* heuristic: estimated cost to goal
                h_score = self.nlm_distance(candidate.nlm_coord, (0.9, 0.9, 0.0))  # LTS ideal
                f_new = g_new + h_score
                
                heapq.heappush(pq, (f_new, g_new, candidate, new_path))
        
        raise Exception("No valid update path found")
    
    def _satisfies_constraints(self, node: SemVerXNode, constraints: Dict) -> bool:
        """Check if node satisfies update constraints"""
        # No experimental in production
        if constraints.get('production') and 'experimental' in node.state_vector:
            return False
        # Respect NLM distance threshold
        max_dist = constraints.get('max_nlm_distance', 1.0)
        if hasattr(self, '_current_nlm'):
            if self.nlm_distance(self._current_nlm, node.nlm_coord) > max_dist:
                return False
        return True
