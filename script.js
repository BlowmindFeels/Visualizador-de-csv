

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
  if (!warnings) return;
  warnings.textContent = msg;
  warnings.className = type === "success" ? "success" : "error";
}


const themeToggle = qs("#themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    themeToggle.textContent = next === "dark" ? "Modo claro" : "Modo oscuro";
  });
}

(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", saved);
  if (themeToggle) themeToggle.textContent = saved === "dark" ? "Modo claro" : "Modo oscuro";
})();


if (qs("#sampleCSV")) {
  qs("#sampleCSV").addEventListener("click", () => {
    qs("#csvInput").value = "Sucursal,Ventas\nBogotá,100\nMedellín,150\nCali,80\nBogotá,200\nMedellín,50\nCali,120";
  });
}

if (qs("#clearAll")) {
  qs("#clearAll").addEventListener("click", () => {
    if (qs("#csvInput")) qs("#csvInput").value = "";
    if (qs("#tableContainer")) qs("#tableContainer").innerHTML = "<div class='muted'>No hay datos aún. Pega o importa un CSV y presiona \"Procesar CSV\".</div>";
    if (qs("#colX")) qs("#colX").innerHTML = "";
    if (qs("#colY")) qs("#colY").innerHTML = "";
    if (chart) {
      chart.destroy();
      chart = null;
    }


    if (qs("#ranking")) qs("#ranking").innerHTML = "<div class='muted'>No hay datos cargados.</div>";
    showMessage("", "success");
    tableData = [];
  });
}

if (qs("#fileInput")) {
  qs("#fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (qs("#csvInput")) qs("#csvInput").value = ev.target.result;
    };
    reader.readAsText(file);
  });
}


if (qs("#validateBtn")) {
  qs("#validateBtn").addEventListener("click", () => {
    const matrix = parseCSV(qs("#csvInput").value || "");
    const err = validateCSV(matrix);
    if (err) showMessage(err, "error");
    else showMessage("CSV válido", "success");
  });
}

if (qs("#parseBtn")) {
  qs("#parseBtn").addEventListener("click", () => {
    const matrix = parseCSV(qs("#csvInput").value || "");
    const err = validateCSV(matrix);
    if (err) {
      showMessage(err, "error");
      return;
    }
    tableData = matrix;
    renderTable();
    fillColumnSelectors();
    fillRankingSelectors();
    renderRanking();
    showMessage("CSV procesado correctamente", "success");
  });
}


let currentPage = 1;
let rowsPerPage = 10; // valor por defecto

function renderTable() {
  const container = qs("#tableContainer");
  if (!container) return;
  if (!tableData.length) {
    container.innerHTML = "<div class='muted'>No hay datos cargados.</div>";
    // actualizar ranking también
    renderRanking();
    return;
  }

  const [headers, ...rows] = tableData;

  // FILTRADO GLOBAL
  const rawQuery = (qs("#globalFilter") && qs("#globalFilter").value) || "";
  const q = rawQuery.trim().toLowerCase();
  let filtered = q
    ? rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(q)))
    : rows.slice();

  // PAGINACIÓN 
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

  // Construir tabla con pageRows
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

  // Controles de paginación
  html += `<div class="table-controls" style="display:flex;align-items:center;gap:10px;margin-top:8px;">
    <button id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
    <span id="pageInfo">Página ${currentPage} de ${totalPages} — ${totalRows} filas</span>
    <button id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>Siguiente</button>
  </div>`;

  container.innerHTML = html;

  // Listeners prev/next
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

  // actualizar ranking cuando la tabla cambie (por ejemplo por filtros)
  renderRanking();
}


function fillColumnSelectors() {
  if (!tableData.length) return;
  const [headers] = tableData;
  const colX = qs("#colX");
  const colY = qs("#colY");
  if (colX) colX.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");
  if (colY) colY.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");
}


