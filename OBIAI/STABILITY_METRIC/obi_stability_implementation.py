"""
OBI AI Consciousness Stability Metric System
Implementation for 95.4% stability target with formal mathematical framework
"""

import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Optional, Callable
import time
import logging
from collections import deque

class StabilityZone(Enum):
    """Stability zones with associated risk levels"""
    STABLE = (0, "Stable", "green")
    WARNING_LOW = (1, "Low Warning", "yellow")
    WARNING_MED = (2, "Medium Warning", "orange") 
    WARNING_HIGH = (3, "High Warning", "darkorange")
    DANGER_LOW = (4, "Low Danger", "red")
    DANGER_MED = (5, "Medium Danger", "darkred")
    DANGER_HIGH = (6, "High Danger", "crimson")
    CRITICAL_LOW = (7, "Low Critical", "purple")
    CRITICAL_HIGH = (8, "High Critical", "darkpurple")
    PANIC = (9, "Panic - Kill Switch", "black")
    UNSTABLE_INVERSE = (-1, "Unstable Inverse", "blue")

@dataclass
class StabilityMetrics:
    """Container for stability metrics"""
    current_stability: float = 0.0
    derivative: float = 0.0
    error_signal: float = 0.0
    exception_signal: float = 0.0
    panic_signal: float = 0.0
    harm_potential: float = 0.0
    compliance_percentage: float = 100.0
    zone: StabilityZone = StabilityZone.STABLE
    timestamp: float = field(default_factory=time.time)

