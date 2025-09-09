// script.js

// -------------------------
// Utilidades CSV
// -------------------------
function parseCSV(text) {
  const delimiter = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ',';
  return text
    .trim()
    .split(/\r?\n/)
    .map(row => row.split(delimiter).map(cell => cell.trim()));
}

function validateCSV(matrix) {
  if (matrix.length < 2) return "El CSV debe tener al menos un encabezado y una fila de datos.";
  const cols = matrix[0].length;
  const valid = matrix.every(r => r.length === cols);
  if (!valid) return "Todas las filas deben tener el mismo número de columnas.";
  return null;
}

// -------------------------
// Estado global
// -------------------------
let tableData = [];
let chart = null;

// -------------------------
// DOM helpers
// -------------------------
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

const warnings = qs("#warnings");
function showMessage(msg, type = "error") {
  warnings.textContent = msg;
  warnings.className = type === "success" ? "success" : "error";
}

// -------------------------
// Tema claro/oscuro
// -------------------------
const themeToggle = qs("#themeToggle");
themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeToggle.textContent = next === "dark" ? "Modo claro" : "Modo oscuro";
});

(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", saved);
  themeToggle.textContent = saved === "dark" ? "Modo claro" : "Modo oscuro";
})();

// -------------------------
// CSV de ejemplo y limpiar
// -------------------------
qs("#sampleCSV").addEventListener("click", () => {
  qs("#csvInput").value = "Columna,Valor\nA,10\nB,20\nC,30";
});

qs("#clearAll").addEventListener("click", () => {
  qs("#csvInput").value = "";
  qs("#tableContainer").innerHTML = "<div class='muted'>No hay datos aún. Pega o importa un CSV y presiona \"Procesar CSV\".</div>";
  qs("#colX").innerHTML = "";
  qs("#colY").innerHTML = "";
  if (chart) {
    chart.destroy();
    chart = null;
  }
  showMessage("", "success");
});

// -------------------------
// Importar archivo
// -------------------------
qs("#fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => (qs("#csvInput").value = ev.target.result);
  reader.readAsText(file);
});

// -------------------------
// Validar y procesar CSV
// -------------------------
qs("#validateBtn").addEventListener("click", () => {
  const matrix = parseCSV(qs("#csvInput").value);
  const err = validateCSV(matrix);
  if (err) showMessage(err, "error");
  else showMessage("CSV válido ✅", "success");
});

qs("#parseBtn").addEventListener("click", () => {
  const matrix = parseCSV(qs("#csvInput").value);
  const err = validateCSV(matrix);
  if (err) {
    showMessage(err, "error");
    return;
  }
  tableData = matrix;
  renderTable();
  fillColumnSelectors();
  showMessage("CSV procesado correctamente 🎉", "success");
});

// -------------------------
// Renderizar tabla
// -------------------------
function renderTable() {
  const container = qs("#tableContainer");
  if (!tableData.length) {
    container.innerHTML = "<div class='muted'>No hay datos cargados.</div>";
    return;
  }

  const [headers, ...rows] = tableData;

  let html = "<table><thead><tr>";
  headers.forEach(h => (html += `<th>${h}</th>`));
  html += "</tr></thead><tbody>";
  rows.forEach(r => {
    html += "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>";
  });
  html += "</tbody></table>";

  container.innerHTML = html;
}

// -------------------------
// Rellenar selectores de columnas
// -------------------------
function fillColumnSelectors() {
  const [headers] = tableData;
  const colX = qs("#colX");
  const colY = qs("#colY");
  colX.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");
  colY.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");
}

// -------------------------
// Gráfica
// -------------------------
qs("#renderChart").addEventListener("click", () => {
  if (!tableData.length) return;
  const [headers, ...rows] = tableData;
  const colX = parseInt(qs("#colX").value);
  const colY = parseInt(qs("#colY").value);
  const type = qs("#chartType").value;
  const labels = rows.map(r => r[colX]);
  const values = rows.map(r => Number(r[colY]));

  if (chart) chart.destroy();
  const ctx = qs("#chartCanvas").getContext("2d");

  const configType =
    type === "vertical-bar"
      ? "bar"
      : type === "horizontal-bar"
      ? "bar"
      : "line";

  chart = new Chart(ctx, {
    type: configType,
    data: {
      labels,
      datasets: [
        {
          label: headers[colY],
          data: values,
          backgroundColor: "rgba(11,132,255,0.6)",
        },
      ],
    },
    options: {
      indexAxis: type === "horizontal-bar" ? "y" : "x",
      plugins: {
        legend: { display: false },
      },
    },
  });
});

// -------------------------
// Exportar PNG
// -------------------------
qs("#exportPNG").addEventListener("click", () => {
  if (!chart) return;
  const url = chart.toBase64Image();
  const a = document.createElement("a");
  a.href = url;
  a.download = "grafica.png";
  a.click();
});