if (qs("#renderChart")) {
  qs("#renderChart").addEventListener("click", () => {
    if (!tableData.length) return;
    const [headers, ...rows] = tableData;
    const colX = parseInt(qs("#colX").value);
    const colY = parseInt(qs("#colY").value);
    const type = qs("#chartType").value;
    const labels = rows.map(r => r[colX]);
    const values = rows.map(r => Number(String(r[colY]).replace(/,/g, "")) || 0);

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
}

// Export PNG
if (qs("#exportPNG")) {
  qs("#exportPNG").addEventListener("click", () => {
    if (!chart) return;
    const url = chart.toBase64Image();
    const a = document.createElement("a");
    a.href = url;
    a.download = "grafica.png";
    a.click();
  });
}



// Si no existe un contenedor para las estadísticas, lo crea (inserta después de #tableContainer)
function createStatsUIIfMissing() {
  if (qs("#statsContainer")) return;
  const tableContainer = qs("#tableContainer");
  const parent = tableContainer ? tableContainer.parentNode : document.body;
  const statsContainer = document.createElement("div");
  parent.appendChild(statsContainer);
}

function fillRankingSelectors() {
  if (!tableData.length) {

    if (qs("#rankingGroup")) qs("#rankingGroup").innerHTML = "";
    if (qs("#rankingValue")) qs("#rankingValue").innerHTML = "";
    return;
  }
  createStatsUIIfMissing();

  const [headers] = tableData;
  const groupSel = qs("#rankingGroup");
  const valueSel = qs("#rankingValue");
  if (groupSel) groupSel.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");
  if (valueSel) valueSel.innerHTML = headers.map((h, i) => `<option value="${i}">${h}</option>`).join("");

  // attach listeners (idempotente)
  if (groupSel && !groupSel.dataset._listener) {
    groupSel.addEventListener("change", () => {
      renderRanking();
    });
    groupSel.dataset._listener = "1";
  }
  if (valueSel && !valueSel.dataset._listener) {
    valueSel.addEventListener("change", () => {
      renderRanking();
    });
    valueSel.dataset._listener = "1";
  }
  const topInput = qs("#rankingTop");
  if (topInput && !topInput.dataset._listener) {
    topInput.addEventListener("input", () => renderRanking());
    topInput.dataset._listener = "1";
  }
  const orderCheckbox = qs("#rankingOrder");
  if (orderCheckbox && !orderCheckbox.dataset._listener) {
    orderCheckbox.addEventListener("change", () => renderRanking());
    orderCheckbox.dataset._listener = "1";
  }
}

function renderRanking() {
  const container = qs("#ranking");
  if (!container) return;
  if (!tableData.length) {
    container.innerHTML = "<div class='muted'>No hay datos cargados.</div>";
    return;
  }

  const [headers, ...rows] = tableData;
  const groupSel = qs("#rankingGroup");
  const valueSel = qs("#rankingValue");
  const topInput = qs("#rankingTop");
  const orderCheckbox = qs("#rankingOrder");

  if (!groupSel || !valueSel) {
    container.innerHTML = "<div class='muted'>Seleccione columnas para el ranking.</div>";
    return;
  }

  const colGroup = parseInt(groupSel.value, 10);
  const colValue = parseInt(valueSel.value, 10);
  const topN = Math.max(1, parseInt((topInput && topInput.value) || "5", 10));

  if (isNaN(colGroup) || isNaN(colValue)) {
    container.innerHTML = "<div class='muted'>Seleccione columnas válidas.</div>";
    return;
  }

  const totals = {};
  rows.forEach(r => {
    const key = String(r[colGroup] ?? "").trim();
    // parse number removing commas and spaces
    const rawVal = r[colValue];
    const num = parseFloat(String(rawVal).replace(/[, ]+/g, "")) || 0;
    totals[key] = (totals[key] || 0) + num;
  });

  // Ordenar
  let ranking = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (orderCheckbox && orderCheckbox.checked) ranking = ranking.reverse();

  // aplicar topN
  ranking = ranking.slice(0, topN);

  // Construir HTML (lista ordenada con formato)
  if (!ranking.length) {
    container.innerHTML = "<div class='muted'>No hay valores para mostrar.</div>";
    return;
  }

  let html = "<ol style='padding-left:1.1rem;margin:0;'>";
  const numberFormatter = new Intl.NumberFormat();
  ranking.forEach(([group, total]) => {
    html += `<li style="margin:6px 0;"><strong>${group}</strong>: ${numberFormatter.format(total)}</li>`;
  });
  html += "</ol>";

  container.innerHTML = html;
}


const globalFilter = qs("#globalFilter");
if (globalFilter) {
  globalFilter.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });
}

const rowsSel = qs("#rowsPerPage");
if (rowsSel) {
  rowsSel.addEventListener("change", () => {
    const val = parseInt(rowsSel.value, 10);
    rowsPerPage = Number.isInteger(val) && val > 0 ? val : rowsPerPage;
    currentPage = 1;
    renderTable();
  });
}


document.addEventListener("DOMContentLoaded", () => {
  if (tableData && tableData.length) {
    fillColumnSelectors();
    fillRankingSelectors();
    renderRanking();
  }
});
