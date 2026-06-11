const MANAGE_SECTIONS = {
  workouts: {
    label: "訓練課表",
    fields: [
      ["天數", "text", "Day 1"],
      ["週次", "text", "第 1 週"],
      ["星期", "text", "星期一"],
      ["訓練類型", "text", "上半身 (推+拉)"],
      ["具體動作與組數", "textarea", "1. 槓鈴臥推 4x6-8"],
      ["休息時間建議", "text", "主項120秒，孤立60秒"],
      ["備註", "text", ""],
    ],
    columns: ["天數", "週次", "訓練類型", "具體動作與組數"],
  },
  meals: {
    label: "飲食餐單",
    fields: [
      ["天數", "text", "Day 1"],
      ["週次", "text", "第 1 週"],
      ["星期", "text", "星期一"],
      ["早餐", "textarea", ""],
      ["午餐 (可提早備餐)", "textarea", ""],
      ["下午茶 (約15:00)", "textarea", ""],
      ["晚餐", "textarea", ""],
      ["訓練後/睡前補充", "textarea", ""],
      ["備餐提示與風味", "textarea", ""],
    ],
    columns: ["天數", "週次", "早餐", "晚餐"],
  },
  nutrition: {
    label: "營養目標",
    fields: [
      ["項目", "text", "蛋白質 (Protein)"],
      ["數據/計算結果", "text", "150g"],
      ["說明", "textarea", ""],
    ],
    columns: ["項目", "數據/計算結果", "說明"],
  },
};

let manageSection = "workouts";
let manageItems = [];
let editingIndex = null;

function initManage() {
  document.querySelectorAll("nav.sub-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav.sub-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      manageSection = btn.dataset.manage;
      editingIndex = null;
      hideEditor();
      renderManageList();
    });
  });

  document.getElementById("btn-manage-search").addEventListener("click", () => fetchManageList());
  document.getElementById("manage-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchManageList();
  });
  document.getElementById("btn-manage-add").addEventListener("click", () => openEditor(null));
  document.getElementById("btn-manage-save").addEventListener("click", saveManageRecord);
  document.getElementById("btn-manage-cancel").addEventListener("click", hideEditor);
  document.getElementById("btn-manage-delete").addEventListener("click", deleteManageRecord);
  document.getElementById("btn-save-title").addEventListener("click", savePlanTitle);
  document.getElementById("btn-import").addEventListener("click", importExcel);

  document.getElementById("plan-title").value = plan?.title || "";
  fetchManageList();
}

async function fetchManageList() {
  const q = document.getElementById("manage-search").value.trim();
  const day = document.getElementById("manage-day-filter").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (day) params.set("day", day);

  const url = `/api/plan/${manageSection}${params.toString() ? "?" + params : ""}`;
  const res = await fetch(url);
  const data = await res.json();
  manageItems = data.items || [];
  renderManageList();
}