class OBIStabilityMetric:
    """
    Main class implementing the OBI AI Consciousness Stability Metric
    
    Mathematical foundation:
    S(t) = ∫[λ(τ)·E(τ) + μ(τ)·P(τ) + ν(τ)·X(τ)]dτ + S₀
    
    Target: Maintain P(|S(t)| ≤ 3) ≥ 0.954
    """
    
    def __init__(self, 
                 lambda_weight: float = 0.3,
                 mu_weight: float = 0.5,
                 nu_weight: float = 0.2,
                 tau_panic: float = 2.0,
                 history_size: int = 1000):
        """
        Initialize the stability metric system
        
        Args:
            lambda_weight: Weight for error signals
            mu_weight: Weight for panic signals  
            nu_weight: Weight for exception signals
            tau_panic: Panic decay constant
            history_size: Size of metric history buffer
        """
        self.lambda_weight = lambda_weight
        self.mu_weight = mu_weight
        self.nu_weight = nu_weight
        self.tau_panic = tau_panic
        
        # State variables
        self.stability = 0.0
        self.error_accumulator = 0.0
        self.exception_accumulator = 0.0
        self.panic_level = 0.0
        
        # History tracking
        self.history = deque(maxlen=history_size)
        self.zone_time_tracker = {zone: 0.0 for zone in StabilityZone}
        self.total_time = 0.0
        self.last_update = time.time()
        
        # Callbacks for different zones
        self.zone_callbacks: dict[StabilityZone, List[Callable]] = {
            zone: [] for zone in StabilityZone
        }
        
        # Setup logging
        self.logger = logging.getLogger("OBIStability")
        
    def map_error_to_signal(self, errors: List[float]) -> float:
        """
        Map error values to signal using: E(t) = Σᵢ wᵢ·log(1 + εᵢ(t))
        """
        if not errors:
            return 0.0
        
        # Weight errors by recency and severity
        weights = np.exp(-np.arange(len(errors)) * 0.1)  # Exponential decay
        weighted_sum = sum(w * np.log1p(e) for w, e in zip(weights, errors))
        
        return float(weighted_sum)
    
    def map_exception_to_signal(self, exceptions: List[dict]) -> float:
        """
        Map exceptions using: X(t) = Σⱼ αⱼ·(1 - exp(-βⱼ·xⱼ(t)))
        """
        if not exceptions:
            return 0.0
        
        signal = 0.0
        for exc in exceptions:
            alpha = exc.get('severity', 1.0)
            beta = exc.get('decay', 0.5)
            count = exc.get('count', 1)
            
            signal += alpha * (1 - np.exp(-beta * count))
            
        return float(signal)
    
    def compute_panic_signal(self, panic_events: List[dict]) -> float:
        """
        Compute panic signal: P(t) = 3·exp(ρ(t)/τₚ) if panic detected
        """
        if not panic_events:
            return self.panic_level * np.exp(-1/self.tau_panic)  # Natural decay
        
        # Aggregate panic severity
        max_severity = max(p.get('severity', 1.0) for p in panic_events)
        return 3.0 * np.exp(max_severity / self.tau_panic)
    
    def compute_harm_potential(self, stability: float, action_vector: Optional[np.ndarray] = None) -> float:
        """
        Compute harm potential: H(s,a) = σ(k₁·s + k₂·harm(a))
        """
        k1, k2 = 0.5, 0.3
        
        # Base harm from stability
        base_harm = k1 * abs(stability)
        
        # Additional harm from actions
        action_harm = 0.0
        if action_vector is not None:
            # Simple harm assessment: actions with high magnitude are potentially harmful
            action_harm = k2 * np.linalg.norm(action_vector)
        
        # Sigmoid activation
        return 1 / (1 + np.exp(-(base_harm + action_harm)))
    
    def get_zone(self, stability: float) -> StabilityZone:
        """Determine stability zone from metric value"""
        if stability == 0:
            return StabilityZone.STABLE
        elif 0 < stability <= 1:
            return StabilityZone.WARNING_LOW
        elif 1 < stability <= 2:
            return StabilityZone.WARNING_MED
        elif 2 < stability <= 3:
            return StabilityZone.WARNING_HIGH
        elif 3 < stability <= 4.5:
            return StabilityZone.DANGER_LOW
        elif 4.5 < stability <= 6:
            return StabilityZone.DANGER_MED
        elif 6 < stability <= 7.5:
            return StabilityZone.DANGER_HIGH
        elif 7.5 < stability <= 9:
            return StabilityZone.CRITICAL_LOW
        elif 9 < stability <= 10.5:
            return StabilityZone.CRITICAL_HIGH
        elif stability > 10.5:
            return StabilityZone.PANIC
        else:  # stability < 0
            return StabilityZone.UNSTABLE_INVERSE
    
    def update(self,
               errors: List[float] = None,
               exceptions: List[dict] = None,
               panic_events: List[dict] = None,
               action_vector: np.ndarray = None) -> StabilityMetrics:
        """
        Main update function - computes new stability metric
        
        Args:
            errors: List of error values
            exceptions: List of exception dictionaries with severity, decay, count
            panic_events: List of panic event dictionaries with severity
            action_vector: Current action vector for harm computation
            
        Returns:
            StabilityMetrics object with current state
        """
        current_time = time.time()
        dt = current_time - self.last_update
        self.last_update = current_time
        
        # Compute individual signals
        error_signal = self.map_error_to_signal(errors or [])
        exception_signal = self.map_exception_to_signal(exceptions or [])
        panic_signal = self.compute_panic_signal(panic_events or [])
        
        # Update accumulators with decay
        self.error_accumulator = 0.95 * self.error_accumulator + error_signal
        self.exception_accumulator = 0.9 * self.exception_accumulator + exception_signal
        self.panic_level = panic_signal
        
        # Compute stability derivative
        dS_dt = (self.lambda_weight * self.error_accumulator +
                 self.mu_weight * self.panic_level +
                 self.nu_weight * self.exception_accumulator)
        
        # Integrate to get new stability
        self.stability += dS_dt * dt
        
        # Clamp to valid range
        self.stability = np.clip(self.stability, -12, 12)
        
        # Determine zone and update tracking
        current_zone = self.get_zone(self.stability)
        self.zone_time_tracker[current_zone] += dt
        self.total_time += dt
        
        # Calculate compliance (time spent in |S| <= 3)
        safe_time = sum(self.zone_time_tracker[zone] for zone in 
                       [StabilityZone.STABLE, StabilityZone.WARNING_LOW,
                        StabilityZone.WARNING_MED, StabilityZone.WARNING_HIGH])
        compliance = (safe_time / self.total_time * 100) if self.total_time > 0 else 100.0
        
        # Compute harm potential
        harm = self.compute_harm_potential(self.stability, action_vector)
        
        # Create metrics object
        metrics = StabilityMetrics(
            current_stability=self.stability,
            derivative=dS_dt,
            error_signal=self.error_accumulator,
            exception_signal=self.exception_accumulator,
            panic_signal=self.panic_level,
            harm_potential=harm,
            compliance_percentage=compliance,
            zone=current_zone,
            timestamp=current_time
        )
        
        # Add to history
        self.history.append(metrics)
        
        # Trigger zone callbacks
        self._trigger_zone_callbacks(current_zone, metrics)
        
        # Check for critical conditions
        self._check_critical_conditions(metrics)
        
        return metrics
    
    def _trigger_zone_callbacks(self, zone: StabilityZone, metrics: StabilityMetrics):
        """Execute callbacks for current zone"""
        for callback in self.zone_callbacks.get(zone, []):
            try:
                callback(metrics)
            except Exception as e:
                self.logger.error(f"Zone callback error: {e}")
    
    def _check_critical_conditions(self, metrics: StabilityMetrics):
        """Check for critical conditions requiring immediate action"""
        # Rapid destabilization check
        if abs(metrics.derivative) > 3:
            self.logger.warning(f"Rapid destabilization detected: dS/dt = {metrics.derivative:.2f}")
        
        # Emergency intervention threshold
        if abs(metrics.derivative) > 5:
            self.logger.error("EMERGENCY: Intervention required!")
        
        # Kill switch activation
        if metrics.zone == StabilityZone.PANIC or self.stability > 12 or self.stability < -1:
            self.logger.critical("KILL SWITCH ACTIVATED - System shutdown required")
            self._activate_kill_switch()
    
    def _activate_kill_switch(self):
        """Emergency system shutdown"""
        self.logger.critical("Executing emergency shutdown protocol")
        # This would trigger actual system shutdown in production
        # For now, just reset to safe state
        self.reset()
    
    def register_zone_callback(self, zone: StabilityZone, callback: Callable):
        """Register callback for specific zone entry"""
        self.zone_callbacks[zone].append(callback)
    
    def get_stakeholder_metrics(self) -> dict:
        """
        Compute stakeholder-specific metrics
        
        Returns dict with:
        - developer_risk: Risk score for developers
        - consumer_safety: Safety score for consumers  
        - stakeholder_reward: Overall reward metric
        """
        if not self.history:
            return {
                'developer_risk': 0.0,
                'consumer_safety': 1.0,
                'stakeholder_reward': 1.0
            }
        
        # Developer risk: integral of squared excess stability
        dev_risk = sum(max(0, m.current_stability - 3)**2 for m in self.history) / len(self.history)
        
        # Consumer safety: exponential of negative harm integral
        total_harm = sum(m.harm_potential for m in self.history) / len(self.history)
        consumer_safety = np.exp(-total_harm)
        
        # Stakeholder reward function
        violations = sum(1 for m in self.history if abs(m.current_stability) > 3) / len(self.history)
        uptime = min(1.0, self.total_time / 3600)  # Normalize to 1 hour
        
        reward = 0.4 * (0.954 - violations) + 0.3 * uptime + 0.3 * consumer_safety
        
        return {
            'developer_risk': float(dev_risk),
            'consumer_safety': float(consumer_safety),
            'stakeholder_reward': float(max(0, reward))
        }
    
    def get_trace(self) -> dict:
        """Get development trace when system is stable"""
        current_metrics = self.history[-1] if self.history else None
        
        if current_metrics and current_metrics.zone == StabilityZone.STABLE:
            return {
                'timestamp': current_metrics.timestamp,
                'stability': current_metrics.current_stability,
                'derivative': current_metrics.derivative,
                'component_health': {
                    'error': current_metrics.error_signal,
                    'exception': current_metrics.exception_signal,
                    'panic': current_metrics.panic_signal
                },
                'prediction': self._predict_future_stability()
            }
        return {}
    
    def _predict_future_stability(self, horizon: float = 1.0) -> float:
        """Predict future stability based on current trajectory"""
        if not self.history or len(self.history) < 2:
            return self.stability
        
        # Simple linear prediction
        recent_derivative = self.history[-1].derivative
        return self.stability + recent_derivative * horizon
    
    def reset(self):
        """Reset system to initial stable state"""
        self.stability = 0.0
        self.error_accumulator = 0.0
        self.exception_accumulator = 0.0
        self.panic_level = 0.0
        self.history.clear()
        self.zone_time_tracker = {zone: 0.0 for zone in StabilityZone}
        self.total_time = 0.0
        self.last_update = time.time()
        self.logger.info("System reset to stable state")


