package com.gymapp.progress;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyReviewRepository extends JpaRepository<WeeklyReview, Long> {

    List<WeeklyReview> findByProgramIdOrderByWeekNumberAsc(Long programId);

    Optional<WeeklyReview> findByProgramIdAndWeekNumber(Long programId, int weekNumber);
}
