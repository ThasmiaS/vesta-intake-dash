const fs = require("fs");

const stages = [
  "visited",
  "started",
  "personal_info",
  "document_upload",
  "review",
  "completed"
];

function simulateUser(id, intakeType) {
  const rows = [];
  const dropOffIndex = Math.floor(Math.random() * stages.length);
  let currentTime = Date.now();

  for (let i = 0; i <= dropOffIndex; i++) {
    rows.push({
      user_id: id,
      intake_type: intakeType,
      stage: stages[i],
      timestamp: new Date(currentTime).toISOString(),
      time_spent_seconds: Math.floor(Math.random() * 200)
    });
    currentTime += Math.floor(Math.random() * 60000);
  }

  return rows;
}

let allRows = [];

for (let i = 1; i <= 500; i++) {
  const intakeType = Math.random() > 0.5 ? "13614c" : "itin";
  allRows.push(...simulateUser(i, intakeType));
}

const csvHeader = "user_id,intake_type,stage,timestamp,time_spent_seconds\n";

const csvRows = allRows.map(r =>
  `${r.user_id},${r.intake_type},${r.stage},${r.timestamp},${r.time_spent_seconds}`
).join("\n");

fs.writeFileSync("data/mock_intake.csv", csvHeader + csvRows);

console.log("CSV generated!");