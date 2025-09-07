# In tests/test_dag.py, add at the top:
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dag import SemVerXResolver, SemVerXNode
def test_nlm_computation():
    resolver = SemVerXResolver()
    coords = resolver.compute_nlm_coordinates(
        ('lts', 'experimental', 'legacy'),
        (1, 3, 7)
    )
    assert -1 <= coords[0] <= 1
    assert -1 <= coords[1] <= 1
    assert -1 <= coords[2] <= 1
    print(f"✓ NLM computation test passed: {coords}")

if __name__ == "__main__":
    test_nlm_computation()
