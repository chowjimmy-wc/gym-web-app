export interface UserInfo {
  id: number;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}

export interface NutritionTarget {
  id: number;
  item: string;
  value: string | null;
  note: string | null;
  sortOrder: number;
}

export type ProgramStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

export interface ProgramSummary {
  id: number;
  name: string;
  description: string | null;
  durationDays: number;
  startDate: string | null;
  status: ProgramStatus;
  template: boolean;
  active: boolean;
}

export interface Exercise {
  id: number;
  sortOrder: number;
  name: string;
  setsReps: string | null;
}

export interface WorkoutDay {
  id: number;
  dayNumber: number;
  weekNumber: number | null;
  dayOfWeek: string | null;
  trainingType: string | null;
  restAdvice: string | null;
  cardio: string | null;
  notes: string | null;
  exercises: Exercise[];
}

export interface ProgramDetail extends ProgramSummary {
  days: WorkoutDay[];
}

export interface MealPlanSummary {
  id: number;
  name: string;
  description: string | null;
  durationDays: number;
  template: boolean;
  active: boolean;
}

export interface MealDay {
  id: number;
  dayNumber: number;
  weekNumber: number | null;
  dayOfWeek: string | null;
  breakfast: string | null;
  lunch: string | null;
  afternoonSnack: string | null;
  dinner: string | null;
  supplements: string | null;
  tips: string | null;
}

export interface MealPlanDetail extends MealPlanSummary {
  days: MealDay[];
}

export interface DayLog {
  id: number;
  dayNumber: number;
  completed: boolean;
  completedAt: string | null;
  workoutNotes: string | null;
}

export interface WeeklyReview {
  id: number;
  weekNumber: number;
  logDate: string | null;
  weightKg: number | null;
  waistCm: number | null;
  strengthProgress: string | null;
  moodSleepSoreness: string | null;
  reflection: string | null;
}

export interface Templates {
  programs: ProgramSummary[];
  mealPlans: MealPlanSummary[];
}

export interface WorkoutActivity {
  id: number;
  category: string | null;
  name: string;
  notes: string | null;
}

export interface MealItem {
  id: number;
  name: string;
  cookingMethod: string | null;
}

export interface ExerciseLog {
  exerciseId: number;
  completed: boolean;
  completedAt: string | null;
}
