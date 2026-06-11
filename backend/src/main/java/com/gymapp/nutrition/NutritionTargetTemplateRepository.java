package com.gymapp.nutrition;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NutritionTargetTemplateRepository
        extends JpaRepository<NutritionTargetTemplate, Long> {

    List<NutritionTargetTemplate> findAllByOrderBySortOrderAsc();
}
