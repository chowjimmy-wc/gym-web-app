"""Import the Excel workout plan into data/plan.json."""
from pathlib import Path

import plan_store as store

ROOT = Path(__file__).parent
XLSX = ROOT / "Complete_60Days_Lean_Bulk_Plan.xlsx"


def main() -> None:
    plan = store.import_workbook(XLSX, title="60 Days Lean Bulk Plan")
    store.save_plan(plan)
    print(f"Imported {len(plan['sheet_order'])} sheets -> {store.PLAN_FILE}")


if __name__ == "__main__":
    main()
