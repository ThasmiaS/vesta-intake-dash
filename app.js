const STAGES = ["visited", "started", "personal_info", "document_upload", "review", "completed"];
let charts = [];

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split("\n");
  const headers = headerLine.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return headers.reduce((row, key, idx) => {
      row[key] = cells[idx];
      return row;
    }, {});
  });
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return sorted[mid];
}

function pct(num, den) {
  if (!den) return "0.0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

function stageLabel(stage) {
  return stage.replaceAll("_", " ");
}

function pctValue(num, den) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(1));
}

function buildLookup(rows) {
  const usersByType = new Map();
  const stageUsersByType = new Map();
  const stageUsersOverall = new Map();
  const stageTimesByType = new Map();
  const stageTimesOverall = new Map();

  for (const stage of STAGES) {
    stageUsersOverall.set(stage, new Set());
    stageTimesOverall.set(stage, []);
  }

  for (const row of rows) {
    const userId = row.user_id;
    const type = row.intake_type;
    const stage = row.stage;
    const timeSpent = Number(row.time_spent_seconds);

    if (!usersByType.has(type)) usersByType.set(type, new Set());
    usersByType.get(type).add(userId);

    if (!stageUsersByType.has(type)) stageUsersByType.set(type, new Map());
    if (!stageTimesByType.has(type)) stageTimesByType.set(type, new Map());

    if (!stageUsersByType.get(type).has(stage)) stageUsersByType.get(type).set(stage, new Set());
    if (!stageTimesByType.get(type).has(stage)) stageTimesByType.get(type).set(stage, []);

    stageUsersByType.get(type).get(stage).add(userId);
    stageUsersOverall.get(stage).add(userId);

    stageTimesByType.get(type).get(stage).push(timeSpent);
    stageTimesOverall.get(stage).push(timeSpent);
  }

  return { usersByType, stageUsersByType, stageUsersOverall, stageTimesByType, stageTimesOverall };
}

function renderKpis(state) {
  const users = state.stageUsersOverall.get("visited")?.size ?? 0;
  const completed = state.stageUsersOverall.get("completed")?.size ?? 0;
  const itinUsers = state.usersByType.get("itin")?.size ?? 0;
  const formUsers = state.usersByType.get("13614c")?.size ?? 0;

  const cards = [
    { title: "Users", value: users.toLocaleString() },
    { title: "Completed", value: completed.toLocaleString() },
    { title: "Completion Rate", value: pct(completed, users) },
    { title: "ITIN Users", value: itinUsers.toLocaleString() },
    { title: "13614c Users", value: formUsers.toLocaleString() }
  ];

  const container = document.getElementById("kpis");
  container.innerHTML = cards
    .map(
      (card) =>
        `<article class="card"><h3>${card.title}</h3><p>${card.value}</p></article>`
    )
    .join("");
}

function renderConversionOverall(state) {
  const tbody = document.getElementById("conversion-overall");
  const rows = [];
  for (let i = 0; i < STAGES.length - 1; i += 1) {
    const from = STAGES[i];
    const to = STAGES[i + 1];
    const fromCount = state.stageUsersOverall.get(from)?.size ?? 0;
    const toCount = state.stageUsersOverall.get(to)?.size ?? 0;
    rows.push(
      `<tr><td>${from} -> ${to}</td><td><span class="pill">${pct(
        toCount,
        fromCount
      )}</span></td><td>${toCount} / ${fromCount}</td></tr>`
    );
  }
  tbody.innerHTML = rows.join("");
}

