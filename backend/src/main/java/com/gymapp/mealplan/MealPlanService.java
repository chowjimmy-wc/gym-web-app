package com.gymapp.mealplan;

import com.gymapp.common.ApiException;
import com.gymapp.mealplan.MealPlanDtos.MealDayDto;
import com.gymapp.mealplan.MealPlanDtos.MealDayRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanDetailDto;
import com.gymapp.mealplan.MealPlanDtos.MealPlanRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanSummaryDto;
import com.gymapp.user.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealDayRepository mealDayRepository;

    public List<MealPlanSummaryDto> listForUser(User user) {
        return mealPlanRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(MealPlanDtos::toSummaryDto)
                .toList();
    }

    public List<MealPlanSummaryDto> listTemplates() {
        return mealPlanRepository.findByTemplateTrue().stream()
                .map(MealPlanDtos::toSummaryDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public MealPlanDetailDto getDetail(User user, Long id) {
        MealPlan plan = findAccessible(user, id);
        return MealPlanDtos.toDetailDto(
                plan, mealDayRepository.findByMealPlanIdOrderByDayNumberAsc(plan.getId()));
    }

    @Transactional
    public MealPlanSummaryDto create(User user, MealPlanRequest request) {
        MealPlan plan = new MealPlan();
        plan.setUser(user);
        apply(plan, request);
        return MealPlanDtos.toSummaryDto(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanSummaryDto update(User user, Long id, MealPlanRequest request) {
        MealPlan plan = findOwned(user, id);
        apply(plan, request);
        return MealPlanDtos.toSummaryDto(mealPlanRepository.save(plan));
    }

    @Transactional
    public void delete(User user, Long id) {
        mealPlanRepository.delete(findOwned(user, id));
    }

    @Transactional
    public MealPlanDetailDto cloneTemplate(User user, Long templateId) {
        MealPlan template = mealPlanRepository.findByIdAndTemplateTrue(templateId)
                .orElseThrow(() -> ApiException.notFound("找不到此範本"));

        MealPlan copy = new MealPlan();
        copy.setUser(user);
        copy.setName(template.getName());
        copy.setDescription(template.getDescription());
        copy.setDurationDays(template.getDurationDays());
        copy.setTemplate(false);
        copy = mealPlanRepository.save(copy);

        for (MealDay day : mealDayRepository.findByMealPlanIdOrderByDayNumberAsc(templateId)) {
            MealDay dayCopy = new MealDay();
            dayCopy.setMealPlan(copy);
            dayCopy.setDayNumber(day.getDayNumber());
            dayCopy.setWeekNumber(day.getWeekNumber());
            dayCopy.setDayOfWeek(day.getDayOfWeek());
            dayCopy.setBreakfast(day.getBreakfast());
            dayCopy.setLunch(day.getLunch());
            dayCopy.setAfternoonSnack(day.getAfternoonSnack());
            dayCopy.setDinner(day.getDinner());
            dayCopy.setSupplements(day.getSupplements());
            dayCopy.setTips(day.getTips());
            mealDayRepository.save(dayCopy);
        }
        return MealPlanDtos.toDetailDto(
                copy, mealDayRepository.findByMealPlanIdOrderByDayNumberAsc(copy.getId()));
    }

    @Transactional
    public MealDayDto upsertDay(User user, Long planId, int dayNumber, MealDayRequest request) {
        MealPlan plan = findOwned(user, planId);
        if (dayNumber < 1 || dayNumber > plan.getDurationDays()) {
            throw ApiException.badRequest("天數超出餐單範圍");
        }
        MealDay day = mealDayRepository.findByMealPlanIdAndDayNumber(planId, dayNumber)
                .orElseGet(() -> {
                    MealDay d = new MealDay();
                    d.setMealPlan(plan);
                    d.setDayNumber(dayNumber);
                    return d;
                });
        day.setWeekNumber(request.weekNumber() != null
                ? request.weekNumber()
                : (dayNumber - 1) / 7 + 1);
        day.setDayOfWeek(request.dayOfWeek());
        day.setBreakfast(request.breakfast());
        day.setLunch(request.lunch());
        day.setAfternoonSnack(request.afternoonSnack());
        day.setDinner(request.dinner());
        day.setSupplements(request.supplements());
        day.setTips(request.tips());
        return MealPlanDtos.toDto(mealDayRepository.save(day));
    }

    @Transactional
    public void deleteDay(User user, Long planId, int dayNumber) {
        findOwned(user, planId);
        MealDay day = mealDayRepository.findByMealPlanIdAndDayNumber(planId, dayNumber)
                .orElseThrow(() -> ApiException.notFound("找不到此餐單日"));
        mealDayRepository.delete(day);
    }

    private MealPlan findOwned(User user, Long id) {
        return mealPlanRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此餐單"));
    }

    private MealPlan findAccessible(User user, Long id) {
        return mealPlanRepository.findById(id)
                .filter(p -> p.isTemplate()
                        || (p.getUser() != null && p.getUser().getId().equals(user.getId())))
                .orElseThrow(() -> ApiException.notFound("找不到此餐單"));
    }

    private static void apply(MealPlan plan, MealPlanRequest request) {
        plan.setName(request.name());
        plan.setDescription(request.description());
        if (request.durationDays() != null) {
            plan.setDurationDays(request.durationDays());
        }
    }
}
