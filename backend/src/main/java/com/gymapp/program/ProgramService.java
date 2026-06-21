package com.gymapp.program;

import com.gymapp.common.ApiException;
import com.gymapp.excel.ExcelService;
import com.gymapp.excel.ExcelService.ParsedWorkoutDay;
import com.gymapp.program.ProgramDtos.DayRequest;
import com.gymapp.program.ProgramDtos.ProgramDetailDto;
import com.gymapp.program.ProgramDtos.ProgramRequest;
import com.gymapp.program.ProgramDtos.ProgramSummaryDto;
import com.gymapp.user.User;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private final WorkoutProgramRepository programRepository;
    private final WorkoutDayRepository dayRepository;
    private final ExcelService excelService;

    public List<ProgramSummaryDto> listForUser(User user) {
        return programRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(ProgramDtos::toSummaryDto)
                .toList();
    }

    public List<ProgramSummaryDto> listTemplates() {
        return programRepository.findByTemplateTrue().stream()
                .map(ProgramDtos::toSummaryDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgramDetailDto getDetail(User user, Long id) {
        WorkoutProgram program = findAccessible(user, id);
        return ProgramDtos.toDetailDto(
                program, dayRepository.findByProgramIdOrderByDayNumberAsc(program.getId()));
    }

    @Transactional
    public ProgramSummaryDto create(User user, ProgramRequest request) {
        WorkoutProgram program = new WorkoutProgram();
        program.setUser(user);
        apply(program, request);
        // First program a user owns becomes the active one automatically
        if (!programRepository.existsByUserIdAndActiveTrue(user.getId())) {
            program.setActive(true);
        }
        return ProgramDtos.toSummaryDto(programRepository.save(program));
    }

    @Transactional
    public ProgramSummaryDto activate(User user, Long id) {
        WorkoutProgram program = findOwned(user, id);
        // Clear the currently active program(s) for this user, flush, then activate this one.
        // The flush guarantees the unique partial index sees the clears before the new active.
        programRepository.findByUserIdAndActiveTrue(user.getId()).forEach(p -> {
            if (!p.getId().equals(program.getId())) {
                p.setActive(false);
                programRepository.save(p);
            }
        });
        programRepository.flush();
        program.setActive(true);
        return ProgramDtos.toSummaryDto(programRepository.save(program));
    }

    @Transactional
    public ProgramSummaryDto update(User user, Long id, ProgramRequest request) {
        WorkoutProgram program = findOwned(user, id);
        apply(program, request);
        return ProgramDtos.toSummaryDto(programRepository.save(program));
    }

    @Transactional
    public void delete(User user, Long id) {
        WorkoutProgram program = findOwned(user, id);
        boolean wasActive = program.isActive();
        programRepository.delete(program);
        programRepository.flush();
        // Promote the most recent remaining program to active
        if (wasActive) {
            programRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                    .findFirst()
                    .ifPresent(p -> {
                        p.setActive(true);
                        programRepository.save(p);
                    });
        }
    }

    @Transactional
    public ProgramDetailDto cloneTemplate(User user, Long templateId) {
        WorkoutProgram template = programRepository.findByIdAndTemplateTrue(templateId)
                .orElseThrow(() -> ApiException.notFound("找不到此範本"));

        WorkoutProgram copy = new WorkoutProgram();
        copy.setUser(user);
        copy.setName(template.getName());
        copy.setDescription(template.getDescription());
        copy.setDurationDays(template.getDurationDays());
        copy.setStatus(WorkoutProgram.Status.DRAFT);
        copy.setTemplate(false);
        if (!programRepository.existsByUserIdAndActiveTrue(user.getId())) {
            copy.setActive(true);
        }
        copy = programRepository.save(copy);

        for (WorkoutDay day : dayRepository.findByProgramIdOrderByDayNumberAsc(templateId)) {
            WorkoutDay dayCopy = new WorkoutDay();
            dayCopy.setProgram(copy);
            dayCopy.setDayNumber(day.getDayNumber());
            dayCopy.setWeekNumber(day.getWeekNumber());
            dayCopy.setDayOfWeek(day.getDayOfWeek());
            dayCopy.setTrainingType(day.getTrainingType());
            dayCopy.setRestAdvice(day.getRestAdvice());
            dayCopy.setCardio(day.getCardio());
            dayCopy.setNotes(day.getNotes());
            for (WorkoutExercise exercise : day.getExercises()) {
                WorkoutExercise exerciseCopy = new WorkoutExercise();
                exerciseCopy.setDay(dayCopy);
                exerciseCopy.setSortOrder(exercise.getSortOrder());
                exerciseCopy.setName(exercise.getName());
                exerciseCopy.setSetsReps(exercise.getSetsReps());
                dayCopy.getExercises().add(exerciseCopy);
            }
            dayRepository.save(dayCopy);
        }
        return ProgramDtos.toDetailDto(
                copy, dayRepository.findByProgramIdOrderByDayNumberAsc(copy.getId()));
    }

    public byte[] excelTemplate() {
        return excelService.workoutTemplate();
    }

    @Transactional
    public ProgramDetailDto importFromExcel(User user, String name, byte[] bytes) {
        List<ParsedWorkoutDay> parsed = excelService.parseWorkout(bytes);
        int maxDay = parsed.stream().mapToInt(ParsedWorkoutDay::dayNumber).max().orElse(0);

        WorkoutProgram program = new WorkoutProgram();
        program.setUser(user);
        program.setName(name != null && !name.isBlank()
                ? name.strip()
                : "匯入的訓練計劃 " + LocalDate.now());
        program.setDurationDays(Math.max(maxDay, 1));
        program.setStatus(WorkoutProgram.Status.DRAFT);
        program.setTemplate(false);
        if (!programRepository.existsByUserIdAndActiveTrue(user.getId())) {
            program.setActive(true);
        }
        WorkoutProgram saved = programRepository.save(program);

        for (ParsedWorkoutDay pd : parsed) {
            WorkoutDay day = new WorkoutDay();
            day.setProgram(saved);
            day.setDayNumber(pd.dayNumber());
            day.setWeekNumber(pd.weekNumber());
            day.setDayOfWeek(pd.dayOfWeek());
            day.setTrainingType(pd.trainingType());
            day.setRestAdvice(pd.restAdvice());
            day.setCardio(pd.cardio());
            day.setNotes(pd.notes());
            int order = 0;
            for (var ex : pd.exercises()) {
                WorkoutExercise exercise = new WorkoutExercise();
                exercise.setDay(day);
                exercise.setSortOrder(order++);
                exercise.setName(ex.name());
                exercise.setSetsReps(ex.setsReps());
                day.getExercises().add(exercise);
            }
            dayRepository.save(day);
        }
        return ProgramDtos.toDetailDto(
                saved, dayRepository.findByProgramIdOrderByDayNumberAsc(saved.getId()));
    }

    @Transactional
    public ProgramDtos.DayDto upsertDay(User user, Long programId, int dayNumber, DayRequest request) {
        WorkoutProgram program = findOwned(user, programId);
        if (dayNumber < 1 || dayNumber > program.getDurationDays()) {
            throw ApiException.badRequest("天數超出計劃範圍");
        }
        WorkoutDay day = dayRepository.findByProgramIdAndDayNumber(programId, dayNumber)
                .orElseGet(() -> {
                    WorkoutDay d = new WorkoutDay();
                    d.setProgram(program);
                    d.setDayNumber(dayNumber);
                    return d;
                });
        day.setWeekNumber(request.weekNumber() != null
                ? request.weekNumber()
                : (dayNumber - 1) / 7 + 1);
        day.setDayOfWeek(request.dayOfWeek());
        day.setTrainingType(request.trainingType());
        day.setRestAdvice(request.restAdvice());
        day.setCardio(request.cardio());
        day.setNotes(request.notes());
        day.getExercises().clear();
        if (request.exercises() != null) {
            int order = 0;
            for (ProgramDtos.ExerciseRequest er : request.exercises()) {
                WorkoutExercise exercise = new WorkoutExercise();
                exercise.setDay(day);
                exercise.setSortOrder(order++);
                exercise.setName(er.name());
                exercise.setSetsReps(er.setsReps());
                day.getExercises().add(exercise);
            }
        }
        return ProgramDtos.toDto(dayRepository.save(day));
    }

    @Transactional
    public void deleteDay(User user, Long programId, int dayNumber) {
        findOwned(user, programId);
        WorkoutDay day = dayRepository.findByProgramIdAndDayNumber(programId, dayNumber)
                .orElseThrow(() -> ApiException.notFound("找不到此訓練日"));
        dayRepository.delete(day);
    }

    public WorkoutProgram findOwned(User user, Long id) {
        return programRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此訓練計劃"));
    }

    /** Owner or system template. */
    WorkoutProgram findAccessible(User user, Long id) {
        return programRepository.findById(id)
                .filter(p -> p.isTemplate()
                        || (p.getUser() != null && p.getUser().getId().equals(user.getId())))
                .orElseThrow(() -> ApiException.notFound("找不到此訓練計劃"));
    }

    private static void apply(WorkoutProgram program, ProgramRequest request) {
        program.setName(request.name());
        program.setDescription(request.description());
        if (request.durationDays() != null) {
            program.setDurationDays(request.durationDays());
        }
        program.setStartDate(request.startDate());
        if (request.status() != null) {
            program.setStatus(request.status());
        }
    }
}
