"""Convert Complete_60Days_Lean_Bulk_Plan.xlsx into a Flyway seed migration.

Generates backend/src/main/resources/db/migration/V2__seed_template.sql with:
- one system template workout program (60 days + parsed exercises)
- one system template meal plan (60 days)
- default nutrition target template rows
"""
from __future__ import annotations

import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "GymApp" / "GymApp" / "Complete_60Days_Lean_Bulk_Plan.xlsx"
OUT = ROOT / "backend" / "src" / "main" / "resources" / "db" / "migration" / "V2__seed_template.sql"

SHEET_NUTRITION = "1.營養與熱量目標"
SHEET_WORKOUT = "2.60天詳細課表"
SHEET_MEALS = "3.60天詳細餐單"

PROGRAM_NAME = "60 天 Lean Bulk 訓練計劃"
MEAL_PLAN_NAME = "60 天 Lean Bulk 餐單"

PROGRAM_REF = f"(SELECT id FROM workout_programs WHERE is_template = TRUE AND name = '{PROGRAM_NAME}')"
MEAL_PLAN_REF = f"(SELECT id FROM meal_plans WHERE is_template = TRUE AND name = '{MEAL_PLAN_NAME}')"

EXERCISE_RE = re.compile(r"^\s*(?:\d+[\.、)]\s*)?(.+?)\s+(\d+\s*[xX×]\s*[\d\-~]+(?:\s*(?:次|秒|分鐘))?)\s*$")


def sql_str(value) -> str:
    if value is None:
        return "NULL"
    text = str(value).strip()
    if not text:
        return "NULL"
    return "'" + text.replace("'", "''") + "'"


def day_num(text) -> int:
    m = re.search(r"(\d+)", str(text or ""))
    return int(m.group(1)) if m else 0


def rows_of(wb, name):
    rows = list(wb[name].iter_rows(values_only=True))
    return rows[1:]


def parse_exercises(cell: str) -> list[tuple[str, str | None]]:
    exercises = []
    for line in (cell or "").splitlines():
        line = line.strip()
        if not line:
            continue
        m = EXERCISE_RE.match(line)
        if m:
            exercises.append((m.group(1).strip(), m.group(2).strip()))
        else:
            name = re.sub(r"^\s*\d+[\.、)]\s*", "", line)
            exercises.append((name, None))
    return exercises


def main() -> None:
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    lines: list[str] = [
        "-- Seed data generated from Complete_60Days_Lean_Bulk_Plan.xlsx",
        "-- by scripts/xlsx_to_seed.py. Do not edit by hand.",
        "",
    ]

    # Nutrition target templates
    lines.append("-- Default nutrition targets (copied to each new user on registration)")
    for i, row in enumerate(rows_of(wb, SHEET_NUTRITION)):
        if not any(row):
            continue
        item, value, note = (list(row) + [None] * 3)[:3]
        lines.append(
            "INSERT INTO nutrition_target_templates (item, value, note, sort_order) "
            f"VALUES ({sql_str(item)}, {sql_str(value)}, {sql_str(note)}, {i});"
        )

    # Template workout program
    lines += [
        "",
        "-- Template workout program",
        "INSERT INTO workout_programs (user_id, name, description, duration_days, status, is_template) "
        f"VALUES (NULL, '{PROGRAM_NAME}', '為期 60 天的 Lean Bulk 增肌訓練範本，包含每日訓練動作、組數與休息建議。', "
        "60, 'DRAFT', TRUE);",
        "",
    ]
    for row in rows_of(wb, SHEET_WORKOUT):
        if not any(row):
            continue
        day_s, week_s, dow, ttype, moves, rest, _checkin, notes = (list(row) + [None] * 8)[:8]
        day = day_num(day_s)
        week = day_num(week_s) or None
        lines.append(
            "INSERT INTO workout_days (program_id, day_number, week_number, day_of_week, "
            "training_type, rest_advice, notes) VALUES "
            f"({PROGRAM_REF}, {day}, {week if week else 'NULL'}, {sql_str(dow)}, "
            f"{sql_str(ttype)}, {sql_str(rest)}, {sql_str(notes)});"
        )
        for order, (name, sets_reps) in enumerate(parse_exercises(moves)):
            lines.append(
                "INSERT INTO workout_exercises (workout_day_id, sort_order, name, sets_reps) VALUES "
                f"((SELECT id FROM workout_days WHERE day_number = {day} AND program_id = {PROGRAM_REF}), "
                f"{order}, {sql_str(name)}, {sql_str(sets_reps)});"
            )

    # Template meal plan
    lines += [
        "",
        "-- Template meal plan",
        "INSERT INTO meal_plans (user_id, name, description, duration_days, is_template) "
        f"VALUES (NULL, '{MEAL_PLAN_NAME}', '為期 60 天的 Lean Bulk 飲食範本，包含每日四餐與補充建議。', 60, TRUE);",
        "",
    ]
    for row in rows_of(wb, SHEET_MEALS):
        if not any(row):
            continue
        day_s, week_s, dow, breakfast, lunch, snack, dinner, supplements, tips = (list(row) + [None] * 9)[:9]
        day = day_num(day_s)
        week = day_num(week_s) or None
        lines.append(
            "INSERT INTO meal_days (meal_plan_id, day_number, week_number, day_of_week, "
            "breakfast, lunch, afternoon_snack, dinner, supplements, tips) VALUES "
            f"({MEAL_PLAN_REF}, {day}, {week if week else 'NULL'}, {sql_str(dow)}, "
            f"{sql_str(breakfast)}, {sql_str(lunch)}, {sql_str(snack)}, {sql_str(dinner)}, "
            f"{sql_str(supplements)}, {sql_str(tips)});"
        )

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
