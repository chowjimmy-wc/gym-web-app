package com.gymapp.mealplan;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealDayRepository extends JpaRepository<MealDay, Long> {

    List<MealDay> findByMealPlanIdOrderByDayNumberAsc(Long mealPlanId);

    Optional<MealDay> findByMealPlanIdAndDayNumber(Long mealPlanId, int dayNumber);
}
