package com.gymapp.mealplan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public final class MealPlanDtos {

    private MealPlanDtos() {}

    public record MealPlanRequest(
            @NotBlank String name, String description, @Min(1) @Max(365) Integer durationDays) {}

    public record MealDayRequest(
            Integer weekNumber,
            String dayOfWeek,
            String breakfast,
            String lunch,
            String afternoonSnack,
            String dinner,
            String supplements,
            String tips) {}

    public record MealDayDto(
            Long id,
            int dayNumber,
            Integer weekNumber,
            String dayOfWeek,
            String breakfast,
            String lunch,
            String afternoonSnack,
            String dinner,
            String supplements,
            String tips) {}

    public record MealPlanSummaryDto(
            Long id,
            String name,
            String description,
            int durationDays,
            boolean template,
            boolean active) {}

    public record MealPlanDetailDto(
            Long id,
            String name,
            String description,
            int durationDays,
            boolean template,
            boolean active,
            List<MealDayDto> days) {}

    static MealDayDto toDto(MealDay d) {
        return new MealDayDto(
                d.getId(),
                d.getDayNumber(),
                d.getWeekNumber(),
                d.getDayOfWeek(),
                d.getBreakfast(),
                d.getLunch(),
                d.getAfternoonSnack(),
                d.getDinner(),
                d.getSupplements(),
                d.getTips());
    }

    static MealPlanSummaryDto toSummaryDto(MealPlan p) {
        return new MealPlanSummaryDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getDurationDays(),
                p.isTemplate(),
                p.isActive());
    }

    static MealPlanDetailDto toDetailDto(MealPlan p, List<MealDay> days) {
        return new MealPlanDetailDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getDurationDays(),
                p.isTemplate(),
                p.isActive(),
                days.stream().map(MealPlanDtos::toDto).toList());
    }
}
