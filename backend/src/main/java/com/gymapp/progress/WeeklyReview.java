package com.gymapp.progress;

import com.gymapp.program.WorkoutProgram;
import com.gymapp.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "weekly_reviews")
@Getter
@Setter
@NoArgsConstructor
public class WeeklyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "program_id")
    private WorkoutProgram program;

    @Column(name = "week_number", nullable = false)
    private int weekNumber;

    @Column(name = "log_date")
    private LocalDate logDate;

    @Column(name = "weight_kg")
    private BigDecimal weightKg;

    @Column(name = "waist_cm")
    private BigDecimal waistCm;

    @Column(name = "strength_progress")
    private String strengthProgress;

    @Column(name = "mood_sleep_soreness")
    private String moodSleepSoreness;

    private String reflection;
}