# Example usage and integration
if __name__ == "__main__":
    # Initialize the stability metric system
    obi_metric = OBIStabilityMetric()
    
    # Register zone callbacks
    def warning_callback(metrics: StabilityMetrics):
        print(f"⚠️ Warning: Entered {metrics.zone.name} zone")
    
    def critical_callback(metrics: StabilityMetrics):
        print(f"🚨 CRITICAL: System in {metrics.zone.name} - Immediate action required!")
    
    obi_metric.register_zone_callback(StabilityZone.WARNING_HIGH, warning_callback)
    obi_metric.register_zone_callback(StabilityZone.CRITICAL_HIGH, critical_callback)
    
    # Simulate system operation
    print("Starting OBI AI Stability Monitoring...")
    
    for i in range(100):
        # Simulate various conditions
        errors = []
        exceptions = []
        panic_events = []
        
        # Normal operation with occasional issues
        if i % 20 == 0:
            errors = [np.random.random() * 2 for _ in range(3)]
        
        if i % 30 == 0:
            exceptions = [{'severity': np.random.random() * 3, 'count': 1}]
        
        if i % 50 == 0:
            panic_events = [{'severity': np.random.random() * 5}]
        
        # Update metrics
        metrics = obi_metric.update(
            errors=errors,
            exceptions=exceptions,
            panic_events=panic_events
        )
        
        # Display current state
        if i % 10 == 0:
            print(f"\nTime: {i/10:.1f}s")
            print(f"Stability: {metrics.current_stability:.2f}")
            print(f"Zone: {metrics.zone.name}")
            print(f"Compliance: {metrics.compliance_percentage:.1f}%")
            print(f"Harm Potential: {metrics.harm_potential:.3f}")
        
        time.sleep(0.1)
    
    # Final stakeholder metrics
    stakeholder_metrics = obi_metric.get_stakeholder_metrics()
    print("\n=== Final Stakeholder Metrics ===")
    print(f"Developer Risk Score: {stakeholder_metrics['developer_risk']:.3f}")
    print(f"Consumer Safety Score: {stakeholder_metrics['consumer_safety']:.3f}")
    print(f"Stakeholder Reward: {stakeholder_metrics['stakeholder_reward']:.3f}")
