package com.gymapp.progress;

import com.gymapp.common.ApiException;
import com.gymapp.program.ProgramService;
import com.gymapp.program.WorkoutProgram;
import com.gymapp.progress.ProgressDtos.DayLogDto;
import com.gymapp.progress.ProgressDtos.DayLogRequest;
import com.gymapp.progress.ProgressDtos.WeeklyReviewDto;
import com.gymapp.progress.ProgressDtos.WeeklyReviewRequest;
import com.gymapp.user.User;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final ProgramService programService;
    private final DayLogRepository dayLogRepository;
    private final WeeklyReviewRepository weeklyReviewRepository;

    public List<DayLogDto> listDayLogs(User user, Long programId) {
        programService.findOwned(user, programId);
        return dayLogRepository.findByProgramIdOrderByDayNumberAsc(programId).stream()
                .map(ProgressDtos::toDto)
                .toList();
    }

    @Transactional
    public DayLogDto upsertDayLog(User user, Long programId, int dayNumber, DayLogRequest request) {
        WorkoutProgram program = programService.findOwned(user, programId);
        if (dayNumber < 1 || dayNumber > program.getDurationDays()) {
            throw ApiException.badRequest("天數超出計劃範圍");
        }
        DayLog log = dayLogRepository.findByProgramIdAndDayNumber(programId, dayNumber)
                .orElseGet(() -> {
                    DayLog l = new DayLog();
                    l.setUser(user);
                    l.setProgram(program);
                    l.setDayNumber(dayNumber);
                    return l;
                });
        if (request.completed() != null) {
            boolean wasCompleted = log.isCompleted();
            log.setCompleted(request.completed());
            if (request.completed() && !wasCompleted) {
                log.setCompletedAt(Instant.now());
            } else if (!request.completed()) {
                log.setCompletedAt(null);
            }
        }
        if (request.workoutNotes() != null) {
            log.setWorkoutNotes(request.workoutNotes());
        }
        return ProgressDtos.toDto(dayLogRepository.save(log));
    }

    public List<WeeklyReviewDto> listWeeklyReviews(User user, Long programId) {
        programService.findOwned(user, programId);
        return weeklyReviewRepository.findByProgramIdOrderByWeekNumberAsc(programId).stream()
                .map(ProgressDtos::toDto)
                .toList();
    }

    @Transactional
    public WeeklyReviewDto upsertWeeklyReview(
            User user, Long programId, int weekNumber, WeeklyReviewRequest request) {
        WorkoutProgram program = programService.findOwned(user, programId);
        if (weekNumber < 0) {
            throw ApiException.badRequest("週數無效");
        }
        WeeklyReview review = weeklyReviewRepository
                .findByProgramIdAndWeekNumber(programId, weekNumber)
                .orElseGet(() -> {
                    WeeklyReview r = new WeeklyReview();
                    r.setUser(user);
                    r.setProgram(program);
                    r.setWeekNumber(weekNumber);
                    return r;
                });
        review.setLogDate(request.logDate());
        review.setWeightKg(request.weightKg());
        review.setWaistCm(request.waistCm());
        review.setStrengthProgress(request.strengthProgress());
        review.setMoodSleepSoreness(request.moodSleepSoreness());
        review.setReflection(request.reflection());
        return ProgressDtos.toDto(weeklyReviewRepository.save(review));
    }

    @Transactional
    public void deleteWeeklyReview(User user, Long programId, int weekNumber) {
        programService.findOwned(user, programId);
        WeeklyReview review = weeklyReviewRepository
                .findByProgramIdAndWeekNumber(programId, weekNumber)
                .orElseThrow(() -> ApiException.notFound("找不到此週記錄"));
        weeklyReviewRepository.delete(review);
    }
}
