package com.gymapp.mealplan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "meal_days")
@Getter
@Setter
@NoArgsConstructor
public class MealDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_plan_id")
    private MealPlan mealPlan;

    @Column(name = "day_number", nullable = false)
    private int dayNumber;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "day_of_week")
    private String dayOfWeek;

    private String breakfast;

    private String lunch;

    @Column(name = "afternoon_snack")
    private String afternoonSnack;

    private String dinner;

    private String supplements;

    private String tips;
}
