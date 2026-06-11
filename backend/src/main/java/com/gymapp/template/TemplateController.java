package com.gymapp.template;

import com.gymapp.mealplan.MealPlanDtos.MealPlanSummaryDto;
import com.gymapp.mealplan.MealPlanService;
import com.gymapp.program.ProgramDtos.ProgramSummaryDto;
import com.gymapp.program.ProgramService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final ProgramService programService;
    private final MealPlanService mealPlanService;

    public record TemplatesDto(
            List<ProgramSummaryDto> programs, List<MealPlanSummaryDto> mealPlans) {}

    @GetMapping
    public TemplatesDto list() {
        return new TemplatesDto(programService.listTemplates(), mealPlanService.listTemplates());
    }
}
