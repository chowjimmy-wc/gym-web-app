package com.gymapp.progress;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DayLogRepository extends JpaRepository<DayLog, Long> {

    List<DayLog> findByProgramIdOrderByDayNumberAsc(Long programId);

    Optional<DayLog> findByProgramIdAndDayNumber(Long programId, int dayNumber);

    long countByProgramIdAndCompletedTrue(Long programId);
}
