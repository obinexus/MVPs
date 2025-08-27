"""
OBINexus Network Protocol Implementation — Fixed
- Consistent naming (OBIPickle everywhere)
- One canonical serialize()/deserialize() pair
- Real memoization with reference resolution
- Priority queue semantics fixed (higher priority pops first)
- Consciousness threshold enforcement for consciousness_stream
- Channel registry includes consciousness_stream
- Marshall/Transmit contract aligned with OBIPickle.serialize() output
- Demo runs end‑to‑end
"""

from __future__ import annotations
import heapq
import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Tuple, Callable


# =====================
# OBIPickle Core
# =====================

class OBIPickle:
    """
    Ontological Bayesian Infrastructure Pickle for OBIAI consciousness transmission.

    Implements Three Axioms:
      I. Polyglot Logarithmic Protocol (priority queue + hash index)
     II. Streaming Pickle Format with Bidirectional Transmission
    III. Unified Configuration Schema with DOP Adapter
    """

    def __init__(self, data: Any, metadata: Dict[str, Any] | None = None, consciousness_level: float = 0.0):
        self.data = data
        self.metadata = metadata or {}
        self.consciousness_level = float(consciousness_level)
        self.format_version = "OBIAI-1.0"
        self.pickle_type = "ontological_bayesian"

        # AXIOM I: Logarithmic data structures
        self._heap: List[Tuple[int, str]] = []  # (-priority, obj_id)
        self._index: Dict[str, Dict[str, Any]] = {}  # obj_id -> representation

        # AXIOM II: Streaming support
        self._stream_buffers: Dict[str, Dict[str, Any]] = {}
        self._part_files: Dict[str, Dict[str, Any]] = {}
        self._stream_position = 0

        # AXIOM III: Unified configuration schema
        self.config_schema = {
            'sender': None,
            'recipient': None,
            'transmission_mode': 'bidirectional',
            'compression_enabled': True,
            'consciousness_threshold': 0.954,
        }

        self.adaptation_history: List[Dict[str, Any]] = []
        self._evolution_hooks: List[Callable[[Any, Dict[str, Any] | None], Any]] = []

    # -------- helpers
    def _gen_id(self, obj: Any) -> str:
        # process-unique but fast; caller should not persist IDs cross‑process
        return hashlib.md5(str(id(obj)).encode()).hexdigest()[:12]

    def _push(self, obj_id: str, priority: int) -> None:
        # use negative so highest priority pops first
        heapq.heappush(self._heap, (-priority, obj_id))

    def _bufref(self, data: Any) -> Any:
        # simplistic streaming heuristic
        s = str(data)
        if len(s) <= 1024:
            return data
        buf_id = hashlib.md5(s.encode()).hexdigest()[:12]
        self._stream_buffers[buf_id] = {
            'buffer_type': 'large_object',
            'size': len(s),
            'checksum': hashlib.md5(s.encode()).hexdigest(),
            'stream_position': self._stream_position,
        }
        self._stream_position += len(s)
        return {'$ref': buf_id, 'kind': 'stream_buffer'}

    def _cfg(self, **overrides) -> Dict[str, Any]:
        self.config_schema.update({k: v for k, v in overrides.items() if k in self.config_schema})
        return self.config_schema

    # -------- representation + memo
    def _repr(self, obj: Any) -> Dict[str, Any]:
        obj_id = self._gen_id(obj)
        if obj_id in self._index:
            return {'type': 'reference', 'ref_id': obj_id}

        obj_type = type(obj).__name__
        pri = int(self.consciousness_level * 1000)

        if isinstance(obj, (int, float, str, bool)) or obj is None:
            rep = {
                'type': obj_type,
                'id': obj_id,
                'value': self._bufref(obj),
                'meta': self._meta('basic_primitive'),
            }
        elif isinstance(obj, (list, tuple)):
            items = [self._repr(x) for x in obj]
            rep = {
                'type': obj_type,
                'id': obj_id,
                'items': items,
                'meta': self._meta('sequence_container'),
            }
        elif isinstance(obj, dict):
            items = {str(k): self._repr(v) for k, v in obj.items()}
            rep = {
                'type': obj_type,
                'id': obj_id,
                'items': items,
                'meta': self._meta('mapping_container'),
            }
        elif hasattr(obj, '__dict__'):
            attrs = {k: self._repr(v) for k, v in vars(obj).items()}
            rep = {
                'type': obj_type,
                'id': obj_id,
                'module': getattr(obj, '__module__', None),
                'attributes': attrs,
                'meta': self._meta('user_defined_class', extra={'evolution_potential': True}),
            }
        else:
            rep = {
                'type': obj_type,
                'id': obj_id,
                'value': self._bufref(str(obj)),
                'meta': self._meta('fallback_representation', extra={'requires_evolution': True}),
            }

        self._index[obj_id] = rep
        self._push(obj_id, pri)
        return rep

    def _meta(self, stage: str, extra: Dict[str, Any] | None = None) -> Dict[str, Any]:
        base = {
            'version': self.format_version,
            'consciousness_level': self.consciousness_level,
            'adaptation_stage': stage,
            'axiom_compliance': ['I', 'II', 'III'],
        }
        if extra:
            base.update(extra)
        return base

    # -------- public API
    def serialize(self, *, sender: str | None = None, recipient: str | None = None, **cfg) -> Dict[str, Any]:
        cfg_applied = self._cfg(sender=sender, recipient=recipient, **cfg)
        obj_repr = self._repr(self.data)
        stream_meta = {
            'bidirectional_capable': True,
            'stream_buffers': self._stream_buffers,
            'part_files': self._part_files,
            'total_stream_size': self._stream_position,
            'resumable': True,
        }
        package = {
            'object_data': obj_repr,
            'object_store': self._index,  # for reference resolution
            'global_metadata': {
                **self.metadata,
                'format_version': self.format_version,
                'pickle_type': self.pickle_type,
                'consciousness_level': self.consciousness_level,
                'adaptation_history': self.adaptation_history,
                'obiai_compliance': True,
                'axiom_implementation': {
                    'I_logarithmic_protocol_heap_size': len(self._heap),
                    'II_streaming_format': stream_meta,
                    'III_configuration_schema': cfg_applied,
                },
            },
        }
        return package

    @classmethod
    def deserialize(cls, package: Dict[str, Any]) -> "OBIPickle":
        inst = cls(data=None, metadata=package.get('global_metadata', {}),
                   consciousness_level=package.get('global_metadata', {}).get('consciousness_level', 0.0))
        store = package.get('object_store', {})
        # build memo for reconstruction
        inst._index = dict(store)  # reuse field as memo store
        inst.data = inst._reconstruct(package['object_data'])
        return inst

    def _reconstruct(self, rep: Dict[str, Any]) -> Any:
        if rep.get('type') == 'reference':
            target = self._index.get(rep['ref_id'])
            if not target:
                raise ValueError(f"Dangling reference: {rep['ref_id']}")
            return self._reconstruct(target)

        t = rep['type']
        if t in {"int", "float", "str", "bool", "NoneType"}:
            return rep.get('value')
        if t == 'list':
            return [self._reconstruct(x) for x in rep['items']]
        if t == 'tuple':
            return tuple(self._reconstruct(x) for x in rep['items'])
        if t == 'dict':
            return {k: self._reconstruct(v) for k, v in rep['items'].items()}
        if 'attributes' in rep:
            # reconstruct simple shell object
            obj = type(rep['type'], (), {})()
            for k, v in rep['attributes'].items():
                setattr(obj, k, self._reconstruct(v))
            return obj
        return rep.get('value')

    # AXIOM II: part file ops
    def create_part_file(self, part_id: str, data_chunk: Any, is_final: bool = False) -> str:
        chunk_s = str(data_chunk)
        self._part_files[part_id] = {
            'chunk_size': len(chunk_s),
            'is_final': is_final,
            'checksum': hashlib.md5(chunk_s.encode()).hexdigest(),
        }
        return part_id

    # Evolution hooks
    def add_evolution_hook(self, hook: Callable[[Any, Dict[str, Any] | None], Any]) -> None:
        self._evolution_hooks.append(hook)

    def evolve_object(self, context: Dict[str, Any] | None = None) -> "OBIPickle":
        for hook in self._evolution_hooks:
            try:
                out = hook(self.data, context)
                if out is not None:
                    self.data = out
                    self.adaptation_history.append({'hook': getattr(hook, '__name__', str(hook)), 'context': context})
            except Exception as e:
                self.adaptation_history.append({'hook': 'error', 'error': str(e)})
        return self


