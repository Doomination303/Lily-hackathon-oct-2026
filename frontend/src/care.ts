// Data model, schedule maths and localStorage persistence for the care plan.

export type DoseStatus = "pending" | "taken" | "missed";

export type Medication = {
  id: number;
  name: string;
  purpose: string;
  dosage: string;
  quantity: string;
  instructions: string;
  color: string;
  imageUrl?: string;
  // 24-hour "HH:MM" times the medicine is due each day
  times: string[];
  // "YYYY-MM-DD" the prescription started, so earlier days are not counted as missed
  createdOn: string;
};

export type LogEntry = {
  key: string;
  name: string;
  dosage: string;
  date: string;
  time: string;
  status: "taken" | "missed";
  reason?: string;
  recordedAt: number;
};

export type Settings = {
  carerName: string;
  patientName: string;
  remindersOn: boolean;
  doctorPhone: string;
  nursePhone: string;
};

export type CareState = {
  medications: Medication[];
  log: LogEntry[];
  settings: Settings;
  // dose key -> time (ms) the carer asked to be reminded again
  snoozes: Record<string, number>;
};

export type Dose = {
  key: string;
  medication: Medication;
  date: string;
  time: string;
  status: DoseStatus;
  entry?: LogEntry;
  scheduledAt: number;
  dueAt: number;
};

export type DayState = "complete" | "missed" | "pending" | "none" | "future";

const STORAGE_KEY = "accesscare-state";

export const medicationColors = [
  "bg-[#E27064]",
  "bg-[#41998E]",
  "bg-[#936315]",
  "bg-[#6D7DB3]",
  "bg-[#8A5A9E]",
];

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(when: number | Date): string {
  const date = new Date(when);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return dateKey(result);
}

export const timeOn = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}

export function formatClock(when: number): string {
  const date = new Date(when);
  return formatTime(`${date.getHours()}:${date.getMinutes()}`);
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} hr${rest ? ` ${rest} min` : ""}`;
}

export function formatLogTime(entry: LogEntry, now: number): string {
  const today = dateKey(now);
  const recordedOn = dateKey(entry.recordedAt);
  const recorded = new Date(entry.recordedAt);
  const day =
    recordedOn === today
      ? "Today"
      : recordedOn === addDays(today, -1)
        ? "Yesterday"
        : recordedOn > addDays(today, -7)
          ? recorded.toLocaleDateString(undefined, { weekday: "short" })
          : recorded.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day}, ${formatClock(entry.recordedAt)}`;
}

export const doseKey = (medicationId: number, date: string, time: string) =>
  `${medicationId}|${date}|${time}`;

export function dosesFor(state: CareState, date: string): Dose[] {
  const entries = new Map(state.log.map((entry) => [entry.key, entry]));
  return state.medications
    .filter((medication) => medication.createdOn <= date)
    .flatMap((medication) =>
      medication.times.map((time): Dose => {
        const key = doseKey(medication.id, date, time);
        const entry = entries.get(key);
        const scheduledAt = timeOn(date, time);
        return {
          key,
          medication,
          date,
          time,
          status: entry?.status ?? "pending",
          entry,
          scheduledAt,
          dueAt: state.snoozes[key] ?? scheduledAt,
        };
      }),
    )
    .sort((a, b) => a.scheduledAt - b.scheduledAt || a.medication.id - b.medication.id);
}

function tally(state: CareState, date: string, today: string) {
  const entries = state.log.filter((entry) => entry.date === date);
  const given = entries.filter((entry) => entry.status === "taken").length;
  const unrecorded = dosesFor(state, date).filter((dose) => dose.status === "pending").length;
  return {
    given,
    // A dose never recorded on a day that has passed counts as not given
    missed: entries.length - given + (date < today ? unrecorded : 0),
    pending: date === today ? unrecorded : 0,
  };
}

export function weekSummary(state: CareState, now: number) {
  const today = dateKey(now);
  const monday = addDays(today, -((new Date(now).getDay() + 6) % 7));

  const rate = (start: string) => {
    let given = 0;
    let total = 0;
    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(start, offset);
      if (date > today) break;
      const day = tally(state, date, today);
      given += day.given;
      total += day.given + day.missed;
    }
    return total ? Math.round((given / total) * 100) : null;
  };

  const days = Array.from({ length: 7 }, (_, offset): DayState => {
    const date = addDays(monday, offset);
    if (date > today) return "future";
    const day = tally(state, date, today);
    if (day.missed) return "missed";
    if (day.pending) return "pending";
    return day.given ? "complete" : "none";
  });

  const current = rate(monday);
  const previous = rate(addDays(monday, -7));
  return {
    days,
    rate: current,
    change: current !== null && previous !== null ? current - previous : null,
  };
}

export function logToCsv(log: LogEntry[]): string {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = log.map((entry) =>
    [
      entry.date,
      formatTime(entry.time),
      entry.name,
      entry.dosage,
      entry.status === "taken" ? "Given" : "Not given",
      entry.reason ?? "",
      new Date(entry.recordedAt).toLocaleString(),
    ]
      .map(cell)
      .join(","),
  );
  return ["Date,Scheduled time,Medicine,Dosage,Status,Reason,Recorded at", ...rows].join("\n");
}

// Sample care plan with a week of history so the dashboard has something to show on first run
export function sampleState(): CareState {
  const today = dateKey(Date.now());
  const createdOn = addDays(today, -6);
  const medications: Medication[] = [
    {
      id: 1,
      name: "Medicine 1",
      purpose: "Blood pressure",
      dosage: "10 mg",
      quantity: "1 tablet",
      instructions: "Take with a full glass of water",
      color: medicationColors[0],
      times: ["08:00"],
      createdOn,
    },
    {
      id: 2,
      name: "Medicine 2",
      purpose: "Blood sugar",
      dosage: "500 mg",
      quantity: "1 tablet",
      instructions: "Take with breakfast",
      color: medicationColors[1],
      times: ["08:30"],
      createdOn,
    },
    {
      id: 3,
      name: "Medicine 3",
      purpose: "Daily supplement",
      dosage: "1,000 IU",
      quantity: "1 capsule",
      instructions: "Take with food",
      color: medicationColors[2],
      times: ["13:00"],
      createdOn,
    },
  ];

  const log: LogEntry[] = [];
  for (let daysAgo = 1; daysAgo <= 6; daysAgo++) {
    const date = addDays(today, -daysAgo);
    medications.forEach((medication, index) => {
      const time = medication.times[0];
      const missed = daysAgo === 2 && index === 2;
      log.push({
        key: doseKey(medication.id, date, time),
        name: medication.name,
        dosage: medication.dosage,
        date,
        time,
        status: missed ? "missed" : "taken",
        reason: missed ? "Eleanor refused to take the medicine" : undefined,
        recordedAt: timeOn(date, time) + (missed ? 0 : (index + 2) * 120000),
      });
    });
  }

  return {
    medications,
    log,
    settings: {
      carerName: "Sarah Jones",
      patientName: "Eleanor",
      remindersOn: true,
      doctorPhone: "",
      nursePhone: "",
    },
    snoozes: {},
  };
}

export function loadState(): CareState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed && Array.isArray(parsed.medications) && Array.isArray(parsed.log) && parsed.settings) {
      return { ...parsed, snoozes: parsed.snoozes ?? {} };
    }
  } catch {
    // Unreadable or blocked storage falls back to the sample plan
  }
  return sampleState();
}

export function saveState(state: CareState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be full (large medicine photos) or blocked; the app still works for this session
  }
}
