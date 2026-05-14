# Experimental Evaluation Summary

Each row below reports mean +/- standard deviation across dataset modes, noise levels, and independent runs.

| Coordinator | Final Decision Accuracy | Handling Accuracy | Hub Accuracy | Depot Accuracy | Conflict Resolution Accuracy | Manual Review Rate | Avg Processing Time Ms |
|---|---|---|---|---|---|---|---|
| MediatorCoordinator | 0.711 +/- 0.305 | 0.734 +/- 0.279 | 0.873 +/- 0.179 | 0.872 +/- 0.181 | 0.661 +/- 0.371 | 0.052 +/- 0.086 | 0.050 +/- 0.011 |
| RuleBasedCoordinator | 0.723 +/- 0.295 | 0.739 +/- 0.276 | 0.873 +/- 0.179 | 0.872 +/- 0.181 | 0.672 +/- 0.369 | 0.017 +/- 0.044 | 0.047 +/- 0.009 |
| WeightedVotingCoordinator | 0.723 +/- 0.295 | 0.739 +/- 0.276 | 0.873 +/- 0.179 | 0.872 +/- 0.181 | 0.672 +/- 0.369 | 0.017 +/- 0.044 | 0.050 +/- 0.008 |

## Interpretation

- Best coordinator overall: **RuleBasedCoordinator** with mean final decision accuracy 0.723.
- Best coordinator under high noise (0.25): **RuleBasedCoordinator** with mean final decision accuracy 0.447.
- Manual review trade-off: **RuleBasedCoordinator** produced the lowest average manual review rate (0.017). Higher manual review can protect safety under uncertain inputs, but it reduces automation throughput.
- Automatically generated interpretation: rule-based coordination is expected to be strong when deterministic safety priorities dominate; weighted voting can be competitive when several agents provide reliable confidence scores; mediator coordination is more conservative when noisy address or cargo inputs reduce confidence.