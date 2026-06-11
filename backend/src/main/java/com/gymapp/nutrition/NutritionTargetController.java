package com.gymapp.nutrition;

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
@RequestMapping("/api/v1/nutrition-targets")
@RequiredArgsConstructor
public class NutritionTargetController {

    private final NutritionTargetRepository repository;

    public record NutritionTargetRequest(
            @NotBlank String item, String value, String note, Integer sortOrder) {}

    public record NutritionTargetDto(
            Long id, String item, String value, String note, int sortOrder) {}

    @GetMapping
    public List<NutritionTargetDto> list(@AuthenticationPrincipal User user) {
        return repository.findByUserIdOrderBySortOrderAsc(user.getId()).stream()
                .map(NutritionTargetController::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NutritionTargetDto create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody NutritionTargetRequest request) {
        NutritionTarget target = new NutritionTarget();
        target.setUser(user);
        apply(target, request);
        return toDto(repository.save(target));
    }

    @PutMapping("/{id}")
    public NutritionTargetDto update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody NutritionTargetRequest request) {
        NutritionTarget target = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此營養目標"));
        apply(target, request);
        return toDto(repository.save(target));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        NutritionTarget target = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此營養目標"));
        repository.delete(target);
    }

    private static void apply(NutritionTarget target, NutritionTargetRequest request) {
        target.setItem(request.item());
        target.setValue(request.value());
        target.setNote(request.note());
        target.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
    }

    private static NutritionTargetDto toDto(NutritionTarget t) {
        return new NutritionTargetDto(
                t.getId(), t.getItem(), t.getValue(), t.getNote(), t.getSortOrder());
    }
}
