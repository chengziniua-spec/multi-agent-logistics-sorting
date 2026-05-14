import argparse

from src.experiment_runner import DEFAULT_NOISE_LEVELS, run_experiment


def main() -> None:
    parser = argparse.ArgumentParser(description="Run logistics sorting coordinator experiments.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--quick", action="store_true", help="Run a small smoke-test experiment.")
    mode.add_argument("--full", action="store_true", help="Run the full coursework evaluation.")
    parser.add_argument("--packages", type=int, default=500, help="Packages per run.")
    parser.add_argument("--runs", type=int, default=30, help="Independent runs per condition.")
    parser.add_argument("--output-dir", default="results", help="Directory for CSV, figures, and summary.")
    parser.add_argument("--figures-dir", default="figures", help="Directory for generated report figures.")
    args = parser.parse_args()

    if args.quick or not args.full:
        package_count = 40
        independent_runs = 2
        noise_levels = (0.0, 0.25)
    else:
        package_count = args.packages
        independent_runs = args.runs
        noise_levels = DEFAULT_NOISE_LEVELS

    run_experiment(
        package_count=package_count,
        independent_runs=independent_runs,
        noise_levels=noise_levels,
        output_dir=args.output_dir,
        figures_dir=args.figures_dir,
    )
    print(
        "Experiment completed. "
        f"Results written to {args.output_dir}/ and figures written to {args.figures_dir}/"
    )


if __name__ == "__main__":
    main()
