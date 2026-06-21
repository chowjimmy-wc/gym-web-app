package com.gymapp.excel;

import com.gymapp.common.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/** Reads and writes the GymApp Excel import/template format. */
@Service
public class ExcelService {

    private static final Pattern EXERCISE_PATTERN =
            Pattern.compile("^\\s*(?:\\d+[.、)]\\s*)?(.+?)\\s+(\\d+\\s*[xX×]\\s*[\\d\\-~]+.*)$");

    public record ParsedExercise(String name, String setsReps) {}

    public record ParsedWorkoutDay(
            int dayNumber,
            Integer weekNumber,
            String dayOfWeek,
            String trainingType,
            String restAdvice,
            String cardio,
            String notes,
            List<ParsedExercise> exercises) {}

    public record ParsedMealDay(
            int dayNumber,
            Integer weekNumber,
            String dayOfWeek,
            String breakfast,
            String lunch,
            String afternoonSnack,
            String dinner,
            String supplements,
            String tips) {}

    private static final String[] WORKOUT_HEADERS = {
        "天數", "週次", "星期", "訓練類型", "具體動作與組數 (每行一個，例如：槓鈴臥推 4x6-8)",
        "休息時間建議", "有氧運動", "備註"
    };

    private static final String[] MEAL_HEADERS = {
        "天數", "週次", "星期", "早餐", "午餐", "下午茶", "晚餐", "訓練後/睡前補充", "備餐提示與技巧"
    };

    // ----- Template generation -----

    public byte[] workoutTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("課表");
            writeHeader(wb, sheet, WORKOUT_HEADERS);
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Day 1");
            example.createCell(1).setCellValue("第 1 週");
            example.createCell(2).setCellValue("星期一");
            example.createCell(3).setCellValue("上半身 (推+拉)");
            example.createCell(4).setCellValue("槓鈴臥推 4x6-8\n滑輪下拉 4x8-10\n坐姿划船 3x10-12");
            example.createCell(5).setCellValue("主項120秒，孤立60秒");
            example.createCell(6).setCellValue("");
            example.createCell(7).setCellValue("範例資料，匯入前可刪除或修改");
            autosize(sheet, WORKOUT_HEADERS.length);
            return toBytes(wb);
        } catch (IOException e) {
            throw ApiException.badRequest("無法產生範本：" + e.getMessage());
        }
    }

    public byte[] mealTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            XSSFSheet sheet = wb.createSheet("餐單");
            writeHeader(wb, sheet, MEAL_HEADERS);
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Day 1");
            example.createCell(1).setCellValue("第 1 週");
            example.createCell(2).setCellValue("星期一");
            example.createCell(3).setCellValue("全麥多士2片 + 炒蛋");
            example.createCell(4).setCellValue("烤雞胸 150g + 糙米飯 200g");
            example.createCell(5).setCellValue("希臘乳酪 + 藍莓");
            example.createCell(6).setCellValue("三文魚 + 蔬菜沙律");
            example.createCell(7).setCellValue("乳清蛋白 1 份");
            example.createCell(8).setCellValue("範例資料，匯入前可刪除或修改");
            autosize(sheet, MEAL_HEADERS.length);
            return toBytes(wb);
        } catch (IOException e) {
            throw ApiException.badRequest("無法產生範本：" + e.getMessage());
        }
    }

    // ----- Import parsing -----

    public List<ParsedWorkoutDay> parseWorkout(byte[] bytes) {
        List<ParsedWorkoutDay> result = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                int day = parseLeadingInt(cell(row, 0));
                if (day <= 0) continue;
                result.add(new ParsedWorkoutDay(
                        day,
                        nullableInt(cell(row, 1), (day - 1) / 7 + 1),
                        blankToNull(cell(row, 2)),
                        blankToNull(cell(row, 3)),
                        blankToNull(cell(row, 5)),
                        blankToNull(cell(row, 6)),
                        blankToNull(cell(row, 7)),
                        parseExercises(cell(row, 4))));
            }
        } catch (IOException | RuntimeException e) {
            throw ApiException.badRequest("無法讀取 Excel：請確認使用正確的訓練計劃範本。(" + e.getMessage() + ")");
        }
        if (result.isEmpty()) {
            throw ApiException.badRequest("Excel 中找不到有效的訓練日資料。");
        }
        return result;
    }

    public List<ParsedMealDay> parseMeals(byte[] bytes) {
        List<ParsedMealDay> result = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = wb.getSheetAt(0);
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                int day = parseLeadingInt(cell(row, 0));
                if (day <= 0) continue;
                result.add(new ParsedMealDay(
                        day,
                        nullableInt(cell(row, 1), (day - 1) / 7 + 1),
                        blankToNull(cell(row, 2)),
                        blankToNull(cell(row, 3)),
                        blankToNull(cell(row, 4)),
                        blankToNull(cell(row, 5)),
                        blankToNull(cell(row, 6)),
                        blankToNull(cell(row, 7)),
                        blankToNull(cell(row, 8))));
            }
        } catch (IOException | RuntimeException e) {
            throw ApiException.badRequest("無法讀取 Excel：請確認使用正確的餐單範本。(" + e.getMessage() + ")");
        }
        if (result.isEmpty()) {
            throw ApiException.badRequest("Excel 中找不到有效的餐單資料。");
        }
        return result;
    }

    private List<ParsedExercise> parseExercises(String cellValue) {
        List<ParsedExercise> exercises = new ArrayList<>();
        if (cellValue == null) return exercises;
        for (String raw : cellValue.split("\\r?\\n")) {
            String line = raw.strip();
            if (line.isEmpty()) continue;
            Matcher m = EXERCISE_PATTERN.matcher(line);
            if (m.matches()) {
                exercises.add(new ParsedExercise(m.group(1).strip(), m.group(2).strip()));
            } else {
                exercises.add(new ParsedExercise(line.replaceFirst("^\\s*\\d+[.、)]\\s*", ""), null));
            }
        }
        return exercises;
    }

    // ----- Helpers -----

    private void writeHeader(XSSFWorkbook wb, XSSFSheet sheet, String[] headers) {
        XSSFFont font = wb.createFont();
        font.setBold(true);
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private void autosize(XSSFSheet sheet, int columns) {
        for (int i = 0; i < columns; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private byte[] toBytes(Workbook wb) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.write(out);
            return out.toByteArray();
        }
    }

    private String cell(Row row, int index) {
        Cell c = row.getCell(index);
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield c.getStringCellValue();
                } catch (IllegalStateException e) {
                    yield String.valueOf(c.getNumericCellValue());
                }
            }
            default -> null;
        };
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private int parseLeadingInt(String value) {
        if (value == null) return 0;
        Matcher m = Pattern.compile("(\\d+)").matcher(value);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }

    private Integer nullableInt(String value, int fallback) {
        int parsed = parseLeadingInt(value);
        return parsed > 0 ? parsed : fallback;
    }
}