function renderManageList() {
  const cfg = MANAGE_SECTIONS[manageSection];
  const container = document.getElementById("manage-list");

  if (!manageItems.length) {
    container.innerHTML = `<p class="muted" style="margin-top:0.75rem">沒有資料。點「新增」或從 Excel 匯入。</p>`;
    return;
  }

  const header = cfg.columns.map((c) => `<th>${esc(c)}</th>`).join("") + "<th>操作</th>";
  const rows = manageItems
    .map((item) => {
      const cells = cfg.columns
        .map((c) => {
          const val = item[c] || "";
          const short = val.length > 40 ? val.slice(0, 40) + "…" : val;
          return `<td><span class="manage-preview" title="${esc(val)}">${esc(short)}</span></td>`;
        })
        .join("");
      return `<tr>
        ${cells}
        <td class="actions">
          <button class="link-btn" data-edit="${item.index}">編輯</button>
          <button class="link-btn danger" data-del="${item.index}">刪除</button>
        </td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `<table class="data-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
    <p class="muted" style="margin-top:0.5rem">共 ${manageItems.length} 筆</p>`;

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEditor(parseInt(btn.dataset.edit, 10)));
  });
  container.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => confirmDelete(parseInt(btn.dataset.del, 10)));
  });
}

function openEditor(index) {
  editingIndex = index;
  const cfg = MANAGE_SECTIONS[manageSection];
  const record = index !== null ? { ...manageItems.find((i) => i.index === index) } : {};

  document.getElementById("manage-editor-title").textContent =
    index !== null ? `編輯${cfg.label}` : `新增${cfg.label}`;

  const form = document.getElementById("manage-form");
  form.innerHTML = cfg.fields
    .map(([key, type, placeholder]) => {
      const val = record[key] || "";
      if (type === "textarea") {
        return `<div class="form-row"><label>${esc(key)}</label>
          <textarea data-field="${esc(key)}" placeholder="${esc(placeholder)}">${esc(val)}</textarea></div>`;
      }
      return `<div class="form-row"><label>${esc(key)}</label>
        <input type="text" data-field="${esc(key)}" value="${esc(val)}" placeholder="${esc(placeholder)}"></div>`;
    })
    .join("");

  document.getElementById("manage-editor").style.display = "block";
  document.getElementById("btn-manage-delete").style.display = index !== null ? "inline-block" : "none";
  document.getElementById("manage-editor").scrollIntoView({ behavior: "smooth" });
}

function hideEditor() {
  editingIndex = null;
  document.getElementById("manage-editor").style.display = "none";
}

function readManageForm() {
  const record = {};
  document.querySelectorAll("#manage-form [data-field]").forEach((el) => {
    record[el.dataset.field] = el.value;
  });
  return record;
}

async function saveManageRecord() {
  const record = readManageForm();
  const cfg = MANAGE_SECTIONS[manageSection];

  if (manageSection === "nutrition" && !record["項目"]?.trim()) {
    toast("請填寫項目名稱");
    return;
  }
  if ((manageSection === "workouts" || manageSection === "meals") && !record["天數"]?.trim()) {
    toast("請填寫天數");
    return;
  }

  let res;
  if (editingIndex !== null) {
    res = await fetch(`/api/plan/${manageSection}/${editingIndex}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } else {
    res = await fetch(`/api/plan/${manageSection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  }

  if (!res.ok) {
    const err = await res.json();
    toast(err.error || "儲存失敗");
    return;
  }

  await reloadPlan();
  hideEditor();
  await fetchManageList();
  renderAll();
  toast(`${cfg.label}已儲存`);
}

async function deleteManageRecord() {
  if (editingIndex === null) return;
  if (!confirm("確定要刪除這筆資料？")) return;
  await confirmDelete(editingIndex);
  hideEditor();
}

async function confirmDelete(index) {
  if (!confirm("確定要刪除這筆資料？")) return;

  const res = await fetch(`/api/plan/${manageSection}/${index}`, { method: "DELETE" });
  if (!res.ok) {
    toast("刪除失敗");
    return;
  }

  await reloadPlan();
  await fetchManageList();
  renderAll();
  toast("已刪除");
}

async function savePlanTitle() {
  const title = document.getElementById("plan-title").value.trim();
  plan.title = title || "Gym Plan";
  await fetch("/api/plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  await reloadPlan();
  renderHeader();
  toast("計劃名稱已儲存");
}

async function importExcel() {
  const fileInput = document.getElementById("import-file");
  const status = document.getElementById("import-status");

  if (!fileInput.files?.length) {
    toast("請選擇 Excel 檔案");
    return;
  }

  const file = fileInput.files[0];
  const mode = document.getElementById("import-mode").value;
  const form = new FormData();
  form.append("file", file);

  status.textContent = "匯入中...";
  const res = await fetch(`/api/import/excel?mode=${mode}`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!res.ok) {
    status.textContent = data.error || "匯入失敗";
    toast("匯入失敗");
    return;
  }

  const summary = Object.entries(data.sheets || {})
    .map(([k, n]) => `${k}: ${n} 筆`)
    .join("、");
  status.textContent = `匯入成功 — ${summary}`;
  fileInput.value = "";

  await reloadPlan();
  document.getElementById("plan-title").value = plan.title;
  await fetchManageList();
  renderAll();
  toast("Excel 匯入完成");
}

function renderManage() {
  document.getElementById("plan-title").value = plan?.title || "";
  fetchManageList();
}

