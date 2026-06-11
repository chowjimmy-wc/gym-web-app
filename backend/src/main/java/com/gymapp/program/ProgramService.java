package com.gymapp.program;

import com.gymapp.common.ApiException;
import com.gymapp.program.ProgramDtos.DayRequest;
import com.gymapp.program.ProgramDtos.ProgramDetailDto;
import com.gymapp.program.ProgramDtos.ProgramRequest;
import com.gymapp.program.ProgramDtos.ProgramSummaryDto;
import com.gymapp.user.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgramService {

    private final WorkoutProgramRepository programRepository;
    private final WorkoutDayRepository dayRepository;

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
        programRepository.delete(findOwned(user, id));
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
