# Coordination and Conflict Resolution in a Multi-Agent Intelligent Logistics Sorting System

Student: Haoxuan Cheng  
Student ID: 20621569

This project implements a multi-agent logistics sorting system for the COMP3004/4105 Designing Intelligent Agents coursework. It contains both:

- a Python simulation and experimental evaluation framework
- a browser-based React visual demo showing one package moving through the sorting process

The system models a logistics sorting centre where specialist agents classify a package, and a coordinator decides the final handling lane while preserving the geographical hub-to-depot delivery route.

## Project Structure

```text
.
|-- main.py
|-- requirements.txt
|-- README.md
|-- src/
|   |-- agents.py
|   |-- coordinators.py
|   |-- environment.py
|   |-- experiment_runner.py
|   |-- metrics.py
|   |-- noise.py
|   |-- package_generator.py
|   `-- uk_geography.py
|-- tests/
|   |-- test_experiment_framework.py
|   `-- test_uk_geography.py
|-- results/
|   |-- experiment_results.csv
|   |-- summary_by_condition.csv
|   |-- summary_by_coordinator.csv
|   |-- report_results.md
|   `-- sample_decision_traces.csv
|-- figures/
|   |-- accuracy_by_noise.png
|   |-- handling_accuracy_by_noise.png
|   |-- depot_accuracy_by_noise.png
|   |-- conflict_resolution_accuracy.png
|   |-- manual_review_rate.png
|   |-- conflict_rate_by_dataset.png
|   |-- combined_accuracy_overview.png
|   `-- combined_conflict_review_overview.png
`-- visual_demo/
    |-- package.json
    |-- package-lock.json
    |-- index.html
    |-- dist/
    |-- src/
    `-- README.md
```

## Main Features

### Specialist Agents

The Python simulation and visual demo use the same agent design:

- **Geography Agent**: infers a UK logistics route from postcode/address.
- **Cargo Type Agent**: classifies cargo using deterministic keyword matching.
- **Size Agent**: detects oversized packages using volume and weight thresholds.
- **Handling Agent**: detects cold-chain, fragile, priority, and normal handling.

### Coordinator Strategies

The Python simulation supports three coordinator strategies:

- **RuleBasedCoordinator**
- **WeightedVotingCoordinator**
- **MediatorCoordinator**

Special handling and routing are kept separate. For example, a cold-chain package destined for Nottingham is assigned `COLD_CHAIN` as the final handling lane, while its route remains:

```text
East Midlands Sorting Centre -> Nottingham Delivery Depot
```

Nottingham food is not used as a special final lane.

### Dataset Modes

The experimental framework supports:

- `normal`
- `multi_label`
- `conflict_heavy`
- `noisy_address`

Noise injection can corrupt or remove postcodes, replace cargo descriptions with ambiguous text, perturb weight, and flip fragile/cold-chain/priority flags with controlled probability.

## Requirements

Python:

- Python 3.11 recommended
- packages listed in `requirements.txt`

Node:

- Node.js 18 or later recommended
- npm

## Python Setup

From the project root:

```bash
python -m pip install -r requirements.txt
```

If your environment uses `python3` instead of `python`, use:

```bash
python3 -m pip install -r requirements.txt
```

## Run Python Tests

```bash
python -m pytest
```

Expected result:

```text
10 passed
```

The tests cover:

- postcode and hub/depot routing
- conflict detection
- noise injection
- coordinator decisions
- experiment runner CSV output

## Run Experimental Evaluation

### Quick Smoke Experiment

Use this command to quickly check that the experiment pipeline works:

```bash
python main.py --quick
```

This runs:

- 2 runs per condition
- 40 packages per run
- noise levels `0.0` and `0.25`

### Full Coursework Experiment

```bash
python main.py --full
```

This runs:

- 30 independent runs per condition
- 500 packages per run
- 3 coordinators
- 4 dataset modes
- 4 noise levels: `0.0`, `0.1`, `0.2`, `0.35`

The full experiment processes:

```text
240,000 unique generated package instances
720,000 coordinator package decisions
```

### Override Full Experiment Size

You can override the number of packages and runs:

```bash
python main.py --full --packages 1000 --runs 30
```

You can also choose output directories:

