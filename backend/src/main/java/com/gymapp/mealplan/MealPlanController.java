package com.gymapp.mealplan;

import com.gymapp.mealplan.MealPlanDtos.MealDayDto;
import com.gymapp.mealplan.MealPlanDtos.MealDayRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanDetailDto;
import com.gymapp.mealplan.MealPlanDtos.MealPlanRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanSummaryDto;
import com.gymapp.user.User;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meal-plans")
@RequiredArgsConstructor
public class MealPlanController {

    private final MealPlanService mealPlanService;

    @GetMapping
    public List<MealPlanSummaryDto> list(@AuthenticationPrincipal User user) {
        return mealPlanService.listForUser(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MealPlanSummaryDto create(
            @AuthenticationPrincipal User user, @Valid @RequestBody MealPlanRequest request) {
        return mealPlanService.create(user, request);
    }

    @PostMapping("/from-template/{templateId}")
    @ResponseStatus(HttpStatus.CREATED)
    public MealPlanDetailDto cloneTemplate(
            @AuthenticationPrincipal User user, @PathVariable Long templateId) {
        return mealPlanService.cloneTemplate(user, templateId);
    }

    @GetMapping("/{id}")
    public MealPlanDetailDto get(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return mealPlanService.getDetail(user, id);
    }

    @PutMapping("/{id}")
    public MealPlanSummaryDto update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody MealPlanRequest request) {
        return mealPlanService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        mealPlanService.delete(user, id);
    }

    @PutMapping("/{id}/days/{dayNumber}")
    public MealDayDto upsertDay(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @PathVariable int dayNumber,
            @Valid @RequestBody MealDayRequest request) {
        return mealPlanService.upsertDay(user, id, dayNumber, request);
    }

    @DeleteMapping("/{id}/days/{dayNumber}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDay(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @PathVariable int dayNumber) {
        mealPlanService.deleteDay(user, id, dayNumber);
    }
}
