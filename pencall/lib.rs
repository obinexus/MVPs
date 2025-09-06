// Cargo.toml (relevant deps)
// [package]
// name = "pencall"
// version = "0.1.0"
// edition = "2021"
//
// [dependencies]
// tokio = { version = "1", features = ["full"] }
// serde = { version = "1.0", features = ["derive"] }
// serde_json = "1.0"
// thiserror = "1.0"
// chrono = { version = "0.4", features = ["serde"] }
// tracing = "0.1"
// async-trait = "0.1"

use async_trait::async_trait;
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{info, warn};

/// Public types and errors
#[derive(Debug, Error)]
pub enum PencallError {
    #[error("authorization failed")]
    Unauthorized,
    #[error("invalid arguments: {0}")]
    InvalidArgs(String),
    #[error("delivery error: {0}")]
    DeliveryError(String),
    #[error("internal error: {0}")]
    Internal(String),
}

/// An allocation request describes a goal to allocate `units` resources (houses, vouchers, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocationRequest {
    pub id: String,
    pub requested_units: u64,
    pub start_time: DateTime<Utc>,
    /// initial units to release immediately (optional)
    pub initial_release: Option<u64>,
    /// doubling interval in seconds (e.g., 2 hours = 7200)
    pub doubling_interval_seconds: u64,
    /// maximum cap of units (safety)
    pub cap_units: Option<u64>,
}

/// Status of an allocation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AllocationStatus {
    Pending,
    Active { released: u64, last_release_at: DateTime<Utc> },
    Completed,
    Cancelled,
}

/// Represents an actionable release event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseEvent {
    pub allocation_id: String,
    pub release_time: DateTime<Utc>,
    pub units: u64,
}

/// Delivery provider trait — implementors MUST be legitimate, lawful providers.
/// This trait intentionally does not expose low-level raw network actions.
#[async_trait]
pub trait DeliveryProvider: Send + Sync {
    /// Deliver a release event to an authorized endpoint (e.g., partner API).
    /// Implementations must enforce their own security, retries, and rate limits.
    async fn deliver(&self, event: &ReleaseEvent) -> Result<(), PencallError>;
}

/// In-memory store for allocations (simple example; replace with persistence)
#[derive(Default)]
pub struct Store {
    pub allocations: RwLock<std::collections::HashMap<String, (AllocationRequest, AllocationStatus)>>,
}

impl Store {
    pub fn new() -> Self {
        Self { allocations: RwLock::new(std::collections::HashMap::new()) }
    }
}

/// The main orchestrator / API entrypoint
pub struct Pencall {
    store: Arc<Store>,
    provider: Arc<dyn DeliveryProvider>,
    /// policy_check hook: implementers can provide custom policy/auth checks
    policy_check: Arc<dyn Fn(&AllocationRequest) -> Result<(), PencallError> + Send + Sync>,
}

impl Pencall {
    /// Create a new Pencall orchestrator
    pub fn new(
        store: Arc<Store>,
        provider: Arc<dyn DeliveryProvider>,
        policy_check: Arc<dyn Fn(&AllocationRequest) -> Result<(), PencallError> + Send + Sync>,
    ) -> Self {
        Self { store, provider, policy_check }
    }

    /// Register an allocation (runs policy check)
    pub async fn register_allocation(&self, req: AllocationRequest) -> Result<(), PencallError> {
        // Policy & authorization
        (self.policy_check)(&req).map_err(|e| e)?;

        // Basic validation
        if req.requested_units == 0 {
            return Err(PencallError::InvalidArgs("requested_units must be > 0".into()));
        }
        if req.doubling_interval_seconds == 0 {
            return Err(PencallError::InvalidArgs("doubling_interval_seconds must be > 0".into()));
        }

        let mut map = self.store.allocations.write().await;
        if map.contains_key(&req.id) {
            return Err(PencallError::InvalidArgs("id already exists".into()));
        }
        map.insert(req.id.clone(), (req, AllocationStatus::Pending));
        info!(allocation_id=%req.id, "registered allocation");
        Ok(())
    }

