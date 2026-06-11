package com.gymapp.progress;

import com.gymapp.progress.ProgressDtos.DayLogDto;
import com.gymapp.progress.ProgressDtos.DayLogRequest;
import com.gymapp.progress.ProgressDtos.WeeklyReviewDto;
import com.gymapp.progress.ProgressDtos.WeeklyReviewRequest;
import com.gymapp.user.User;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/programs/{programId}")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/day-logs")
    public List<DayLogDto> listDayLogs(
            @AuthenticationPrincipal User user, @PathVariable Long programId) {
        return progressService.listDayLogs(user, programId);
    }

    @PutMapping("/day-logs/{dayNumber}")
    public DayLogDto upsertDayLog(
            @AuthenticationPrincipal User user,
            @PathVariable Long programId,
            @PathVariable int dayNumber,
            @Valid @RequestBody DayLogRequest request) {
        return progressService.upsertDayLog(user, programId, dayNumber, request);
    }

    @GetMapping("/weekly-reviews")
    public List<WeeklyReviewDto> listWeeklyReviews(
            @AuthenticationPrincipal User user, @PathVariable Long programId) {
        return progressService.listWeeklyReviews(user, programId);
    }

    @PutMapping("/weekly-reviews/{weekNumber}")
    public WeeklyReviewDto upsertWeeklyReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long programId,
            @PathVariable int weekNumber,
            @Valid @RequestBody WeeklyReviewRequest request) {
        return progressService.upsertWeeklyReview(user, programId, weekNumber, request);
    }

    @DeleteMapping("/weekly-reviews/{weekNumber}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWeeklyReview(
            @AuthenticationPrincipal User user,
            @PathVariable Long programId,
            @PathVariable int weekNumber) {
        progressService.deleteWeeklyReview(user, programId, weekNumber);
    }
}
