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
@RequestMapping("/api/v1/meal-items")
@RequiredArgsConstructor
public class MealItemController {

    private final MealItemRepository repository;

    public record MealItemRequest(@NotBlank String name, String cookingMethod) {}

    public record MealItemDto(Long id, String name, String cookingMethod) {}

    @GetMapping
    public List<MealItemDto> list(@AuthenticationPrincipal User user) {
        return repository.findByUserIdOrderByNameAsc(user.getId()).stream()
                .map(MealItemController::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MealItemDto create(
            @AuthenticationPrincipal User user, @Valid @RequestBody MealItemRequest request) {
        MealItem item = new MealItem();
        item.setUser(user);
        apply(item, request);
        return toDto(repository.save(item));
    }

    @PutMapping("/{id}")
    public MealItemDto update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody MealItemRequest request) {
        MealItem item = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此菜式"));
        apply(item, request);
        return toDto(repository.save(item));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        MealItem item = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> ApiException.notFound("找不到此菜式"));
        repository.delete(item);
    }

    private static void apply(MealItem item, MealItemRequest request) {
        item.setName(request.name());
        item.setCookingMethod(request.cookingMethod());
    }

    private static MealItemDto toDto(MealItem i) {
        return new MealItemDto(i.getId(), i.getName(), i.getCookingMethod());
    }
}
