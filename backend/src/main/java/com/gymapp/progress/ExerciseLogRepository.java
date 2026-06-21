package com.gymapp.progress;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExerciseLogRepository extends JpaRepository<ExerciseLog, Long> {

    @Query("SELECT el FROM ExerciseLog el WHERE el.exercise.day.program.id = :programId")
    List<ExerciseLog> findByProgramId(@Param("programId") Long programId);

    Optional<ExerciseLog> findByExerciseId(Long exerciseId);
}
