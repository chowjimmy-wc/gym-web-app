package com.gymapp;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** End-to-end flow: register, login, defaults, template cloning, day editing, progress. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private String registerAndGetToken(String email) throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password123","displayName":"測試用戶"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/programs")).andExpect(status().isUnauthorized());
    }

    @Test
    void registerLoginAndDefaultNutritionTargets() throws Exception {
        String token = registerAndGetToken("user1@example.com");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user1@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.displayName").value("測試用戶"));

        // Default nutrition targets copied from the seeded templates
        mockMvc.perform(get("/api/v1/nutrition-targets")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)))
                .andExpect(jsonPath("$[0].item").value("基礎代謝率 (BMR)"));
    }

    @Test
    void cloneTemplateEditDayAndTrackProgress() throws Exception {
        String token = registerAndGetToken("user2@example.com");

        // Find seeded templates
        String templates = mockMvc.perform(get("/api/v1/templates")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.programs", hasSize(1)))
                .andExpect(jsonPath("$.mealPlans", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        JsonNode templatesJson = objectMapper.readTree(templates);
        long programTemplateId = templatesJson.get("programs").get(0).get("id").asLong();
        long mealTemplateId = templatesJson.get("mealPlans").get(0).get("id").asLong();

        // Clone the workout program template
        String program = mockMvc.perform(post("/api/v1/programs/from-template/" + programTemplateId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days", hasSize(60)))
                .andExpect(jsonPath("$.days[0].exercises", hasSize(greaterThan(0))))
                .andReturn().getResponse().getContentAsString();
        long programId = objectMapper.readTree(program).get("id").asLong();

        // Clone the meal plan template
        mockMvc.perform(post("/api/v1/meal-plans/from-template/" + mealTemplateId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days", hasSize(60)));

        // Edit day 1 exercises
        mockMvc.perform(put("/api/v1/programs/" + programId + "/days/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"trainingType":"上半身 (推+拉)","restAdvice":"90秒",
                                 "exercises":[{"name":"啞鈴臥推","setsReps":"4x8-10"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises", hasSize(1)))
                .andExpect(jsonPath("$.exercises[0].name").value("啞鈴臥推"));

        // Mark day 1 complete
        mockMvc.perform(put("/api/v1/programs/" + programId + "/day-logs/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true,\"workoutNotes\":\"狀態不錯\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        // Record a weekly review
        mockMvc.perform(put("/api/v1/programs/" + programId + "/weekly-reviews/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightKg\":72.5,\"waistCm\":80,\"reflection\":\"進步中\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weightKg").value(72.5));

        // Another user must not see this program
        String otherToken = registerAndGetToken("user3@example.com");
        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }
}
