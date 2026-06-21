package com.gymapp.library;

import com.gymapp.common.ApiException;
import com.gymapp.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/v1/workout-activities")
@RequiredArgsConstructor
public class WorkoutActivityController {

    private final WorkoutActivityRepository repository;

    public record ActivityRequest(String category, @NotBlank String name, String notes) {}

    public record ActivityDto(Long id, String category, String name, String notes) {}

    @GetMapping
    public List<ActivityDto> list(@AuthenticationPrincipal User user) {
        return repository.findByUserIdOrderByCategoryAscNameAsc(user.getId()).stream()
                .map(WorkoutActivityController::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ActivityDto create(
            @AuthenticationPrincipal User user, @Valid @RequestBody ActivityRequest request) {
        WorkoutActivity activity = new WorkoutActivity();
        activity.setUser(user);
        apply(activity, request);
        return toDto(repository.save(activity));
    }

    @PutMapping("/{id}")
    public ActivityDto update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody ActivityRequest request) {
        WorkoutActivity activity = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此動作"));
        apply(activity, request);
        return toDto(repository.save(activity));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        WorkoutActivity activity = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此動作"));
        repository.delete(activity);
    }

    private static void apply(WorkoutActivity activity, ActivityRequest request) {
        activity.setCategory(request.category());
        activity.setName(request.name());
        activity.setNotes(request.notes());
    }

    private static ActivityDto toDto(WorkoutActivity a) {
        return new ActivityDto(a.getId(), a.getCategory(), a.getName(), a.getNotes());
    }
}
