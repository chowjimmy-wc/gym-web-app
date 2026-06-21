package com.gymapp.library;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealItemRepository extends JpaRepository<MealItem, Long> {

    List<MealItem> findByUserIdOrderByNameAsc(Long userId);

    Optional<MealItem> findByIdAndUserId(Long id, Long userId);
}