    /// Activate an allocation and schedule simulated releases.
    /// Note: This runner simulates releases in-process. Production should use external schedulers and durable jobs.
    pub async fn activate(&self, allocation_id: &str) -> Result<(), PencallError> {
        let mut map = self.store.allocations.write().await;
        let (req, status) = map.get_mut(allocation_id)
            .ok_or_else(|| PencallError::InvalidArgs("allocation not found".into()))?
            .clone();

        // Only allow if status is Pending
        match status {
            AllocationStatus::Pending => (),
            _ => return Err(PencallError::InvalidArgs("allocation not in pending state".into())),
        }

        // Move to active
        let now = Utc::now();
        let initial = req.initial_release.unwrap_or(0);
        let initial_status = AllocationStatus::Active { released: initial, last_release_at: now };
        map.insert(req.id.clone(), (req.clone(), initial_status));
        drop(map);

        // Spawn background task to perform scheduled releases (simulated)
        let store = self.store.clone();
        let provider = self.provider.clone();
        let alloc = req.clone();
        tokio::spawn(async move {
            if let Err(e) = run_allocation_simulation(store, provider, alloc).await {
                warn!(error=%format!("{:?}", e), "allocation simulation failed");
            }
        });

        Ok(())
    }
}

/// Simulation logic for releases: doubling pattern with safety caps.
/// This function is intentionally written as a simulation (no dangerous effects).
async fn run_allocation_simulation(
    store: Arc<Store>,
    provider: Arc<dyn DeliveryProvider>,
    req: AllocationRequest,
) -> Result<(), PencallError> {
    let mut released_total: u64 = req.initial_release.unwrap_or(0);
    let mut next_release = req.start_time;
    let mut current_chunk: u64 = std::cmp::max(1, req.initial_release.unwrap_or(1));

    // ensure we don't exceed cap
    let cap = req.cap_units.unwrap_or(u64::MAX);

    // loop until requested_units fulfilled or cap or cancelled
    loop {
        // Sleep until next_release (for demo we can shorten times; production would use real intervals)
        let now = Utc::now();
        if next_release > now {
            let dur = next_release - now;
            // We'll convert to std::time for tokio::time::sleep
            let std_dur = std::time::Duration::from_secs(dur.num_seconds() as u64);
            tokio::time::sleep(std_dur).await;
        }

        // Load status, check cancellation
        {
            let map = store.allocations.read().await;
            if let Some((_, status)) = map.get(&req.id) {
                if let AllocationStatus::Cancelled = status {
                    info!(allocation_id=%req.id, "allocation cancelled, stopping simulation");
                    return Ok(());
                }
            } else {
                return Err(PencallError::Internal("allocation disappeared".into()));
            }
        }

        // Calculate allowable release this tick
        let possible_release = std::cmp::min(current_chunk, req.requested_units.saturating_sub(released_total));
        let allowable_release = std::cmp::min(possible_release, cap.saturating_sub(released_total));
        if allowable_release == 0 {
            // done
            // mark Completed
            let mut map = store.allocations.write().await;
            map.insert(req.id.clone(), (req.clone(), AllocationStatus::Completed));
            info!(allocation_id=%req.id, released=%released_total, "allocation completed");
            return Ok(());
        }

        // Build event
        let event = ReleaseEvent {
            allocation_id: req.id.clone(),
            release_time: Utc::now(),
            units: allowable_release,
        };

        // Deliver via provider (legit provider must ensure legal constraints)
        match provider.deliver(&event).await {
            Ok(_) => {
                // Update store status
                released_total = released_total.saturating_add(allowable_release);
                let mut map = store.allocations.write().await;
                map.insert(req.id.clone(), (req.clone(), AllocationStatus::Active {
                    released: released_total,
                    last_release_at: Utc::now(),
                }));
                info!(allocation_id=%req.id, released=%released_total, "release delivered");
            }
            Err(e) => {
                warn!(allocation_id=%req.id, error=%format!("{:?}", e), "delivery failed, will retry later");
                // For safety, we backoff — simple sleep before retrying (production: exponential backoff + DLQ)
                tokio::time::sleep(std::time::Duration::from_secs(60)).await;
            }
        }

        // Prepare next tick: double chunk
        let doubling = req.doubling_interval_seconds;
        current_chunk = current_chunk.saturating_mul(2);
        next_release = Utc::now() + Duration::seconds(doubling as i64);

        // Safety: if released_total >= requested_units or cap, loop will exit next iteration
    }
}
