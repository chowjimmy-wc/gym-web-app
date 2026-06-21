-- Allow a user to mark one workout program and one meal plan as "currently adopted".
-- Single-active enforcement is handled in the service layer (kept DB-portable for H2/Postgres).

ALTER TABLE workout_programs ADD COLUMN active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE meal_plans ADD COLUMN active BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_workout_programs_active ON workout_programs (user_id, active);
CREATE INDEX idx_meal_plans_active ON meal_plans (user_id, active);
