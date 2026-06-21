package com.gymapp.mealplan;

import com.gymapp.common.ApiException;
import com.gymapp.excel.ExcelService;
import com.gymapp.excel.ExcelService.ParsedMealDay;
import com.gymapp.mealplan.MealPlanDtos.MealDayDto;
import com.gymapp.mealplan.MealPlanDtos.MealDayRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanDetailDto;
import com.gymapp.mealplan.MealPlanDtos.MealPlanRequest;
import com.gymapp.mealplan.MealPlanDtos.MealPlanSummaryDto;
import com.gymapp.user.User;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final MealDayRepository mealDayRepository;
    private final ExcelService excelService;

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
        if (!mealPlanRepository.existsByUserIdAndActiveTrue(user.getId())) {
            plan.setActive(true);
        }
        return MealPlanDtos.toSummaryDto(mealPlanRepository.save(plan));
    }

    @Transactional
    public MealPlanSummaryDto activate(User user, Long id) {
        MealPlan plan = findOwned(user, id);
        mealPlanRepository.findByUserIdAndActiveTrue(user.getId()).forEach(p -> {
            if (!p.getId().equals(plan.getId())) {
                p.setActive(false);
                mealPlanRepository.save(p);
            }
        });
        mealPlanRepository.flush();
        plan.setActive(true);
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
        MealPlan plan = findOwned(user, id);
        boolean wasActive = plan.isActive();
        mealPlanRepository.delete(plan);
        mealPlanRepository.flush();
        if (wasActive) {
            mealPlanRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                    .findFirst()
                    .ifPresent(p -> {
                        p.setActive(true);
                        mealPlanRepository.save(p);
                    });
        }
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
        if (!mealPlanRepository.existsByUserIdAndActiveTrue(user.getId())) {
            copy.setActive(true);
        }
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

    public byte[] excelTemplate() {
        return excelService.mealTemplate();
    }

    @Transactional
    public MealPlanDetailDto importFromExcel(User user, String name, byte[] bytes) {
        List<ParsedMealDay> parsed = excelService.parseMeals(bytes);
        int maxDay = parsed.stream().mapToInt(ParsedMealDay::dayNumber).max().orElse(0);

        MealPlan plan = new MealPlan();
        plan.setUser(user);
        plan.setName(name != null && !name.isBlank()
                ? name.strip()
                : "匯入的餐單 " + LocalDate.now());
        plan.setDurationDays(Math.max(maxDay, 1));
        plan.setTemplate(false);
        if (!mealPlanRepository.existsByUserIdAndActiveTrue(user.getId())) {
            plan.setActive(true);
        }
        MealPlan saved = mealPlanRepository.save(plan);

        for (ParsedMealDay pd : parsed) {
            MealDay day = new MealDay();
            day.setMealPlan(saved);
            day.setDayNumber(pd.dayNumber());
            day.setWeekNumber(pd.weekNumber());
            day.setDayOfWeek(pd.dayOfWeek());
            day.setBreakfast(pd.breakfast());
            day.setLunch(pd.lunch());
            day.setAfternoonSnack(pd.afternoonSnack());
            day.setDinner(pd.dinner());
            day.setSupplements(pd.supplements());
            day.setTips(pd.tips());
            mealDayRepository.save(day);
        }
        return MealPlanDtos.toDetailDto(
                saved, mealDayRepository.findByMealPlanIdOrderByDayNumberAsc(saved.getId()));
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
