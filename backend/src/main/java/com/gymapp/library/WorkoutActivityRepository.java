package com.gymapp.library;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutActivityRepository extends JpaRepository<WorkoutActivity, Long> {

    List<WorkoutActivity> findByUserIdOrderByCategoryAscNameAsc(Long userId);

    Optional<WorkoutActivity> findByIdAndUserId(Long id, Long userId);
}
