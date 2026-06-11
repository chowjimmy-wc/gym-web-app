const SHEET_NUTRITION = "1.營養與熱量目標";
const SHEET_WORKOUT = "2.60天詳細課表";
const SHEET_MEALS = "3.60天詳細餐單";
const SHEET_PROGRESS = "4.進度追蹤與檢討";

let plan = null;
let progress = null;

function maxDays() {
  if (!plan) return 60;
  const workouts = plan.sheets[SHEET_WORKOUT] || [];
  const days = workouts.map((r) => dayNum(r["天數"])).filter(Boolean);
  return days.length ? Math.max(...days) : 60;
}

async function reloadPlan() {
  plan = await fetch("/api/plan").then((r) => r.json());
  if (typeof renderManage === "function") renderManage();
}

const MEAL_FIELDS = [
  ["早餐", "早餐"],
  ["午餐 (可提早備餐)", "午餐"],
  ["下午茶 (約15:00)", "下午茶"],
  ["晚餐", "晚餐"],
  ["訓練後/睡前補充", "訓練後/睡前"],
  ["備餐提示與風味", "備餐提示"],
];

async function init() {
  [plan, progress] = await Promise.all([
    fetch("/api/plan").then((r) => r.json()),
    fetch("/api/progress").then((r) => r.json()),
  ]);
  bindTabs();
  bindControls();
  renderAll();
  if (typeof initManage === "function") initManage();
}

function bindTabs() {
  document.querySelectorAll("nav.tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "manage" && typeof fetchManageList === "function") {
        fetchManageList();
      }
    });
  });
}

function bindControls() {
  document.getElementById("btn-prev").addEventListener("click", () => changeDay(-1));
  document.getElementById("btn-next").addEventListener("click", () => changeDay(1));
  document.getElementById("btn-complete-day").addEventListener("click", toggleDayComplete);
  document.getElementById("btn-save-notes").addEventListener("click", saveWorkoutNotes);
  document.getElementById("btn-save-start").addEventListener("click", saveStartDate);
  document.getElementById("btn-save-plan").addEventListener("click", saveCustomPlan);
  document.getElementById("btn-reset-plan").addEventListener("click", resetCustomPlan);
  document.getElementById("btn-add-exercise").addEventListener("click", addPlannerExercise);
  document.getElementById("planner-day-select").addEventListener("change", loadPlannerDay);
}

function dayNum(dayStr) {
  const m = (dayStr || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getWorkout(day) {
  return (plan.sheets[SHEET_WORKOUT] || []).find((r) => dayNum(r["天數"]) === day) || null;
}

function getMeal(day) {
  return plan.sheets[SHEET_MEALS].find((r) => dayNum(r["天數"]) === day) || null;
}

function isRestDay(workout) {
  if (!workout) return true;
  const t = workout["訓練類型"] || "";
  return t.includes("休息");
}

function parseExercises(text) {
  if (!text) return [];
  return text.split("\n").filter(Boolean).map((line, i) => {
    const m = line.match(/^\d+\.\s*(.+?)\s+(\d+)x(.+)$/);
    if (!m) return { index: i, name: line.replace(/^\d+\.\s*/, ""), sets: 1, reps: "-", raw: line };
    return { index: i, name: m[1].trim(), sets: parseInt(m[2], 10), reps: m[3].trim(), raw: line };
  });
}

function exercisesToText(exercises) {
  return exercises
    .filter((e) => e.name.trim())
    .map((e, i) => `${i + 1}. ${e.name.trim()} ${e.sets}x${e.reps}`)
    .join("\n");
}

function getDayLog(day) {
  if (!progress.day_logs[String(day)]) {
    progress.day_logs[String(day)] = { completed: false, sets: {}, notes: "" };
  }
  return progress.day_logs[String(day)];
}

function getSetState(day, exIndex, setIndex) {
  const log = getDayLog(day);
  const key = String(exIndex);
  if (!log.sets[key]) log.sets[key] = [];
  return !!log.sets[key][setIndex];
}

function toggleSet(day, exIndex, setIndex) {
  const log = getDayLog(day);
  const key = String(exIndex);
  if (!log.sets[key]) log.sets[key] = [];
  log.sets[key][setIndex] = !log.sets[key][setIndex];
  saveProgress();
  renderWorkout();
  renderToday();
  renderCalendar();
}

function workoutProgress(day) {
  const w = getWorkout(day);
  if (!w || isRestDay(w)) return w ? 100 : 0;
  const exercises = parseExercises(w["具體動作與組數"]);
  if (!exercises.length) return 0;
  let total = 0;
  let done = 0;
  exercises.forEach((ex) => {
    for (let s = 0; s < ex.sets; s++) {
      total++;
      if (getSetState(day, ex.index, s)) done++;
    }
  });
  return total ? Math.round((done / total) * 100) : 0;
}

function changeDay(delta) {
  progress.current_day = Math.max(1, Math.min(maxDays(), progress.current_day + delta));
  saveProgress();
  renderAll();
}

function toggleDayComplete() {
  const log = getDayLog(progress.current_day);
  log.completed = !log.completed;
  saveProgress();
  renderToday();
  renderCalendar();
  toast(log.completed ? "已標記完成！" : "已取消完成標記");
}

function saveWorkoutNotes() {
  const log = getDayLog(progress.current_day);
  log.notes = document.getElementById("workout-notes").value;
  saveProgress();
  toast("備註已儲存");
}

function saveStartDate() {
  progress.start_date = document.getElementById("start-date").value || null;
  saveProgress();
  renderCalendar();
  toast("開始日期已儲存");
}

async function saveProgress() {
  await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(progress),
  });
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2000);
}

