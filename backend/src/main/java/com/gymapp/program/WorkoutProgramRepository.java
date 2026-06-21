package com.gymapp.program;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutProgramRepository extends JpaRepository<WorkoutProgram, Long> {

    List<WorkoutProgram> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<WorkoutProgram> findByUserIdAndActiveTrue(Long userId);

    boolean existsByUserIdAndActiveTrue(Long userId);

    List<WorkoutProgram> findByTemplateTrue();

    Optional<WorkoutProgram> findByIdAndTemplateTrue(Long id);

    Optional<WorkoutProgram> findByIdAndUserId(Long id, Long userId);
}