# =====================
# DOP Adapter, Marshall, Transmit
# =====================

class DOPAdapter:
    """Data-Oriented Programming adapter for OBINexus."""
    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or {'mode': 'standard', 'validation': True}

    def process(self, task: Callable[[], Any] | Any, context: Dict[str, Any] | None = None) -> Dict[str, Any]:
        try:
            payload = task() if callable(task) else task
            return {
                'payload': payload,
                'context': context or {},
                'processing_metadata': {
                    'adapter_version': 'DOP-1.0',
                    'processed_at': 'runtime',
                    'config': self.config,
                },
            }
        except Exception as e:
            return {
                'payload': None,
                'error': str(e),
                'context': context or {},
                'processing_metadata': {
                    'adapter_version': 'DOP-1.0',
                    'error_state': True,
                    'config': self.config,
                },
            }


class OBMarshall:
    """Marshalling layer for OBINexus network protocol."""
    def __init__(self, dop_adapter: DOPAdapter):
        self.dop_adapter = dop_adapter
        self.stats = {'packaged': 0, 'errors': 0}

    def marshall(self, task: Callable[[], Any] | Any, priority: str = 'normal', context: Dict[str, Any] | None = None) -> OBIPickle:
        processed = self.dop_adapter.process(task, context)
        meta = {
            **processed.get('processing_metadata', {}),
            'priority': priority,
            'marshall_id': f"OBM_{self.stats['packaged']}",
            'transmission_ready': True if processed.get('payload') is not None else False,
        }
        pkg = OBIPickle(data=processed, metadata=meta)
        self.stats['packaged'] += 1
        return pkg