function renderConversionByType(state) {
  const tbody = document.getElementById("conversion-by-type");
  const types = [...state.usersByType.keys()].sort();
  const rows = [];

  for (const type of types) {
    for (let i = 0; i < STAGES.length - 1; i += 1) {
      const from = STAGES[i];
      const to = STAGES[i + 1];
      const fromCount = state.stageUsersByType.get(type)?.get(from)?.size ?? 0;
      const toCount = state.stageUsersByType.get(type)?.get(to)?.size ?? 0;
      rows.push(
        `<tr><td>${type}</td><td>${from} -> ${to}</td><td>${pct(
          toCount,
          fromCount
        )}</td><td>${toCount} / ${fromCount}</td></tr>`
      );
    }
  }

  tbody.innerHTML = rows.join("");
}

function renderMedianTimes(state) {
  const tbody = document.getElementById("median-time");
  const rows = [];
  for (const stage of STAGES) {
    const overall = median(state.stageTimesOverall.get(stage) ?? []);
    const itin = median(state.stageTimesByType.get("itin")?.get(stage) ?? []);
    const form13614c = median(state.stageTimesByType.get("13614c")?.get(stage) ?? []);

    rows.push(
      `<tr><td>${stage}</td><td>${overall ?? "-"}</td><td>${itin ?? "-"}</td><td>${form13614c ?? "-"}</td></tr>`
    );
  }
  tbody.innerHTML = rows.join("");
}

function clearCharts() {
  for (const chart of charts) chart.destroy();
  charts = [];
}

function renderCharts(state) {
  if (typeof Chart === "undefined") return;
  clearCharts();

  const stageLabels = STAGES.map(stageLabel);
  const stageCounts = STAGES.map((stage) => state.stageUsersOverall.get(stage)?.size ?? 0);

  const conversionLabels = [];
  const conversionValues = [];
  for (let i = 0; i < STAGES.length - 1; i += 1) {
    const from = STAGES[i];
    const to = STAGES[i + 1];
    const fromCount = state.stageUsersOverall.get(from)?.size ?? 0;
    const toCount = state.stageUsersOverall.get(to)?.size ?? 0;
    conversionLabels.push(`${stageLabel(from)} -> ${stageLabel(to)}`);
    conversionValues.push(pctValue(toCount, fromCount));
  }

  const medianTimes = STAGES.map((stage) => median(state.stageTimesOverall.get(stage) ?? []) ?? 0);

  const funnelCtx = document.getElementById("funnel-chart");
  charts.push(
    new Chart(funnelCtx, {
      type: "bar",
      data: {
        labels: stageLabels,
        datasets: [
          {
            label: "Users",
            data: stageCounts,
            backgroundColor: "rgba(59,130,246,0.6)",
            borderColor: "rgba(59,130,246,1)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    })
  );

  const conversionCtx = document.getElementById("conversion-chart");
  charts.push(
    new Chart(conversionCtx, {
      type: "bar",
      data: {
        labels: conversionLabels,
        datasets: [
          {
            label: "Conversion Rate %",
            data: conversionValues,
            backgroundColor: "rgba(16,185,129,0.55)",
            borderColor: "rgba(16,185,129,1)",
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } }
        }
      }
    })
  );

  const timeCtx = document.getElementById("time-chart");
  charts.push(
    new Chart(timeCtx, {
      type: "line",
      data: {
        labels: stageLabels,
        datasets: [
          {
            label: "Median Seconds",
            data: medianTimes,
            fill: false,
            borderColor: "rgba(245,158,11,1)",
            backgroundColor: "rgba(245,158,11,0.5)",
            tension: 0.25
          }
        ]
      },
      options: {
        responsive: true
      }
    })
  );
}

async function init() {
  try {
    const response = await fetch("data/mock_intake.csv");
    if (!response.ok) throw new Error(`Failed to load CSV (${response.status})`);
    const text = await response.text();
    const rows = parseCsv(text);
    const state = buildLookup(rows);
    renderKpis(state);
    renderCharts(state);
    renderConversionOverall(state);
    renderConversionByType(state);
    renderMedianTimes(state);
  } catch (error) {
    document.body.innerHTML = `<main class="container"><p>Could not load dashboard data: ${error.message}</p></main>`;
  }
}

init();
