package com.gymapp.program;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

public final class ProgramDtos {

    private ProgramDtos() {}

    public record ProgramRequest(
            @NotBlank String name,
            String description,
            @Min(1) @Max(365) Integer durationDays,
            LocalDate startDate,
            WorkoutProgram.Status status) {}

    public record ExerciseRequest(@NotBlank String name, String setsReps) {}

    public record DayRequest(
            Integer weekNumber,
            String dayOfWeek,
            String trainingType,
            String restAdvice,
            String cardio,
            String notes,
            @Valid List<ExerciseRequest> exercises) {}

    public record ExerciseDto(Long id, int sortOrder, String name, String setsReps) {}

    public record DayDto(
            Long id,
            int dayNumber,
            Integer weekNumber,
            String dayOfWeek,
            String trainingType,
            String restAdvice,
            String cardio,
            String notes,
            List<ExerciseDto> exercises) {}

    public record ProgramSummaryDto(
            Long id,
            String name,
            String description,
            int durationDays,
            LocalDate startDate,
            WorkoutProgram.Status status,
            boolean template,
            boolean active) {}

    public record ProgramDetailDto(
            Long id,
            String name,
            String description,
            int durationDays,
            LocalDate startDate,
            WorkoutProgram.Status status,
            boolean template,
            boolean active,
            List<DayDto> days) {}

    static ExerciseDto toDto(WorkoutExercise e) {
        return new ExerciseDto(e.getId(), e.getSortOrder(), e.getName(), e.getSetsReps());
    }

    static DayDto toDto(WorkoutDay d) {
        return new DayDto(
                d.getId(),
                d.getDayNumber(),
                d.getWeekNumber(),
                d.getDayOfWeek(),
                d.getTrainingType(),
                d.getRestAdvice(),
                d.getCardio(),
                d.getNotes(),
                d.getExercises().stream().map(ProgramDtos::toDto).toList());
    }

    static ProgramSummaryDto toSummaryDto(WorkoutProgram p) {
        return new ProgramSummaryDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getDurationDays(),
                p.getStartDate(),
                p.getStatus(),
                p.isTemplate(),
                p.isActive());
    }

    static ProgramDetailDto toDetailDto(WorkoutProgram p, List<WorkoutDay> days) {
        return new ProgramDetailDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getDurationDays(),
                p.getStartDate(),
                p.getStatus(),
                p.isTemplate(),
                p.isActive(),
                days.stream().map(ProgramDtos::toDto).toList());
    }
}
