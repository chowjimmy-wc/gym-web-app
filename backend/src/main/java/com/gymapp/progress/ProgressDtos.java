package com.gymapp.progress;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class ProgressDtos {

    private ProgressDtos() {}

    public record DayLogRequest(Boolean completed, String workoutNotes) {}

    public record ExerciseLogRequest(Boolean completed) {}

    public record ExerciseLogDto(Long exerciseId, boolean completed, java.time.Instant completedAt) {}

    public record DayLogDto(
            Long id, int dayNumber, boolean completed, Instant completedAt, String workoutNotes) {}

    public record WeeklyReviewRequest(
            LocalDate logDate,
            BigDecimal weightKg,
            BigDecimal waistCm,
            String strengthProgress,
            String moodSleepSoreness,
            String reflection) {}

    public record WeeklyReviewDto(
            Long id,
            int weekNumber,
            LocalDate logDate,
            BigDecimal weightKg,
            BigDecimal waistCm,
            String strengthProgress,
            String moodSleepSoreness,
            String reflection) {}

    static ExerciseLogDto toDto(ExerciseLog log) {
        return new ExerciseLogDto(
                log.getExercise().getId(), log.isCompleted(), log.getCompletedAt());
    }

    static DayLogDto toDto(DayLog log) {
        return new DayLogDto(
                log.getId(),
                log.getDayNumber(),
                log.isCompleted(),
                log.getCompletedAt(),
                log.getWorkoutNotes());
    }

    static WeeklyReviewDto toDto(WeeklyReview review) {
        return new WeeklyReviewDto(
                review.getId(),
                review.getWeekNumber(),
                review.getLogDate(),
                review.getWeightKg(),
                review.getWaistCm(),
                review.getStrengthProgress(),
                review.getMoodSleepSoreness(),
                review.getReflection());
    }
}
