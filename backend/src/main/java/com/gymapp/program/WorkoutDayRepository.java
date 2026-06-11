package com.gymapp.program;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutDayRepository extends JpaRepository<WorkoutDay, Long> {

    List<WorkoutDay> findByProgramIdOrderByDayNumberAsc(Long programId);

    Optional<WorkoutDay> findByProgramIdAndDayNumber(Long programId, int dayNumber);
}