function renderAll() {
  renderHeader();
  renderToday();
  renderWorkout();
  renderMeals();
  renderCalendar();
  renderProgress();
  renderPlanner();
  renderNutrition();
}

function renderHeader() {
  document.getElementById("header-day").textContent = `Day ${progress.current_day} / ${maxDays()}`;
  const sub = document.querySelector("header .subtitle");
  if (sub && plan?.title) sub.textContent = plan.title;
}

function renderToday() {
  const day = progress.current_day;
  const w = getWorkout(day);
  const m = getMeal(day);

  document.getElementById("today-title").textContent = w
    ? `${w["天數"]} — ${w["週次"]} ${w["星期"]}`
    : `Day ${day}`;

  const type = w ? w["訓練類型"] : "";
  document.getElementById("today-type").textContent = type;

  const pct = workoutProgress(day);
  const log = getDayLog(day);
  document.getElementById("today-progress").style.width = `${log.completed ? 100 : pct}%`;
  document.getElementById("today-progress-text").textContent = log.completed
    ? "✓ 今日已標記完成"
    : isRestDay(w)
      ? "休息日"
      : `訓練完成度：${pct}%`;

  const stats = document.getElementById("today-stats");
  const nutrition = plan.sheets[SHEET_NUTRITION];
  const targets = ["增肌目標熱量", "蛋白質 (Protein)", "脂肪 (Fat)", "碳水化合物 (Carbs)"];
  stats.innerHTML = nutrition
    .filter((n) => targets.some((t) => (n["項目"] || "").includes(t.split(" ")[0])))
    .map(
      (n) => `
    <div class="stat">
      <div class="label">${esc(n["項目"])}</div>
      <div class="value">${esc(n["數據/計算結果"])}</div>
    </div>`
    )
    .join("");

  const wSummary = document.getElementById("today-workout-summary");
  if (!w || isRestDay(w)) {
    wSummary.innerHTML = `<p class="rest-day"><div class="icon">🧘</div>${esc(w ? w["具體動作與組數"] : "無資料")}</p>`;
  } else {
    const exercises = parseExercises(w["具體動作與組數"]);
    wSummary.innerHTML = exercises
      .map((ex) => `<div>• ${esc(ex.name)} <span class="muted">${ex.sets}×${esc(ex.reps)}</span></div>`)
      .join("");
  }

  const mSummary = document.getElementById("today-meal-summary");
  if (!m) {
    mSummary.innerHTML = "<p class='muted'>無餐單資料</p>";
  } else {
    mSummary.innerHTML = MEAL_FIELDS.slice(0, 5)
      .filter(([key]) => m[key])
      .map(([key, label]) => `<div class="meal"><div class="meal-time">${label}</div>${esc(m[key])}</div>`)
      .join("");
  }

  document.getElementById("btn-complete-day").textContent = log.completed
    ? "取消完成標記"
    : "標記今日完成";
}

