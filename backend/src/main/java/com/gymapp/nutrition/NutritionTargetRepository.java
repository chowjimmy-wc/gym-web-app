package com.gymapp.nutrition;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NutritionTargetRepository extends JpaRepository<NutritionTarget, Long> {

    List<NutritionTarget> findByUserIdOrderBySortOrderAsc(Long userId);

    Optional<NutritionTarget> findByIdAndUserId(Long id, Long userId);
}