class OBTransmit:
    """Transmission layer with bi‑directional + consciousness channel."""
    def __init__(self, transmission_mode: str = 'sequential', *, consciousness_threshold: float = 0.954):
        self.queue: List[Dict[str, Any]] = []
        self.mode = transmission_mode
        self.stats = {'sent': 0, 'received': 0, 'errors': 0}
        self.channels: Dict[str, List[Dict[str, Any]]] = {
            'upstream': [],
            'downstream': [],
            'consciousness_stream': [],
        }
        self.threshold = consciousness_threshold

    def add_task(self, package: OBIPickle, channel: str = 'upstream') -> None:
        if channel not in self.channels:
            raise ValueError(f"Unknown channel: {channel}")
        self.queue.append({'pickle': package, 'channel': channel, 'id': f"OBT_{len(self.queue)}"})

    def execute(self) -> Dict[str, List[Dict[str, Any]]]:
        results = {k: [] for k in self.channels}
        results['errors'] = []
        for item in self.queue:
            ch = item['channel']
            try:
                payload = item['pickle'].serialize()
                meta = payload['global_metadata']
                # enforce threshold on consciousness_stream
                if ch == 'consciousness_stream' and meta.get('consciousness_level', 0.0) < self.threshold:
                    raise PermissionError("Consciousness threshold not met for consciousness_stream")
                results[ch].append({
                    'transmission_id': item['id'],
                    'object_data': payload['object_data'],
                    'global_metadata': meta,
                    'status': 'success',
                })
                self.stats['sent'] += 1
            except Exception as e:
                results['errors'].append({'transmission_id': item['id'], 'error': str(e), 'status': 'error'})
                self.stats['errors'] += 1
        self.queue.clear()
        for k in self.channels:
            self.channels[k].clear()
        return results

    def get_stats(self) -> Dict[str, int]:
        return dict(self.stats)


# =====================
# Demo / smoke test
# =====================

def _demo_evolution_hook(obj, ctx):
    if isinstance(obj, dict) and obj.get('consciousness_level', 0) < 0.954:
        obj['consciousness_level'] = 0.954
        obj['evolved'] = True
        return obj
    return None


def demo():
    print("=== OBIPickle / OBINexus Demo ===")

    data = {
        'number': 42,
        'text': 'OBIAI consciousness',
        'boolean': True,
        'list': [1, 2, 3],
        'nested': {'inner': 'value'},
    }
    ob = OBIPickle(data, consciousness_level=0.99)
    ob.add_evolution_hook(_demo_evolution_hook)
    ob.evolve_object({'why': 'demo'})

    pkg = ob.serialize(sender='vision', recipient='nexus')
    rec = OBIPickle.deserialize(pkg)

    assert rec.data['number'] == 42

    dop = DOPAdapter({'mode': 'consciousness', 'validation': True})
    mar = OBMarshall(dop)
    tx = OBTransmit(consciousness_threshold=0.954)

    def task():
        return {'type': 'consciousness_processing', 'consciousness_level': 0.99}

    marshalled = mar.marshall(task, priority='consciousness', context={'threshold': 0.954})
    tx.add_task(marshalled, channel='consciousness_stream')
    out = tx.execute()

    print("Upstream:", len(out['upstream']), "Downstream:", len(out['downstream']), "Conscious:", len(out['consciousness_stream']))
    return out


if __name__ == "__main__":
    demo()
