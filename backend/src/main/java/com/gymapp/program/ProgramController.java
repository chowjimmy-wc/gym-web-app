package com.gymapp.program;

import com.gymapp.program.ProgramDtos.DayDto;
import com.gymapp.program.ProgramDtos.DayRequest;
import com.gymapp.program.ProgramDtos.ProgramDetailDto;
import com.gymapp.program.ProgramDtos.ProgramRequest;
import com.gymapp.program.ProgramDtos.ProgramSummaryDto;
import com.gymapp.user.User;
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/programs")
@RequiredArgsConstructor
public class ProgramController {

    private final ProgramService programService;

    @GetMapping
    public List<ProgramSummaryDto> list(@AuthenticationPrincipal User user) {
        return programService.listForUser(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProgramSummaryDto create(
            @AuthenticationPrincipal User user, @Valid @RequestBody ProgramRequest request) {
        return programService.create(user, request);
    }

    @PostMapping("/from-template/{templateId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ProgramDetailDto cloneTemplate(
            @AuthenticationPrincipal User user, @PathVariable Long templateId) {
        return programService.cloneTemplate(user, templateId);
    }

    @GetMapping("/{id}")
    public ProgramDetailDto get(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return programService.getDetail(user, id);
    }

    @PutMapping("/{id}")
    public ProgramSummaryDto update(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @Valid @RequestBody ProgramRequest request) {
        return programService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        programService.delete(user, id);
    }

    @PutMapping("/{id}/days/{dayNumber}")
    public DayDto upsertDay(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @PathVariable int dayNumber,
            @Valid @RequestBody DayRequest request) {
        return programService.upsertDay(user, id, dayNumber, request);
    }

    @DeleteMapping("/{id}/days/{dayNumber}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDay(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @PathVariable int dayNumber) {
        programService.deleteDay(user, id, dayNumber);
    }
}
