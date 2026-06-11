package com.gymapp.auth;

import com.gymapp.auth.AuthDtos.AuthResponse;
import com.gymapp.auth.AuthDtos.LoginRequest;
import com.gymapp.auth.AuthDtos.RegisterRequest;
import com.gymapp.auth.AuthDtos.UserDto;
import com.gymapp.common.ApiException;
import com.gymapp.nutrition.NutritionTarget;
import com.gymapp.nutrition.NutritionTargetRepository;
import com.gymapp.nutrition.NutritionTargetTemplateRepository;
import com.gymapp.security.JwtService;
import com.gymapp.user.User;
import com.gymapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final NutritionTargetRepository nutritionTargetRepository;
    private final NutritionTargetTemplateRepository templateRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("此電子郵件已被註冊");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName().trim());
        user = userRepository.save(user);

        // Copy the default nutrition targets into the new account
        User savedUser = user;
        templateRepository.findAllByOrderBySortOrderAsc().forEach(template -> {
            NutritionTarget target = new NutritionTarget();
            target.setUser(savedUser);
            target.setItem(template.getItem());
            target.setValue(template.getValue());
            target.setNote(template.getNote());
            target.setSortOrder(template.getSortOrder());
            nutritionTargetRepository.save(target);
        });

        return new AuthResponse(jwtService.generateToken(user), toDto(user));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> ApiException.unauthorized("電子郵件或密碼錯誤"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("電子郵件或密碼錯誤");
        }
        return new AuthResponse(jwtService.generateToken(user), toDto(user));
    }

    public static UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getEmail(), user.getDisplayName());
    }
}
