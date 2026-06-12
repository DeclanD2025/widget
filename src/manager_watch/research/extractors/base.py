from __future__ import annotations


class ExtractorUnavailable(Exception):
    """Raised when an extractor cannot run (blocked, robots-disallowed,
    unimplemented). The orchestrator records the failure and continues —
    the dossier ships with the section degraded rather than failing."""


def header_indexed_columns(header_cells: list[str], wanted: dict[str, list[str]]) -> dict[str, int]:
    """Map logical column names to indexes by header text, not position.

    wanted: {"club": ["club", "team"], ...} -> {"club": 2, ...}
    Missing columns are simply absent from the result.
    """
    normalized = [cell.strip().lower() for cell in header_cells]
    mapping: dict[str, int] = {}
    for logical, aliases in wanted.items():
        for index, cell in enumerate(normalized):
            if any(alias in cell for alias in aliases):
                mapping[logical] = index
                break
    return mapping
