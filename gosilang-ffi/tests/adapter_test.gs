// tests/adapter_test.gosi
import disk
from disk:ffi import SemVerXAdapter

func test_round_trip() {
    let adapter = SemVerXAdapter.new()
    let original = SemVerX(2, 1, 3, "beta.1")
    
    // Forward and reverse
    let poly = adapter.forward(original)
    let restored = adapter.reverse(poly)
    
    // Validate integrity
    assert(original.equals(restored))
    assert(adapter.validateRoundTrip(original))
}

func test_thread_safety() {
    let adapter = SemVerXAdapter.new()
    adapter.pinToThread(currentThread())
    
    // Concurrent operations should be safe
    parallel_for(0..100) { i ->
        let v = SemVerX(1, 0, i)
        assert(adapter.validateRoundTrip(v))
    }
}
