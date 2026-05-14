# Report Results: Experimental Evaluation

## Experiment Setup

Research question: How do different coordination and conflict-resolution strategies affect the performance of a multi-agent logistics sorting system under normal, noisy, and conflict-heavy package conditions?

- Coordinator strategies: RuleBasedCoordinator, WeightedVotingCoordinator, MediatorCoordinator.
- Dataset modes: normal, multi_label, conflict_heavy, noisy_address.
- Noise levels: 0.0, 0.1, 0.2, 0.35 for full runs; quick runs may use a reduced smoke-test set.
- Repeated runs in this execution: 30.
- Packages per run in this execution: 500.
- Deterministic seeds are derived from dataset mode, noise level, and run_id.

## Scale

- Unique generated package instances: 240,000.
- Coordinator package decisions processed: 720,000.

## Headline Results

- Best coordinator overall by final_accuracy: **RuleBasedCoordinator / WeightedVotingCoordinator** (0.664).
- Best coordinator under high noise (0.35): **RuleBasedCoordinator / WeightedVotingCoordinator** (0.347).
- Best coordinator on conflict-heavy dataset by conflict_resolution_accuracy: **RuleBasedCoordinator / WeightedVotingCoordinator** (0.781).

## Manual Review Rate

- MediatorCoordinator: 0.071
- RuleBasedCoordinator: 0.029
- WeightedVotingCoordinator: 0.029

## Interpretation

Rule-based coordination is strong when the domain priority order is known in advance: cold-chain, fragile, express, oversized, then normal depot routing. It is highly explainable and preserves the separation between handling and hub/depot routing.
Weighted voting is useful when agent confidence scores should influence decisions, but it can match rule-based behaviour when handling signals dominate the scoring weights.
Mediator coordination is deliberately more cautious: it can route uncertain cases to manual review when multiple agents have low confidence or routing information is missing.
The main trade-off is automation versus caution. Lower manual review rates increase automated throughput, while higher manual review rates may be safer when address or cargo information is noisy.