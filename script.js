
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


let tableData = [];
let chart = null;


const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

const warnings = qs("#warnings");
function showMessage(msg, type = "error") {
  warnings.textContent = msg;
  warnings.className = type === "success" ? "success" : "error";
}


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


qs("#fileInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => (qs("#csvInput").value = ev.target.result);
  reader.readAsText(file);
});


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

let currentPage = 1;
let rowsPerPage = 10; // valor por defecto

function renderTable() {
  const container = qs("#tableContainer");
  if (!tableData.length) {
    container.innerHTML = "<div class='muted'>No hay datos cargados.</div>";
    return;
  }

  const [headers, ...rows] = tableData;


  const rawQuery = (qs("#globalFilter") && qs("#globalFilter").value) || "";
  const q = rawQuery.trim().toLowerCase();
  let filtered = q
    ? rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(q)))
    : rows.slice();


  const selRows = qs("#rowsPerPage");
  if (selRows) {
    const val = parseInt(selRows.value, 10);
    rowsPerPage = Number.isInteger(val) && val > 0 ? val : rowsPerPage;
  }

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);


  let html = "<table><thead><tr>";
  headers.forEach(h => (html += `<th>${h}</th>`));
  html += "</tr></thead><tbody>";

  if (!pageRows.length) {
    html += `<tr><td colspan="${headers.length}" style="text-align:center;">No hay filas que coincidan con la búsqueda.</td></tr>`;
  } else {
    pageRows.forEach(r => {
      html += "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>";
    });
  }

  html += "</tbody></table>";

  // --- Controles de paginación ---
  html += `<div class="table-controls" style="display:flex;align-items:center;gap:10px;margin-top:8px;">
    <button id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
    <span id="pageInfo">Página ${currentPage} de ${totalPages} — ${totalRows} filas</span>
    <button id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>Siguiente</button>
  </div>`;

  container.innerHTML = html;

  // --- Listeners prev/next ---
  const prev = qs("#prevPage");
  const next = qs("#nextPage");
  if (prev) prev.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  if (next) next.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
}

const globalFilter = qs("#globalFilter");
if (globalFilter) {
  globalFilter.addEventListener("input", () => {
    currentPage = 1; // volver a la página 1 al filtrar
    renderTable();
  });
}