function renderWorkout() {
  const day = progress.current_day;
  const w = getWorkout(day);
  const container = document.getElementById("workout-exercises");

  if (!w) {
    container.innerHTML = "<div class='card'><p class='muted'>無訓練資料</p></div>";
    return;
  }

  document.getElementById("workout-title").textContent = `${w["天數"]} — ${w["訓練類型"]}`;
  document.getElementById("workout-rest-hint").textContent = w["休息時間建議"]
    ? `休息建議：${w["休息時間建議"]}`
    : "";

  const log = getDayLog(day);
  document.getElementById("workout-notes").value = log.notes || "";

  if (isRestDay(w)) {
    container.innerHTML = `
      <div class="card rest-day">
        <div class="icon">🧘</div>
        <h3>休息日</h3>
        <p>${esc(w["具體動作與組數"])}</p>
      </div>`;
    return;
  }

  const exercises = parseExercises(w["具體動作與組數"]);
  container.innerHTML = exercises
    .map((ex) => {
      const sets = Array.from({ length: ex.sets }, (_, s) => {
        const done = getSetState(day, ex.index, s);
        return `<button class="set-btn${done ? " done" : ""}" data-ex="${ex.index}" data-set="${s}">${s + 1}</button>`;
      }).join("");
      return `
      <div class="exercise">
        <div class="exercise-header">
          <div>
            <div class="exercise-name">${esc(ex.name)}</div>
            <div class="exercise-meta">${ex.sets} 組 × ${esc(ex.reps)} 次</div>
          </div>
        </div>
        <div class="sets-row">${sets}</div>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".set-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleSet(day, parseInt(btn.dataset.ex, 10), parseInt(btn.dataset.set, 10));
    });
  });
}

function renderMeals() {
  const day = progress.current_day;
  const m = getMeal(day);
  document.getElementById("meals-title").textContent = m
    ? `${m["天數"]} — ${m["週次"]} ${m["星期"]}`
    : `Day ${day} 餐單`;

  const container = document.getElementById("meals-list");
  if (!m) {
    container.innerHTML = "<div class='card'><p class='muted'>無餐單資料</p></div>";
    return;
  }

  container.innerHTML = MEAL_FIELDS.map(([key, label]) => {
    if (!m[key]) return "";
    return `
      <div class="card meal">
        <div class="meal-time">${label}</div>
        <p>${esc(m[key])}</p>
      </div>`;
  }).join("");
}

function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const workouts = plan.sheets[SHEET_WORKOUT];

  grid.innerHTML = workouts
    .map((w) => {
      const d = dayNum(w["天數"]);
      const log = progress.day_logs[String(d)];
      const done = log && log.completed;
      const current = d === progress.current_day;
      const rest = isRestDay(w);
      const shortType = (w["訓練類型"] || "").replace(/上半身|下半身/g, "").slice(0, 6);
      return `
        <div class="cal-day${done ? " done" : ""}${current ? " current" : ""}${rest ? " rest" : ""}" data-day="${d}">
          <div class="num">${d}</div>
          <div class="type">${esc(shortType)}</div>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".cal-day").forEach((el) => {
    el.addEventListener("click", () => {
      progress.current_day = parseInt(el.dataset.day, 10);
      saveProgress();
      renderAll();
      document.querySelector('[data-tab="today"]').click();
    });
  });

  document.getElementById("start-date").value = progress.start_date || "";
  const hint = document.getElementById("calendar-hint");
  if (progress.start_date) {
    const start = new Date(progress.start_date + "T00:00:00");
    const today = new Date();
    const diff = Math.floor((today - start) / 86400000) + 1;
    const total = maxDays();
    if (diff >= 1 && diff <= total) {
      hint.textContent = `依開始日期，今天應為 Day ${diff}（可點擊日曆切換）`;
    } else if (diff > total) {
      hint.textContent = `計劃已超過 ${total} 天，可重新設定開始日期。`;
    } else {
      hint.textContent = "計劃尚未開始。";
    }
  } else {
    hint.textContent = "設定開始日期後，可自動對應到今天應執行的 Day。";
  }
}

function renderProgress() {
  const rows = plan.sheets[SHEET_PROGRESS].filter((r) => (r["週次"] || "").startsWith("第"));
  const container = document.getElementById("weekly-forms");

  container.innerHTML = rows
    .map((row) => {
      const week = row["週次"];
      const saved = progress.weekly_logs[week] || {};
      return `
      <div class="card" data-week="${esc(week)}">
        <h2>${esc(week)}</h2>
        <div class="grid-2">
          <div class="form-row">
            <label>日期/天數</label>
            <input type="text" class="weekly-field" data-field="日期/天數" value="${esc(saved["日期/天數"] || row["日期/天數"] || "")}">
          </div>
          <div class="form-row">
            <label>體重 (kg)</label>
            <input type="text" class="weekly-field" data-field="體重 (kg)" value="${esc(saved["體重 (kg)"] || "")}">
          </div>
          <div class="form-row">
            <label>腰圍 (cm)</label>
            <input type="text" class="weekly-field" data-field="腰圍 (cm)" value="${esc(saved["腰圍 (cm)"] || "")}">
          </div>
          <div class="form-row">
            <label>主項重量進展</label>
            <input type="text" class="weekly-field" data-field="主項重量進展" value="${esc(saved["主項重量進展"] || "")}">
          </div>
        </div>
        <div class="form-row">
          <label>體感/睡眠/疲勞度</label>
          <textarea class="weekly-field" data-field="體感/睡眠/疲勞度">${esc(saved["體感/睡眠/疲勞度"] || "")}</textarea>
        </div>
        <div class="form-row">
          <label>檢討與調整建議</label>
          <textarea class="weekly-field" data-field="檢討與調整建議">${esc(saved["檢討與調整建議"] || "")}</textarea>
        </div>
        <button class="btn save-weekly">儲存本週記錄</button>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".save-weekly").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const week = card.dataset.week;
      const data = {};
      card.querySelectorAll(".weekly-field").forEach((el) => {
        data[el.dataset.field] = el.value;
      });
      progress.weekly_logs[week] = data;
      saveProgress();
      toast(`${week} 已儲存`);
    });
  });
}

function renderPlanner() {
  const select = document.getElementById("planner-day-select");
  const total = maxDays();
  const current = select.value || progress.current_day;
  select.innerHTML = "";
  for (let d = 1; d <= total; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Day ${d}`;
    select.appendChild(opt);
  }
  select.value = Math.min(parseInt(current, 10) || progress.current_day, total);
  loadPlannerDay();
}

function loadPlannerDay() {
  const day = parseInt(document.getElementById("planner-day-select").value, 10);
  const w = getWorkout(day);
  const original = plan.sheets[SHEET_WORKOUT].find((r) => dayNum(r["天數"]) === day);

  document.getElementById("planner-type").value = w ? w["訓練類型"] : "";
  document.getElementById("planner-rest").value = w ? w["休息時間建議"] : "";

  const text = w ? w["具體動作與組數"] : "";
  const exercises = isRestDay(w) ? [{ name: text, sets: 0, reps: "" }] : parseExercises(text);

  const container = document.getElementById("planner-exercises");
  container.innerHTML = "";
  exercises.forEach((ex) => addPlannerRow(ex.name, ex.sets, ex.reps));
  if (!exercises.length) addPlannerRow("", 3, "8-10");
}

function addPlannerRow(name = "", sets = 3, reps = "8-10") {
  const container = document.getElementById("planner-exercises");
  const row = document.createElement("div");
  row.className = "planner-exercise";
  row.innerHTML = `
    <input type="text" class="pe-name" placeholder="動作名稱" value="${esc(name)}">
    <input type="number" class="pe-sets" min="1" max="10" value="${sets || 3}">
    <input type="text" class="pe-reps" placeholder="6-8" value="${esc(reps)}">
    <button class="btn secondary pe-remove">刪除</button>`;
  row.querySelector(".pe-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function addPlannerExercise() {
  addPlannerRow();
}

async function saveCustomPlan() {
  const day = parseInt(document.getElementById("planner-day-select").value, 10);
  const original = plan.sheets[SHEET_WORKOUT].find((r) => dayNum(r["天數"]) === day) || {};
  const type = document.getElementById("planner-type").value;
  const rest = document.getElementById("planner-rest").value;

  const exercises = [...document.querySelectorAll(".planner-exercise")].map((row) => ({
    name: row.querySelector(".pe-name").value,
    sets: parseInt(row.querySelector(".pe-sets").value, 10) || 1,
    reps: row.querySelector(".pe-reps").value || "-",
  }));

  const isRest = type.includes("休息");
  const record = {
    ...original,
    天數: `Day ${day}`,
    訓練類型: type,
    休息時間建議: rest,
    具體動作與組數: isRest
      ? exercises.map((e) => e.name).join("\n") || "全面休息。"
      : exercisesToText(exercises),
  };

  await fetch(`/api/plan/workouts/day/${day}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  await reloadPlan();
  renderAll();
  toast(`Day ${day} 課表已儲存`);
}

async function resetCustomPlan() {
  const day = parseInt(document.getElementById("planner-day-select").value, 10);
  const xlsx = await fetch(`/api/plan/workouts/day/${day}`).then((r) => (r.ok ? r.json() : null));
  if (!xlsx) {
    toast("無原始課表可還原");
    return;
  }
  loadPlannerDay();
  toast(`已重新載入 Day ${day} 課表`);
}

function renderNutrition() {
  const items = plan.sheets[SHEET_NUTRITION];
  document.getElementById("nutrition-grid").innerHTML = items
    .map(
      (n) => `
    <div class="stat">
      <div class="label">${esc(n["項目"])}</div>
      <div class="value">${esc(n["數據/計算結果"])}</div>
      <div class="muted" style="margin-top:0.35rem">${esc(n["說明"])}</div>
    </div>`
    )
    .join("");
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init().catch((err) => {
  document.body.innerHTML = `<main style="padding:2rem"><h2>載入失敗</h2><p>${err.message}</p><p>請先執行 python import_plan.py</p></main>`;
});