```bash
python main.py --full --output-dir results --figures-dir figures
```

## Experiment Outputs

After running the experiment, the main outputs are:

```text
results/experiment_results.csv
results/summary_by_condition.csv
results/summary_by_coordinator.csv
results/report_results.md
results/sample_decision_traces.csv
```

### `experiment_results.csv`

One row per:

```text
coordinator x dataset_mode x noise_level x run_id
```

Main columns:

- `coordinator`
- `dataset_mode`
- `noise_level`
- `run_id`
- `num_packages`
- `final_accuracy`
- `handling_accuracy`
- `hub_accuracy`
- `depot_accuracy`
- `conflict_rate`
- `conflict_resolution_accuracy`
- `manual_review_rate`
- `avg_processing_time_ms`

### `summary_by_condition.csv`

Aggregates results by:

```text
coordinator x dataset_mode x noise_level
```

It includes mean and standard deviation for all metrics.

### `summary_by_coordinator.csv`

Aggregates results by coordinator strategy.

### `report_results.md`

Contains a report-ready summary of:

- experiment setup
- total package decisions
- best coordinator overall
- best coordinator under high noise
- best coordinator for conflict-heavy cases
- manual review trade-off
- interpretation

### `sample_decision_traces.csv`

Contains representative package-level traces for report evidence, including:

- input package fields
- predicted and expected handling
- predicted and expected hub/depot
- conflicts detected
- triggered decisions
- final correctness

## Figures

Generated figures are stored in:

```text
figures/
```

Individual figures:

- `accuracy_by_noise.png`
- `handling_accuracy_by_noise.png`
- `depot_accuracy_by_noise.png`
- `conflict_resolution_accuracy.png`
- `manual_review_rate.png`
- `conflict_rate_by_dataset.png`

Combined report figures:

- `combined_accuracy_overview.png`
- `combined_conflict_review_overview.png`

These combined figures are useful for placing fewer images in the coursework report.

## Run The Visual Demo

The visual demo is in:

```text
visual_demo/
```

Install dependencies:

```bash
cd visual_demo
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will print a local URL, usually:

```text
http://localhost:5173
```

Open that URL in a browser.

### Build The Visual Demo

```bash
cd visual_demo
npm run build
```

The production build is written to:

```text
visual_demo/dist/
```

### Preview The Built Demo

```bash
cd visual_demo
npm run preview
```

### Visual Demo Features

The visual demo includes:

- package input form
- preset package buttons
- input queue
- `Process Next Package`
- `Auto Process` and `Stop Auto`
- score panel
- event log
- conveyor animation
- specialist agent output cards
- coordinator decision panel
- conflict detection display
- exportable JSON decision trace

## Example Demo Scenarios

### East London Package

```text
Postcode: E14 5AB
Route: London Sorting Centre -> East London Delivery Depot
```

### Nottingham Food Package

```text
Postcode: NG7 2RD
Cargo: fresh apples
Route: East Midlands Sorting Centre -> Nottingham Delivery Depot
```

This is routed to the Nottingham depot. It is not treated as a special final lane.

### Conflict-Heavy Package

```text
Destination: Nottingham
Cargo: frozen pizza
Cold-chain: true
Priority: true
```

Expected behaviour:

```text
Conflict: COLD_CHAIN vs EXPRESS
Final handling lane: COLD_CHAIN
Route preserved: East Midlands Sorting Centre -> Nottingham Delivery Depot
```

## Reproducibility

The experiment uses deterministic random seeds based on:

- dataset mode
- noise level
- run id

This means the same command should generate the same results, provided the code and dependency versions are unchanged.

## Notes For Submission

Recommended files/folders to include:

- `src/`
- `tests/`
- `main.py`
- `requirements.txt`
- `README.md`
- `results/`
- `figures/`
- `visual_demo/`

The `visual_demo/node_modules/` folder is intentionally not included. It can be regenerated with:

```bash
cd visual_demo
npm install
```

## Common Commands

Run tests:

```bash
python -m pytest
```

Run quick experiment:

```bash
python main.py --quick
```

Run full experiment:

```bash
python main.py --full
```

Run visual demo:

```bash
cd visual_demo
npm install
npm run dev
```

Build visual demo:

```bash
cd visual_demo
npm run build
```
