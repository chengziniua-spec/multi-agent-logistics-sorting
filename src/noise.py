import random
from typing import Any, Dict, List, Tuple

AMBIGUOUS_CARGO = [
    "mixed items",
    "assorted goods",
    "general parcel",
    "unknown contents",
]


def _as_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def inject_noise(
    package: Dict[str, Any],
    noise_level: float,
    rng: random.Random,
) -> Tuple[Dict[str, Any], List[str]]:
    probability = max(0.0, min(1.0, noise_level))
    noisy = dict(package)
    operations: List[str] = []

    if rng.random() < probability:
        noisy["postcode"] = f"ZZ{rng.randint(1, 99)} {rng.randint(1, 9)}ZZ"
        operations.append("corrupt_postcode")

    if rng.random() < probability:
        noisy["postcode"] = ""
        operations.append("remove_postcode")

    if rng.random() < probability:
        noisy["cargoDescription"] = rng.choice(AMBIGUOUS_CARGO)
        operations.append("ambiguous_cargo")

    if rng.random() < probability:
        original_weight = float(noisy.get("weight", 0.0))
        noisy["weight"] = round(max(0.1, original_weight * rng.uniform(0.65, 1.45)), 2)
        operations.append("perturb_weight")

    for flag in ("fragile", "coldChain", "priority"):
        if rng.random() < probability:
            noisy[flag] = not _as_bool(noisy.get(flag))
            operations.append(f"flip_{flag}")

    noisy["noiseOperations"] = "|".join(operations)
    noisy["noiseLevel"] = probability
    return noisy, operations
