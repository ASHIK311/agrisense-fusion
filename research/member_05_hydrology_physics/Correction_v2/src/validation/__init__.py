"""
Scientific Validation & Cross-Platform Benchmarking Module
Validates against FAO-56 textbook benchmarks and main Node.js JavaScript physics engine.
"""

from .benchmark_fao56 import (
    run_fao56_textbook_benchmarks,
    BenchmarkResult,
)

from .comparison_engine import (
    compare_python_and_javascript_physics,
    ComparisonRecord,
)

__all__ = [
    "run_fao56_textbook_benchmarks",
    "BenchmarkResult",
    "compare_python_and_javascript_physics",
    "ComparisonRecord",
]
