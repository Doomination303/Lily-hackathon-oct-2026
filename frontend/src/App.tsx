import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon, type IconProps } from "./Icon";
import {
  LOW_STOCK_DAYS,
  addDays,
  dateKey,
  daysOfStock,
  dosesFor,
  formatDuration,
  formatLogTime,
  formatTime,
  loadState,
  logToCsv,
  medicationColors,
  sampleState,
  saveState,
  unitsPerDose,
  weekSummary,
  type CareState,
  type Dose,
  type LogEntry,
  type Medication,
  type Settings,
} from "./care";

type Screen =
  | "dashboard"
  | "prescriptions"
  | "reminders"
  | "log"
  | "emergency"
  | "profile"
  | "setup"
  | "patient"
  | "settings"
  | "help";

const navItems: Array<{
  label: string;
  icon: IconProps["name"];
  target: Screen;
}> = [
  { label: "Dashboard", icon: "home", target: "dashboard" },
  { label: "Prescriptions", icon: "medication", target: "prescriptions" },
  { label: "Reminders", icon: "calendar", target: "reminders" },
  { label: "Medicine log", icon: "document", target: "log" },
  { label: "Emergency contacts", icon: "phone", target: "emergency" },
  { label: "Patient setup", icon: "settings", target: "setup" },
  { label: "Patient view", icon: "user", target: "patient" },
];

type PrescriptionForm = {
  id: number | null;
  name: string;
  purpose: string;
  dosage: string;
  quantity: string;
  instructions: string;
  times: string[];
  imageUrl: string;
  stock: string;
};

const emptyForm: PrescriptionForm = {
  id: null,
  name: "",
  purpose: "",
  dosage: "",
  quantity: "",
  instructions: "",
  times: [""],
  imageUrl: "",
  stock: "",
};

type ToggleKey =
  | "remindersOn"
  | "soundAlerts"
  | "readAloud"
  | "colourSafe"
  | "reducedMotion"
  | "simplifiedLayout"
  | "allowMedicineChanges";

const OTHER_REASON = "Other reason";
const SNOOZE_MS = 10 * 60 * 1000;
const LATE_MS = 30 * 60 * 1000;
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

const inputClass =
  "min-h-12 w-full rounded-xl border-2 border-[#71827D] bg-white px-4 text-base text-[#172E35] outline-none placeholder:text-[#6A787C] focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]";
const textareaClass =
  "min-h-28 w-full rounded-xl border-2 border-[#71827D] bg-white p-4 text-base text-[#172E35] outline-none focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]";
const primaryButton =
  "min-h-12 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white enabled:hover:bg-[#24515A] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]";
const secondaryButton =
  "min-h-12 rounded-xl border border-[#71827D] px-4 text-sm font-bold hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]";
const outlineButton =
  "min-h-12 rounded-xl border-2 border-[#276D64] px-4 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]";
const textButton =
  "min-h-10 rounded-lg px-2 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-[#173B42]";
const cardClass = "rounded-2xl border border-[#DDE2DE] bg-white p-6";
const sideButton =
  "flex min-h-14 w-full items-center gap-4 rounded-2xl px-4 text-left font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73]";

const initials = (name: string, fallback: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || fallback;

// Photos are shrunk to a small data URL so they survive a reload and fit in localStorage
async function toThumbnail(file: File, maxSize = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

function downloadLog(log: LogEntry[]) {
  const url = URL.createObjectURL(new Blob([logToCsv(log)], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `medicine-log-${dateKey(Date.now())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function playChime() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
    oscillator.onended = () => void context.close();
  } catch {
    // Browsers block audio until the page has been interacted with; the reminder still shows
  }
}

function Modal({
  eyebrow,
  title,
  description,
  alert = false,
  size = "max-w-md",
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  alert?: boolean;
  size?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      aria-labelledby="modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102C33]/55 p-4 text-[#172E35]"
      role="dialog"
    >
      <div
        className={`max-h-[92vh] w-full ${size} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-7`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={
                alert
                  ? "text-sm font-bold text-[#A14940]"
                  : "text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]"
              }
            >
              {eyebrow}
            </p>
            <h2 id="modal-title" className="mt-1 text-2xl font-bold">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-base leading-6 text-[#526267]">{description}</p>
            )}
          </div>
          <button
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#F0F2EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  optional = false,
  ...input
}: { label: string; optional?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold">
        {label}
        {optional && <span className="font-normal text-[#526267]"> (optional)</span>}
      </span>
      <input className={inputClass} type="text" {...input} />
    </label>
  );
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-[#DDE2DE] py-4 last:border-0">
      <div>
        <p className="font-bold text-[#172E35]">{label}</p>
        <p className="mt-1 text-sm leading-5 text-[#526267]">{description}</p>
      </div>
      <button
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42] ${
          checked ? "border-[#276D64] bg-[#276D64]" : "border-[#71827D] bg-[#EEF1EE]"
        }`}
        onClick={onChange}
        role="switch"
        type="button"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function LogList({ entries, now }: { entries: LogEntry[]; now: number }) {
  if (entries.length === 0) {
    return <p className="p-5 text-base text-[#526267]">No doses have been recorded yet.</p>;
  }
  return (
    <ul className="divide-y divide-[#DDE2DE]">
      {entries.map((entry) => {
        const given = entry.status === "taken";
        const tone = given ? "bg-[#E8F3EF] text-[#276D64]" : "bg-[#FAECE9] text-[#913C34]";
        return (
          <li className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center" key={entry.key}>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}
            >
              <Icon name={given ? "check" : "close"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {entry.name} · {entry.dosage}
              </p>
              <p className="mt-1 text-sm text-[#526267]">
                {formatLogTime(entry, now)}
                {entry.reason && ` · ${entry.reason}`}
              </p>
            </div>
            <span className={`self-start rounded-full px-3 py-2 text-sm font-bold sm:self-auto ${tone}`}>
              {given ? "Given" : "Not given"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function App() {
  const [state, setState] = useState<CareState>(loadState);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState("");
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [form, setForm] = useState<PrescriptionForm | null>(null);
  const [reasonFor, setReasonFor] = useState<Dose | null>(null);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingCarer, setEditingCarer] = useState(false);
  const [incidentNote, setIncidentNote] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const lastReminderCheck = useRef(Date.now());

  const { medications, settings } = state;
  const patient = settings.patientName.trim() || "the patient";
  const patientFirst = settings.patientName.trim().split(/\s+/)[0] || "there";
  const carer = settings.carerName.trim() || "Carer";
  const carerInitials = initials(carer, "C");
  const asPatient = screen === "patient";

  const today = dateKey(now);
  const todaysDoses = dosesFor(state, today);
  const pendingDoses = todaysDoses
    .filter((dose) => dose.status === "pending")
    .sort((a, b) => a.dueAt - b.dueAt);
  const overdueDoses = pendingDoses.filter((dose) => dose.scheduledAt <= now);
  const nextDose: Dose | undefined = pendingDoses[0] ?? dosesFor(state, addDays(today, 1))[0];
  const sortedLog = [...state.log].sort((a, b) => b.recordedAt - a.recordedAt);
  const week = weekSummary(state, now);
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const lateDose = nextDose && nextDose.date === today && now - nextDose.dueAt > LATE_MS;
  const lowStock = medications.filter((medication) => {
    const days = daysOfStock(medication);
    return days !== null && days <= LOW_STOCK_DAYS;
  });

  const stockLabel = (medication: Medication) => {
    const days = daysOfStock(medication);
    if (days === null) return "";
    return medication.stock === 0
      ? "none left"
      : `${medication.stock} left, about ${days} day${days === 1 ? "" : "s"}`;
  };

  const finalReason = reason === OTHER_REASON ? otherReason.trim() : reason;
  const formTimes = form ? form.times.filter(Boolean) : [];
  const formIsComplete =
    form !== null &&
    Boolean(form.dosage.trim()) &&
    Boolean(form.quantity.trim()) &&
    formTimes.length === form.times.length;

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const showToast = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 4000);
  };

  // Fire a reminder for every dose that became due (or whose snooze ran out) since the last tick
  useEffect(() => {
    const since = lastReminderCheck.current;
    lastReminderCheck.current = now;
    if (!settings.remindersOn) return;
    const due = pendingDoses.filter((dose) => dose.dueAt > since && dose.dueAt <= now);
    if (due.length === 0) return;
    const message = `Time to give ${patient} ${due
      .map((dose) => `${dose.medication.name} (${dose.medication.dosage})`)
      .join(" and ")}.`;
    showToast(message);
    if (settings.soundAlerts) playChime();
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("AccessCare reminder", { body: message });
    }
  }, [now]);

  const updateSettings = (changes: Partial<Settings>) =>
    setState((current) => ({ ...current, settings: { ...current.settings, ...changes } }));

  const toggle = (key: ToggleKey) => () =>
    updateSettings({ [key]: !settings[key] } as Partial<Settings>);

  const setReminders = (remindersOn: boolean) => {
    updateSettings({ remindersOn });
    if (remindersOn && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    showToast(remindersOn ? "Reminders turned on." : "Reminders turned off.");
  };

  const goTo = (target: Screen) => {
    setScreen(target);
    setShowNotifications(false);
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? "auto" : "smooth" });
  };

  // Stock goes down when a dose is recorded as given and comes back if that record is removed
  const withStockUsed = (items: Medication[], dose: Dose, doses: number) =>
    items.map((medication) =>
      medication.id === dose.medication.id && medication.stock !== undefined
        ? {
            ...medication,
            stock: Math.max(0, medication.stock - doses * unitsPerDose(medication)),
          }
        : medication,
    );

  const takenCount = (log: LogEntry[], dose: Dose) =>
    log.some((entry) => entry.key === dose.key && entry.status === "taken") ? 1 : 0;

  const recordDose = (dose: Dose, status: "taken" | "missed", doseReason?: string) => {
    setState((current) => {
      const { [dose.key]: _snooze, ...snoozes } = current.snoozes;
      return {
        ...current,
        snoozes,
        medications: withStockUsed(
          current.medications,
          dose,
          (status === "taken" ? 1 : 0) - takenCount(current.log, dose),
        ),
        log: [
          ...current.log.filter((entry) => entry.key !== dose.key),
          {
            key: dose.key,
            name: dose.medication.name,
            dosage: dose.medication.dosage,
            date: dose.date,
            time: dose.time,
            status,
            reason: doseReason,
            recordedAt: Date.now(),
          },
        ],
      };
    });
    setNow(Date.now());
  };

  const markTaken = (dose: Dose) => {
    recordDose(dose, "taken");
    showToast(asPatient ? "Recorded as taken." : "Dose logged as given.");
  };

  const undoDose = (dose: Dose) => {
    setState((current) => ({
      ...current,
      medications: withStockUsed(current.medications, dose, -takenCount(current.log, dose)),
      log: current.log.filter((entry) => entry.key !== dose.key),
    }));
    showToast("Dose record removed.");
  };

  const closeReason = () => {
    setReasonFor(null);
    setReason("");
    setOtherReason("");
  };

  const saveMissed = () => {
    if (!reasonFor || !finalReason) return;
    recordDose(reasonFor, "missed", finalReason);
    closeReason();
    showToast("Not-given dose and reason saved.");
  };

  const snooze = (dose: Dose) => {
    const until = Date.now() + SNOOZE_MS;
    setState((current) => ({
      ...current,
      snoozes: { ...current.snoozes, [dose.key]: until },
    }));
    setNow(Date.now());
    showToast(
      settings.remindersOn
        ? `We'll remind you about ${dose.medication.name} in 10 minutes.`
        : "Snoozed, but reminders are off. Turn them on to be notified.",
    );
  };

  const editPrescription = (medication: Medication) =>
    setForm({
      id: medication.id,
      name: medication.name,
      purpose: medication.purpose,
      dosage: medication.dosage,
      quantity: medication.quantity,
      instructions: medication.instructions,
      times: [...medication.times],
      imageUrl: medication.imageUrl ?? "",
      stock: medication.stock?.toString() ?? "",
    });

  const savePrescription = () => {
    if (!form || !formIsComplete) return;
    const details = {
      purpose: form.purpose.trim() || "New prescription",
      dosage: form.dosage.trim(),
      quantity: form.quantity.trim(),
      instructions: form.instructions.trim() || "Follow the prescription instructions",
      imageUrl: form.imageUrl || undefined,
      times: [...new Set(formTimes)].sort(),
      stock:
        form.stock.trim() === "" || Number.isNaN(Number(form.stock))
          ? undefined
          : Math.max(0, Number(form.stock)),
    };
    setState((current) => ({
      ...current,
      medications:
        form.id === null
          ? [
              ...current.medications,
              {
                ...details,
                id: Date.now(),
                name: form.name.trim() || `Medicine ${current.medications.length + 1}`,
                color: medicationColors[current.medications.length % medicationColors.length],
                createdOn: dateKey(Date.now()),
              },
            ]
          : current.medications.map((medication) =>
              medication.id === form.id
                ? { ...medication, ...details, name: form.name.trim() || medication.name }
                : medication,
            ),
    }));
    showToast(form.id === null ? "New prescription added." : "Prescription updated.");
    setForm(null);
  };

  const removePrescription = (medication: Medication) => {
    if (
      !window.confirm(
        `Remove ${medication.name}? Doses already recorded stay in the medicine log.`,
      )
    ) {
      return;
    }
    setState((current) => ({
      ...current,
      medications: current.medications.filter((item) => item.id !== medication.id),
    }));
    showToast("Prescription removed.");
    setForm(null);
  };

  const saveIncident = () => {
    const note = incidentNote?.trim();
    if (!note) return;
    setState((current) => ({
      ...current,
      incidents: [{ id: Date.now(), note, recordedAt: Date.now() }, ...current.incidents],
    }));
    setIncidentNote(null);
    showToast("Medication incident recorded.");
  };

  const resetData = () => {
    if (!window.confirm("Replace everything with the sample care plan? This cannot be undone.")) {
      return;
    }
    setState(sampleState());
    showToast("Sample care plan restored.");
  };

  const exportLog = () => {
    if (sortedLog.length === 0) {
      showToast("There is nothing in the medicine log to download yet.");
      return;
    }
    downloadLog(sortedLog);
    showToast("Medicine log downloaded.");
  };

  const readPatientPage = () => {
    if (!("speechSynthesis" in window)) {
      showToast("Read aloud is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const dose = pendingDoses[0];
    const message = new SpeechSynthesisUtterance(
      dose
        ? `Hello ${patientFirst}. Your next medicine is ${dose.medication.name}, ${dose.medication.dosage}, at ${formatTime(dose.time)}. ${dose.medication.quantity}. ${dose.medication.instructions}.`
        : `Hello ${patientFirst}. You have no more medicines to take today.`,
    );
    message.rate = 0.85;
    window.speechSynthesis.speak(message);
  };

  const nextDoseLabel = () => {
    if (!nextDose) return "No reminders scheduled";
    if (nextDose.date !== today) return "All done for today · next reminder tomorrow";
    const prefix = settings.remindersOn ? "" : "Reminders off · ";
    if (nextDose.dueAt > now) {
      const snoozed = nextDose.dueAt !== nextDose.scheduledAt;
      return `${prefix}${snoozed ? "Snoozed" : "Next reminder"} · in ${formatDuration(nextDose.dueAt - now)}`;
    }
    const late = now - nextDose.scheduledAt;
    return `${prefix}${late < 60000 ? "Due now" : `Overdue by ${formatDuration(late)}`}`;
  };

  const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

  const callButton = (contact: string, phone: string, className: string) =>
    phone.trim() ? (
      <a className={className} href={telHref(phone)}>
        <Icon name="phone" className="h-4 w-4" />
        Call {contact} · {phone.trim()}
      </a>
    ) : (
      <button
        className={className}
        onClick={() => {
          goTo("settings");
          showToast(`Add a phone number for the ${contact} to call from here.`);
        }}
        type="button"
      >
        <Icon name="phone" className="h-4 w-4" />
        Add {contact} number
      </button>
    );

  const medicineBadge = (medication: Medication, size: string, iconSize: string) =>
    medication.imageUrl ? (
      <img
        alt={`${medication.name} packaging`}
        className={`${size} shrink-0 rounded-xl border border-[#71827D] object-cover`}
        src={medication.imageUrl}
      />
    ) : (
      <span
        aria-hidden="true"
        className={`flex ${size} shrink-0 items-center justify-center rounded-xl ${medication.color} text-white`}
      >
        <Icon name="medication" className={iconSize} />
      </span>
    );

  const sidebar = (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto bg-[#173B42] px-5 py-8 text-white lg:flex">
      <button
        className="flex items-center gap-4 rounded-xl px-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73]"
        onClick={() => goTo("dashboard")}
        type="button"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8CF73] text-[#173B42]">
          <Icon name="medication" className="h-7 w-7" />
        </span>
        <span className="text-2xl font-bold tracking-tight">AccessCare</span>
      </button>
      <nav aria-label="Main navigation" className="mt-10 space-y-2">
        {navItems.map((item) => (
          <button
            aria-current={screen === item.target ? "page" : undefined}
            className={`${sideButton} ${
              screen === item.target
                ? "bg-white text-[#173B42]"
                : "text-[#C9D7D8] hover:bg-white/10 hover:text-white"
            }`}
            key={item.label}
            onClick={() => goTo(item.target)}
            type="button"
          >
            <Icon name={item.icon} className="h-6 w-6" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-2 pt-8">
        {(
          [
            ["help", "Help & support"],
            ["settings", "Settings"],
          ] as const
        ).map(([target, label]) => (
          <button
            aria-current={screen === target ? "page" : undefined}
            className={`${sideButton} ${
              screen === target
                ? "bg-white text-[#173B42]"
                : "text-[#C9D7D8] hover:bg-white/10 hover:text-white"
            }`}
            key={target}
            onClick={() => goTo(target)}
            type="button"
          >
            <Icon name={target} className="h-6 w-6" />
            {label}
          </button>
        ))}
        <button
          className="mt-5 flex w-full items-center gap-3 border-t border-white/15 px-3 pt-6 text-left focus-visible:outline-3 focus-visible:outline-[#F8CF73]"
          onClick={() => goTo("profile")}
          type="button"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#CFE2DC] font-bold text-[#173B42]">
            {carerInitials}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold">{carer}</span>
            <span className="block text-sm text-[#C9D7D8]">Carer account</span>
          </span>
        </button>
      </div>
    </aside>
  );

  const mobileNav = (
    <nav
      aria-label="Mobile navigation"
      className="flex gap-2 overflow-x-auto border-b border-[#DDE2DE] bg-white px-4 py-3 lg:hidden"
    >
      {[
        ...navItems,
        { label: "Help", icon: "help" as const, target: "help" as const },
        { label: "Settings", icon: "settings" as const, target: "settings" as const },
        { label: "My account", icon: "user" as const, target: "profile" as const },
      ].map((item) => (
        <button
          aria-current={screen === item.target ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold focus-visible:outline-3 focus-visible:outline-[#173B42] ${
            screen === item.target ? "bg-[#173B42] text-white" : "bg-[#EEF1EE] text-[#173B42]"
          }`}
          key={item.label}
          onClick={() => goTo(item.target)}
          type="button"
        >
          <Icon name={item.icon} className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </nav>
  );

  const renderCarerPage = (
    eyebrow: string,
    title: string,
    description: string,
    content: ReactNode,
  ) => (
    <div className="min-h-screen bg-[#F7F6F1] text-[#172E35]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {sidebar}
        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center border-b border-[#DDE2DE] bg-white px-5 lg:hidden">
            <button
              className="flex items-center gap-3 rounded-xl focus-visible:outline-3 focus-visible:outline-[#173B42]"
              onClick={() => goTo("dashboard")}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173B42] text-[#F8CF73]">
                <Icon name="medication" />
              </span>
              <span className="font-bold">AccessCare</span>
            </button>
          </header>
          {mobileNav}
          <div className="px-5 py-8 md:px-10 md:py-10 xl:px-14">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-lg leading-7 text-[#526267]">{description}</p>
            <div className="mt-8">{content}</div>
          </div>
        </main>
      </div>
    </div>
  );

  const renderStandalone = (subtitle: string, actions: ReactNode, content: ReactNode) => (
    <div className="min-h-screen bg-[#F7F6F1] text-[#172E35]">
      <header className="border-b border-[#DDE2DE] bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173B42] text-[#F8CF73]">
              <Icon name="medication" />
            </div>
            <div>
              <p className="font-bold">AccessCare</p>
              <p className="text-sm text-[#526267]">{subtitle}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {actions}
            <button
              className={primaryButton}
              onClick={() => goTo("dashboard")}
              type="button"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">{content}</main>
    </div>
  );

  const renderScreen = () => {
    if (screen === "prescriptions") {
      return renderCarerPage(
        "Medication management",
        "Prescriptions",
        `Manage all ${medications.length} prescription${medications.length === 1 ? "" : "s"} for ${patient}.`,
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className={`${primaryButton} flex items-center justify-center gap-2 px-5`}
              onClick={() => setForm(emptyForm)}
              type="button"
            >
              <Icon name="plus" />
              Add prescription
            </button>
          </div>
          {medications.length === 0 && (
            <p className="mt-5 rounded-2xl border border-dashed border-[#71827D] bg-white p-6 text-base text-[#526267]">
              No prescriptions yet. Select “Add prescription” to set up {patient}’s first
              medicine.
            </p>
          )}
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {medications.map((medication) => (
              <article className={cardClass} key={medication.id}>
                <div className="flex items-start gap-4">
                  {medicineBadge(medication, "h-16 w-16", "h-7 w-7")}
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold">{medication.name}</h2>
                    <p className="mt-1 font-bold text-[#3E555A]">
                      {medication.dosage} · {medication.quantity}
                    </p>
                    <p className="mt-1 text-[#526267]">{medication.purpose}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F7F8F6] p-3">
                    <dt className="text-sm font-bold text-[#526267]">Instructions</dt>
                    <dd className="mt-1">{medication.instructions}</dd>
                  </div>
                  <div className="rounded-xl bg-[#F7F8F6] p-3">
                    <dt className="text-sm font-bold text-[#526267]">Reminder times</dt>
                    <dd className="mt-1 font-bold">
                      {medication.times.map(formatTime).join(", ")}
                    </dd>
                  </div>
                </dl>
                {medication.stock !== undefined && (
                  <p
                    className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
                      lowStock.includes(medication)
                        ? "bg-[#FAECE9] text-[#913C34]"
                        : "bg-[#E8F3EF] text-[#276D64]"
                    }`}
                  >
                    {lowStock.includes(medication) ? "Running low · " : "In stock · "}
                    {stockLabel(medication)}
                  </p>
                )}
                <div className="mt-5 flex gap-3">
                  <button
                    className={`${outlineButton} flex-1`}
                    onClick={() => editPrescription(medication)}
                    type="button"
                  >
                    Edit prescription
                  </button>
                  <button
                    aria-label={`Remove ${medication.name}`}
                    className="min-h-12 rounded-xl border-2 border-[#913C34] px-4 text-sm font-bold text-[#913C34] hover:bg-[#FAECE9] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                    onClick={() => removePrescription(medication)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>,
      );
    }

    if (screen === "reminders") {
      return renderCarerPage(
        "Daily schedule",
        "Reminders",
        `Review and manage every medication reminder for ${patient}.`,
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-labelledby="reminder-list-heading" className="space-y-4">
            <h2 id="reminder-list-heading" className="sr-only">
              Scheduled reminders
            </h2>
            {todaysDoses.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[#71827D] bg-white p-6 text-base text-[#526267]">
                No reminders are scheduled today.
              </p>
            )}
            {todaysDoses.map((dose) => (
              <article
                className="flex flex-col gap-5 rounded-2xl border border-[#DDE2DE] bg-white p-5 sm:flex-row sm:items-center"
                key={dose.key}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DDEDE7] text-[#276D64]">
                  <Icon name="bell" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold">{formatTime(dose.time)}</p>
                  <p className="mt-1 font-bold">{dose.medication.name}</p>
                  <p className="mt-1 text-sm text-[#526267]">
                    {dose.medication.dosage} · {dose.medication.quantity}
                    {dose.status === "pending" &&
                      dose.dueAt > now &&
                      dose.dueAt !== dose.scheduledAt &&
                      ` · snoozed for ${formatDuration(dose.dueAt - now)}`}
                  </p>
                </div>
                {dose.status === "pending" ? (
                  <button className={outlineButton} onClick={() => snooze(dose)} type="button">
                    Remind in 10 min
                  </button>
                ) : (
                  <span
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${
                      dose.status === "taken"
                        ? "bg-[#E8F3EF] text-[#276D64]"
                        : "bg-[#FAECE9] text-[#A14940]"
                    }`}
                  >
                    <Icon name={dose.status === "taken" ? "check" : "close"} className="h-4 w-4" />
                    {dose.status === "taken" ? "Given" : "Not given"}
                  </span>
                )}
              </article>
            ))}
          </section>
          <aside className={`${cardClass} self-start`}>
            <h2 className="text-xl font-bold">Reminder controls</h2>
            <div className="mt-4">
              <ToggleRow
                checked={settings.remindersOn}
                description="Show medication reminders while AccessCare is open."
                label="Medication reminders"
                onChange={() => setReminders(!settings.remindersOn)}
              />
              <ToggleRow
                checked={settings.soundAlerts}
                description="Play a sound when a reminder is due."
                label="Sound alerts"
                onChange={toggle("soundAlerts")}
              />
            </div>
          </aside>
        </div>,
      );
    }

    if (screen === "log") {
      return renderCarerPage(
        "Care records",
        "Medicine log",
        "Review given and not-given doses with dates, times, and recorded reasons.",
        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            aria-labelledby="full-log-heading"
            className="overflow-hidden rounded-2xl border border-[#DDE2DE] bg-white"
          >
            <div className="flex flex-col gap-3 border-b border-[#DDE2DE] p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="full-log-heading" className="text-xl font-bold">
                Recent dose activity
              </h2>
              <button className={outlineButton} onClick={exportLog} type="button">
                Export log (CSV)
              </button>
            </div>
            <LogList entries={sortedLog} now={now} />
          </section>

          <section aria-labelledby="progress-heading" className={cardClass}>
            <h2 id="progress-heading" className="text-lg font-bold">
              This week
            </h2>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight">
                  {week.rate === null ? "—" : `${week.rate}%`}
                </p>
                <p className="mt-1 text-base text-[#526267]">
                  {week.rate === null ? "No doses recorded yet" : "Doses given"}
                </p>
              </div>
              {week.change !== null && (
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    week.change < 0
                      ? "bg-[#FAECE9] text-[#A14940]"
                      : "bg-[#E8F3EF] text-[#276D64]"
                  }`}
                >
                  {week.change > 0 ? "+" : ""}
                  {week.change}% vs last week
                </span>
              )}
            </div>
            <div className="mt-7 grid grid-cols-7 gap-2">
              {week.days.map((day, index) => (
                <div className="text-center" key={index}>
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                      day === "complete"
                        ? "bg-[#41998E] text-white"
                        : day === "missed"
                          ? "bg-[#FAECE9] text-[#A14940]"
                          : "bg-[#EEF1EE] text-[#526267]"
                    }`}
                    title={
                      {
                        complete: "All doses given",
                        missed: "A dose was not given",
                        pending: "Doses still to record",
                        none: "Nothing scheduled",
                        future: "Upcoming",
                      }[day]
                    }
                  >
                    {day === "complete" || day === "missed" ? (
                      <Icon name={day === "complete" ? "check" : "close"} className="h-4 w-4" />
                    ) : day === "pending" ? (
                      <Icon name="clock" className="h-4 w-4" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#526267]">{weekDays[index]}</p>
                </div>
              ))}
            </div>
          </section>
        </div>,
      );
    }

    if (screen === "emergency") {
      return renderCarerPage(
        "Urgent support",
        "Emergency contacts",
        "Use these contacts if a dose is missed, duplicated, incorrect, or causes concern.",
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border-2 border-[#B45248] bg-[#FAECE9] p-6 lg:col-span-2">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#913C34]">
              Possible medication error
            </p>
            <h2 className="mt-2 text-2xl font-bold">Do not give another dose</h2>
            <p className="mt-2 max-w-3xl leading-7 text-[#3E555A]">
              Contact a clinician for advice. If {patient} is seriously unwell, call your local
              emergency services immediately.
            </p>
          </section>
          {(
            [
              [
                "On-call doctor",
                "Incorrect, extra, or missed doses",
                "Available 24 hours",
                settings.doctorPhone,
              ],
              [
                "Community nurse",
                "Medication guidance and care support",
                "7 AM–10 PM",
                settings.nursePhone,
              ],
            ] as const
          ).map(([name, purpose, availability, phone]) => (
            <article className={cardClass} key={name}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEDE7] text-[#276D64]">
                <Icon name="phone" />
              </span>
              <h2 className="mt-4 text-xl font-bold">{name}</h2>
              <p className="mt-2 text-[#526267]">{purpose}</p>
              <p className="mt-3 text-sm font-bold text-[#276D64]">{availability}</p>
              {callButton(
                name.toLowerCase(),
                phone,
                "mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173B42] px-5 font-bold text-white hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-[#E27064]",
              )}
            </article>
          ))}
          <button
            className="min-h-14 rounded-xl border-2 border-[#913C34] bg-white px-5 font-bold text-[#913C34] hover:bg-[#FAECE9] focus-visible:outline-3 focus-visible:outline-[#173B42] lg:col-span-2"
            onClick={() => setIncidentNote("")}
            type="button"
          >
            Record a medication incident
          </button>
          {state.incidents.length > 0 && (
            <section className={`${cardClass} lg:col-span-2`}>
              <h2 className="text-xl font-bold">Recorded incidents</h2>
              <ul className="mt-3 divide-y divide-[#DDE2DE]">
                {state.incidents.map((incident) => (
                  <li className="py-3" key={incident.id}>
                    <p className="text-sm font-bold text-[#526267]">
                      {new Date(incident.recordedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{incident.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>,
      );
    }

    if (screen === "settings") {
      return renderCarerPage(
        "Account controls",
        "Settings",
        "Manage carer notifications, care contacts, and patient accessibility preferences.",
        <div className="grid gap-7 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Carer notifications</h2>
            <div className="mt-4">
              <ToggleRow
                checked={settings.remindersOn}
                description="Be reminded when a dose is due."
                label="Medication reminders"
                onChange={() => setReminders(!settings.remindersOn)}
              />
              <ToggleRow
                checked={settings.soundAlerts}
                description="Play a sound when a reminder is due."
                label="Sound alerts"
                onChange={toggle("soundAlerts")}
              />
            </div>
            <p className="mt-3 text-sm text-[#526267]">
              {!("Notification" in window)
                ? "This browser can’t show system notifications, so reminders appear inside AccessCare only."
                : Notification.permission === "granted"
                  ? "System notifications are allowed. Keep AccessCare open in a tab to receive them."
                  : Notification.permission === "denied"
                    ? "System notifications are blocked in your browser settings, so reminders appear inside AccessCare only."
                    : "Turn reminders on to be asked for permission to show system notifications."}
            </p>
          </section>
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Patient experience</h2>
            <p className="mt-2 leading-6 text-[#526267]">
              Configure theme, text size, read aloud, colour-safe labels, simplified layout, and
              motion preferences.
            </p>
            <button
              className={`${primaryButton} mt-5 w-full`}
              onClick={() => goTo("setup")}
              type="button"
            >
              Open accessibility preferences
            </button>
          </section>
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Care contacts</h2>
            <p className="mt-2 leading-6 text-[#526267]">
              These numbers are used by the call buttons on the emergency contacts page.
            </p>
            <div className="mt-4 space-y-4">
              <Field
                inputMode="tel"
                label="On-call doctor phone"
                onChange={(event) => updateSettings({ doctorPhone: event.target.value })}
                placeholder="Phone number"
                type="tel"
                value={settings.doctorPhone}
              />
              <Field
                inputMode="tel"
                label="Community nurse phone"
                onChange={(event) => updateSettings({ nursePhone: event.target.value })}
                placeholder="Phone number"
                type="tel"
                value={settings.nursePhone}
              />
            </div>
          </section>
          <section className={cardClass}>
            <h2 className="text-xl font-bold">Your data</h2>
            <p className="mt-2 leading-6 text-[#526267]">
              Everything is stored in this browser on this device only, and saved as you type.
            </p>
            <button
              className={`${secondaryButton} mt-5 w-full`}
              onClick={resetData}
              type="button"
            >
              Restore sample data
            </button>
          </section>
        </div>,
      );
    }

    if (screen === "help") {
      return renderCarerPage(
        "Support centre",
        "Help & support",
        "Get help using AccessCare or contact the care team.",
        <div>
          <div className="grid gap-5 md:grid-cols-2">
            {(
              [
                [
                  "Medication help",
                  "Manage prescriptions, reminder times, and doses.",
                  "prescriptions",
                ],
                ["Accessibility help", "Adapt the patient experience.", "setup"],
                ["Account help", "Review consent, profiles, and permissions.", "profile"],
                ["Urgent help", "Contact a doctor or nurse about a dose.", "emergency"],
              ] as const
            ).map(([title, description, target]) => (
              <button
                className="rounded-2xl border border-[#DDE2DE] bg-white p-6 text-left hover:border-[#276D64] hover:bg-[#F7F8F6] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                key={title}
                onClick={() => goTo(target)}
                type="button"
              >
                <Icon
                  name={target === "emergency" ? "phone" : "help"}
                  className="h-7 w-7 text-[#276D64]"
                />
                <span className="mt-4 block text-xl font-bold">{title}</span>
                <span className="mt-2 block leading-6 text-[#526267]">{description}</span>
              </button>
            ))}
          </div>
          <section className={`${cardClass} mt-7`}>
            <h2 className="text-xl font-bold">How AccessCare works</h2>
            <ul className="mt-4 space-y-4 text-base leading-6 text-[#3E555A]">
              <li>
                <span className="font-bold text-[#173B42]">Recording a dose.</span> On the
                dashboard, select “Given” or “Not given” next to each dose. “Undo” removes a
                record made by mistake.
              </li>
              <li>
                <span className="font-bold text-[#173B42]">Reminders.</span> With reminders on,
                you are alerted when a dose is due while AccessCare is open. “Remind in 10 min”
                postpones one.
              </li>
              <li>
                <span className="font-bold text-[#173B42]">Patient view.</span> Patient setup
                controls how the patient view looks and whether the patient can record doses
                themselves.
              </li>
              <li>
                <span className="font-bold text-[#173B42]">Medicine log.</span> Every record is
                kept in the log, which you can export as a CSV file to share with a clinician.
              </li>
            </ul>
            <p className="mt-5 rounded-lg bg-[#FAECE9] px-3 py-2 text-sm font-bold text-[#913C34]">
              AccessCare does not give medical advice. If you are worried about a dose, contact a
              doctor or nurse.
            </p>
          </section>
        </div>,
      );
    }

    if (screen === "profile") {
      return renderStandalone(
        "Care profile",
        null,
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
                My account
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{carer}</h1>
              <p className="mt-2 text-lg text-[#526267]">
                Manage your carer details and review the patient’s care information.
              </p>
            </div>
            <button
              className={`${outlineButton} px-5`}
              onClick={() => goTo("setup")}
              type="button"
            >
              Edit patient setup
            </button>
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
            <div className="space-y-7">
              <section aria-labelledby="patient-profile-heading" className={`${cardClass} md:p-7`}>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDEDE7] text-2xl font-bold text-[#173B42]">
                    {initials(settings.patientName, "P")}
                  </div>
                  <div>
                    <h2 id="patient-profile-heading" className="text-2xl font-bold">
                      Patient information
                    </h2>
                    <p className="mt-1 text-[#526267]">Primary patient receiving care</p>
                  </div>
                </div>
                <dl className="mt-7 grid gap-5 sm:grid-cols-2">
                  {[
                    ["Full name", settings.patientName || "Not recorded"],
                    ["Age", settings.patientAge || "Not recorded"],
                    ["Prescriptions", String(medications.length)],
                    [
                      "Medication support",
                      settings.allowMedicineChanges ? "Shared management" : "Carer managed",
                    ],
                  ].map(([label, value]) => (
                    <div className="rounded-xl bg-[#F7F8F6] p-4" key={label}>
                      <dt className="text-sm font-bold text-[#526267]">{label}</dt>
                      <dd className="mt-1 text-lg font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="diagnosis-heading" className={`${cardClass} md:p-7`}>
                <h2 id="diagnosis-heading" className="text-2xl font-bold">
                  Diagnosis and care needs
                </h2>
                <div className="mt-5 space-y-5">
                  <div>
                    <h3 className="font-bold">Medical conditions and care notes</h3>
                    <p className="mt-2 rounded-xl bg-[#F7F8F6] p-4 leading-7 text-[#3E555A]">
                      {settings.medicalNeeds || "No medical conditions have been recorded."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold">Disabilities and accessibility needs</h3>
                    <p className="mt-2 rounded-xl bg-[#F7F8F6] p-4 leading-7 text-[#3E555A]">
                      {settings.disabilities || "No accessibility needs have been recorded."}
                    </p>
                  </div>
                </div>
              </section>

              <section
                aria-labelledby="profile-preferences-heading"
                className={`${cardClass} md:p-7`}
              >
                <h2 id="profile-preferences-heading" className="text-2xl font-bold">
                  Patient-view preferences
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    `Theme: ${settings.patientTheme.replace("-", " ")}`,
                    `Text size: ${settings.textSize.replace("-", " ")}`,
                    `Read aloud: ${settings.readAloud ? "enabled" : "disabled"}`,
                    `Colour-safe labels: ${settings.colourSafe ? "enabled" : "disabled"}`,
                    `Simplified layout: ${settings.simplifiedLayout ? "enabled" : "disabled"}`,
                    `Reduced motion: ${settings.reducedMotion ? "enabled" : "disabled"}`,
                  ].map((preference) => (
                    <li
                      className="flex items-center gap-2 rounded-xl border border-[#71827D] px-4 py-3 font-bold"
                      key={preference}
                    >
                      <Icon name="check" className="h-4 w-4 text-[#276D64]" />
                      {preference}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <aside className="space-y-7">
              <section
                aria-labelledby="carer-profile-heading"
                className="rounded-2xl border-2 border-[#276D64] bg-white p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#173B42] font-bold text-white">
                    {carerInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 id="carer-profile-heading" className="text-xl font-bold">
                      {carer}
                    </h2>
                    <p className="text-sm text-[#526267]">Primary carer</p>
                  </div>
                  {!editingCarer && (
                    <button
                      className={textButton}
                      onClick={() => setEditingCarer(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingCarer ? (
                  <div className="mt-6 space-y-4">
                    {(
                      [
                        ["Full name", "carerName", "text"],
                        ["Phone number", "carerPhone", "tel"],
                        ["Email address", "carerEmail", "email"],
                        ["Relationship to patient", "carerRelationship", "text"],
                        ["Availability", "carerAvailability", "text"],
                      ] as const
                    ).map(([label, key, type]) => (
                      <Field
                        key={key}
                        label={label}
                        onChange={(event) => updateSettings({ [key]: event.target.value })}
                        type={type}
                        value={settings[key]}
                      />
                    ))}
                    <button
                      className={`${primaryButton} w-full`}
                      onClick={() => {
                        setEditingCarer(false);
                        showToast("Carer details saved.");
                      }}
                      type="button"
                    >
                      Save changes
                    </button>
                  </div>
                ) : (
                  <dl className="mt-6 space-y-4">
                    {[
                      ["Phone", settings.carerPhone],
                      ["Email", settings.carerEmail],
                      ["Relationship", settings.carerRelationship],
                      ["Access level", "Medication and care management"],
                      ["Availability", settings.carerAvailability],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-sm font-bold text-[#526267]">{label}</dt>
                        <dd className="mt-1 break-words font-bold">{value || "Not recorded"}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              <section
                aria-labelledby="consent-profile-heading"
                className={`rounded-2xl border-2 p-6 ${
                  settings.consentGiven
                    ? "border-[#276D64] bg-[#E8F3EF]"
                    : "border-[#B45248] bg-[#FAECE9]"
                }`}
              >
                <h2 id="consent-profile-heading" className="text-xl font-bold">
                  Consent record
                </h2>
                <div className="mt-4 flex items-center gap-2 font-bold">
                  <Icon
                    name={settings.consentGiven ? "check" : "close"}
                    className={`h-5 w-5 ${
                      settings.consentGiven ? "text-[#276D64]" : "text-[#913C34]"
                    }`}
                  />
                  {settings.consentGiven ? "Consent recorded" : "Consent required"}
                </div>
                {settings.consentGiven ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-bold text-[#526267]">How consent was given</dt>
                      <dd className="mt-1">{settings.consentMethod}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[#526267]">Date recorded</dt>
                      <dd className="mt-1">{settings.consentDate}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 leading-6 text-[#913C34]">
                    Complete the consent section before relying on this care setup.
                  </p>
                )}
                <button
                  className={`${primaryButton} mt-5 w-full`}
                  onClick={() => goTo("setup")}
                  type="button"
                >
                  {settings.consentGiven ? "Review consent" : "Record consent"}
                </button>
              </section>
            </aside>
          </div>
        </div>,
      );
    }

    if (screen === "setup") {
      return renderStandalone(
        "Carer workspace",
        <button
          className={`${outlineButton} hidden items-center gap-2 sm:flex`}
          onClick={() => goTo("patient")}
          type="button"
        >
          <Icon name="user" className="h-4 w-4" />
          Preview patient view
        </button>,
        <>
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
              Patient setup
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Adapt AccessCare to the patient
            </h1>
            <p className="mt-3 text-lg leading-7 text-[#526267]">
              Record the patient’s needs, choose accessibility support, and decide which
              medication actions they can manage independently.
            </p>
          </div>

          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-7">
              <section aria-labelledby="patient-details-heading" className={`${cardClass} md:p-7`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDEDE7] text-[#276D64]">
                    <Icon name="user" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#276D64]">Step 1</p>
                    <h2 id="patient-details-heading" className="text-xl font-bold">
                      Patient details and needs
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <Field
                    label="Patient name"
                    onChange={(event) => updateSettings({ patientName: event.target.value })}
                    value={settings.patientName}
                  />
                  <Field
                    inputMode="numeric"
                    label="Patient age"
                    min="0"
                    onChange={(event) => updateSettings({ patientAge: event.target.value })}
                    type="number"
                    value={settings.patientAge}
                  />
                  <label className="block">
                    <span className="mb-2 block font-bold">
                      Disabilities or accessibility needs
                    </span>
                    <span className="mb-2 block text-sm text-[#526267]">
                      Describe vision, hearing, mobility, memory, learning, or communication
                      needs.
                    </span>
                    <textarea
                      className={textareaClass}
                      onChange={(event) => updateSettings({ disabilities: event.target.value })}
                      value={settings.disabilities}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block font-bold">Medical conditions or care notes</span>
                    <span className="mb-2 block text-sm text-[#526267]">
                      Only include information the care team needs to provide safe support.
                    </span>
                    <textarea
                      className={textareaClass}
                      onChange={(event) => updateSettings({ medicalNeeds: event.target.value })}
                      value={settings.medicalNeeds}
                    />
                  </label>
                </div>
              </section>

              <section
                aria-labelledby="permissions-heading"
                className="rounded-2xl border-2 border-[#276D64] bg-white p-6 md:p-7"
              >
                <p className="text-sm font-bold text-[#276D64]">Step 3</p>
                <h2 id="permissions-heading" className="mt-1 text-xl font-bold">
                  Patient access and permissions
                </h2>
                <p className="mt-2 text-base leading-6 text-[#526267]">
                  Choose what {patient} can change. The carer can change this at any time.
                </p>
                <div className="mt-4">
                  <ToggleRow
                    checked={settings.allowMedicineChanges}
                    description="Allows the patient to record taken or not taken and add medicines from the patient view."
                    label="Allow patient to manage and record medicines"
                    onChange={toggle("allowMedicineChanges")}
                  />
                </div>
                <div
                  className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${
                    settings.allowMedicineChanges
                      ? "bg-[#E8F3EF] text-[#276D64]"
                      : "bg-[#FAECE9] text-[#913C34]"
                  }`}
                >
                  {settings.allowMedicineChanges
                    ? "Patient medicine management and dose reporting are enabled."
                    : "View only. The carer must manage medicines and record every dose."}
                </div>
              </section>

              <section
                aria-labelledby="consent-heading"
                className="rounded-2xl border-2 border-[#B45248] bg-white p-6 md:p-7"
              >
                <p className="text-sm font-bold text-[#913C34]">Step 4 · Required</p>
                <h2 id="consent-heading" className="mt-1 text-xl font-bold">
                  Patient consent
                </h2>
                <p className="mt-2 leading-6 text-[#526267]">
                  Ask {patient} to review this statement. Explain it in an accessible format and
                  give them an opportunity to ask questions.
                </p>

                <blockquote className="mt-5 rounded-xl border-l-4 border-[#276D64] bg-[#F7F8F6] p-4 leading-7 text-[#172E35]">
                  “I, {patient}, consent to {carer} supporting and managing my medicines,
                  reminders, dose records, accessibility preferences, and care contacts in
                  AccessCare. I understand what access my carer will have, and that I can ask to
                  change or withdraw my consent.”
                </blockquote>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block font-bold">How consent was given</span>
                    <select
                      className={inputClass}
                      onChange={(event) => updateSettings({ consentMethod: event.target.value })}
                      value={settings.consentMethod}
                    >
                      <option>Confirmed directly by patient</option>
                      <option>Written consent</option>
                      <option>Verbal consent with witness</option>
                      <option>Authorised representative</option>
                    </select>
                  </label>
                  <Field
                    label="Date consent recorded"
                    onChange={(event) => updateSettings({ consentDate: event.target.value })}
                    type="date"
                    value={settings.consentDate}
                  />
                </div>

                <label
                  className={`mt-5 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
                    settings.consentGiven
                      ? "border-[#276D64] bg-[#E8F3EF]"
                      : "border-[#71827D] bg-white"
                  }`}
                >
                  <input
                    checked={settings.consentGiven}
                    className="mt-0.5 h-6 w-6 shrink-0 accent-[#276D64]"
                    onChange={(event) => updateSettings({ consentGiven: event.target.checked })}
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-bold">
                      I confirm that {patient} gave informed consent for this care arrangement.
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[#526267]">
                      Consent was freely given after the access and responsibilities were
                      explained in a way the patient could understand.
                    </span>
                  </span>
                </label>
              </section>
            </div>

            <section aria-labelledby="accessibility-heading" className={`${cardClass} md:p-7`}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDEDE7] text-[#276D64]">
                  <Icon name="settings" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#276D64]">Step 2</p>
                  <h2 id="accessibility-heading" className="text-xl font-bold">
                    Accessibility preferences
                  </h2>
                </div>
              </div>

              <fieldset className="mt-7">
                <legend className="font-bold">Theme and contrast</legend>
                <p className="mt-1 text-sm text-[#526267]">
                  Choose the most comfortable background and contrast level.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["light", "Light"],
                      ["high-contrast", "High contrast"],
                      ["dark", "Dark"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      aria-pressed={settings.patientTheme === value}
                      className={`min-h-14 rounded-xl border-2 px-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42] ${
                        settings.patientTheme === value
                          ? "border-[#276D64] bg-[#E8F3EF] text-[#173B42]"
                          : "border-[#71827D] bg-white text-[#526267]"
                      }`}
                      key={value}
                      onClick={() => updateSettings({ patientTheme: value })}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className="font-bold">Text size</legend>
                <p className="mt-1 text-sm text-[#526267]">
                  The patient can still zoom using their browser or device.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["standard", "Standard", "text-sm"],
                      ["large", "Large", "text-base"],
                      ["extra-large", "Extra large", "text-lg"],
                    ] as const
                  ).map(([value, label, size]) => (
                    <button
                      aria-pressed={settings.textSize === value}
                      className={`min-h-14 rounded-xl border-2 px-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42] ${size} ${
                        settings.textSize === value
                          ? "border-[#276D64] bg-[#E8F3EF] text-[#173B42]"
                          : "border-[#71827D] bg-white text-[#526267]"
                      }`}
                      key={value}
                      onClick={() => updateSettings({ textSize: value })}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-7">
                <ToggleRow
                  checked={settings.readAloud}
                  description="Shows a control that reads medication instructions out loud."
                  label="Read aloud"
                  onChange={toggle("readAloud")}
                />
                <ToggleRow
                  checked={settings.colourSafe}
                  description="Uses icons and written labels so meaning never depends on colour alone."
                  label="Colour-safe status indicators"
                  onChange={toggle("colourSafe")}
                />
                <ToggleRow
                  checked={settings.simplifiedLayout}
                  description="Reduces secondary information and keeps one clear action per section."
                  label="Simplified patient layout"
                  onChange={toggle("simplifiedLayout")}
                />
                <ToggleRow
                  checked={settings.reducedMotion}
                  description="Removes non-essential transitions and animated movement."
                  label="Reduce motion"
                  onChange={toggle("reducedMotion")}
                />
              </div>
            </section>
          </div>

          <div className="mt-8 flex flex-col justify-end gap-3 rounded-2xl bg-[#173B42] p-5 sm:flex-row">
            <button
              className="min-h-12 rounded-xl border-2 border-white px-5 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73]"
              onClick={() => goTo("patient")}
              type="button"
            >
              Preview patient view
            </button>
            <button
              className="min-h-12 rounded-xl bg-[#F8CF73] px-6 text-sm font-bold text-[#173B42] enabled:hover:bg-white disabled:cursor-not-allowed disabled:bg-[#C9D0CE] disabled:text-[#526267] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              disabled={!settings.consentGiven || !settings.consentDate}
              onClick={() => {
                goTo("dashboard");
                showToast("Patient setup saved.");
              }}
              type="button"
            >
              {settings.consentGiven ? "Save patient setup" : "Consent required to save"}
            </button>
          </div>
        </>,
      );
    }

    if (screen === "patient") {
      const isDark = settings.patientTheme === "dark";
      const isHighContrast = settings.patientTheme === "high-contrast";
      const pageClass = isDark
        ? "bg-[#102C33] text-white"
        : isHighContrast
          ? "bg-white text-[#0B1E23]"
          : "bg-[#F7F6F1] text-[#172E35]";
      const panelClass = isDark
        ? "border-[#AFC1C3] bg-[#173B42]"
        : isHighContrast
          ? "border-[#172E35] bg-white"
          : "border-[#DDE2DE] bg-white";
      const secondaryClass = isDark ? "text-[#D5E0DE]" : "text-[#3E555A]";
      const accentClass = isDark ? "text-[#F8CF73]" : "text-[#276D64]";
      const sizeClass =
        settings.textSize === "extra-large"
          ? "[&_p]:!text-xl [&_p]:!leading-relaxed [&_span]:!text-xl [&_button]:!text-xl [&_a]:!text-xl [&_h1]:!text-5xl md:[&_h1]:!text-6xl [&_h2]:!text-4xl"
          : settings.textSize === "large"
            ? "[&_p]:!text-lg [&_p]:!leading-relaxed [&_span]:!text-lg [&_button]:!text-lg [&_a]:!text-lg"
            : "text-base";
      const dose = pendingDoses[0];
      const takenToday = todaysDoses.filter((item) => item.status === "taken").length;
      const helpButton =
        "mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#913C34] px-5 font-bold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73]";

      return (
        <div
          className={`min-h-screen ${pageClass} ${sizeClass} ${
            settings.reducedMotion ? "[&_*]:transition-none" : ""
          }`}
        >
          <header
            className={`border-b-2 ${isDark ? "border-[#AFC1C3] bg-[#173B42]" : "border-[#172E35] bg-white"}`}
          >
            <div className="mx-auto flex min-h-20 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isDark ? "bg-[#F8CF73] text-[#173B42]" : "bg-[#173B42] text-[#F8CF73]"
                  }`}
                >
                  <Icon name="medication" />
                </div>
                <div>
                  <p className="font-bold">AccessCare</p>
                  <p className={`text-sm ${secondaryClass}`}>Patient view</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.readAloud && (
                  <button
                    className={`min-h-12 rounded-xl border-2 px-4 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 ${
                      isDark
                        ? "border-white text-white focus-visible:outline-[#F8CF73]"
                        : "border-[#276D64] text-[#276D64] focus-visible:outline-[#173B42]"
                    }`}
                    onClick={readPatientPage}
                    type="button"
                  >
                    Read page aloud
                  </button>
                )}
                <button
                  className="min-h-12 rounded-xl bg-[#F8CF73] px-4 font-bold text-[#173B42] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                  onClick={() => goTo("dashboard")}
                  type="button"
                >
                  Carer dashboard
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
            <p className={`font-bold ${accentClass}`}>Today’s medicines</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Hello, {patientFirst}
            </h1>
            <p className={`mt-3 leading-7 ${secondaryClass}`}>
              Here is what you need to do next. Ask your carer if you are unsure.
            </p>

            <section
              aria-labelledby="patient-next-dose"
              className={`mt-8 rounded-2xl border-2 p-6 md:p-8 ${panelClass}`}
            >
              {dose ? (
                <>
                  <p className={`font-bold uppercase tracking-[0.08em] ${accentClass}`}>
                    {dose.scheduledAt <= now ? "Due now" : "Next medicine"} ·{" "}
                    {formatTime(dose.time)}
                  </p>
                  <h2 id="patient-next-dose" className="mt-3 text-3xl font-bold">
                    {dose.medication.name}
                  </h2>
                  <p className={`mt-2 text-xl font-bold ${secondaryClass}`}>
                    {dose.medication.dosage} · {dose.medication.quantity}
                  </p>
                  <p className={`mt-4 leading-7 ${secondaryClass}`}>
                    {dose.medication.instructions}
                  </p>
                  {!settings.allowMedicineChanges ? (
                    <div
                      className={`mt-6 rounded-xl border-2 p-5 ${
                        isDark
                          ? "border-[#F8CF73] bg-[#102C33] text-white"
                          : "border-[#71827D] bg-[#EEF1EE] text-[#172E35]"
                      }`}
                    >
                      <p className="font-bold">Dose reporting is managed by your carer</p>
                      <p className={`mt-2 text-base leading-6 ${secondaryClass}`}>
                        You can view this medicine, but only {carer} can record whether it was
                        taken or not taken.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <button
                        className={`min-h-16 rounded-xl px-6 text-lg font-bold focus-visible:outline-4 focus-visible:outline-offset-2 ${
                          isDark
                            ? "bg-[#F8CF73] text-[#173B42] focus-visible:outline-white"
                            : "bg-[#173B42] text-white focus-visible:outline-[#E27064]"
                        }`}
                        onClick={() => markTaken(dose)}
                        type="button"
                      >
                        I have taken this medicine
                      </button>
                      <button
                        className={`min-h-16 rounded-xl border-2 px-6 text-lg font-bold focus-visible:outline-4 focus-visible:outline-offset-2 ${
                          isDark
                            ? "border-white text-white focus-visible:outline-[#F8CF73]"
                            : "border-[#913C34] text-[#913C34] focus-visible:outline-[#173B42]"
                        }`}
                        onClick={() => setReasonFor(dose)}
                        type="button"
                      >
                        I did not take it
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 id="patient-next-dose" className="text-3xl font-bold">
                    {todaysDoses.length === 0
                      ? "No medicines today"
                      : "All done for today"}
                  </h2>
                  <div
                    className={`mt-6 flex min-h-16 items-center justify-center gap-3 rounded-xl border-2 px-5 text-lg font-bold ${
                      isDark
                        ? "border-white bg-white text-[#173B42]"
                        : "border-[#276D64] bg-[#E8F3EF] text-[#276D64]"
                    }`}
                    role="status"
                  >
                    <Icon name="check" />
                    {todaysDoses.length === 0
                      ? "Nothing is scheduled"
                      : "Every medicine has been recorded"}
                  </div>
                </>
              )}
            </section>

            {!settings.simplifiedLayout && (
              <section
                aria-labelledby="patient-summary"
                className={`mt-6 rounded-2xl border-2 p-6 ${panelClass}`}
              >
                <h2 id="patient-summary" className="text-2xl font-bold">
                  Your medicine summary
                </h2>
                <p className={`mt-2 ${secondaryClass}`}>
                  You have {todaysDoses.length} medicine{todaysDoses.length === 1 ? "" : "s"}{" "}
                  scheduled today. {takenToday} taken, {pendingDoses.length} still to go.
                </p>
                <ul className="mt-4 space-y-2">
                  {todaysDoses.map((item) => (
                    <li className="flex items-center gap-3 font-bold" key={item.key}>
                      <Icon
                        name={
                          item.status === "taken"
                            ? "check"
                            : item.status === "missed"
                              ? "close"
                              : "clock"
                        }
                      />
                      <span>
                        {formatTime(item.time)} · {item.medication.name}
                        {settings.colourSafe &&
                          ` · ${item.status === "taken" ? "Taken" : item.status === "missed" ? "Not taken" : "To take"}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section
                aria-labelledby="patient-permissions"
                className={`rounded-2xl border-2 p-6 ${panelClass}`}
              >
                <h2 id="patient-permissions" className="text-2xl font-bold">
                  My medicines
                </h2>
                <p className={`mt-2 leading-6 ${secondaryClass}`}>
                  {settings.allowMedicineChanges
                    ? "You can record doses, add a new medicine, or ask your carer for help."
                    : "Your carer manages prescription changes and records doses. You can view your medicine schedule."}
                </p>
                {settings.allowMedicineChanges ? (
                  <button
                    className={`mt-5 min-h-14 w-full rounded-xl px-5 font-bold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#E27064] ${
                      isDark ? "bg-[#F8CF73] text-[#173B42]" : "bg-[#173B42] text-white"
                    }`}
                    onClick={() => setForm(emptyForm)}
                    type="button"
                  >
                    Add a medicine
                  </button>
                ) : (
                  <div
                    className={`mt-5 rounded-xl px-4 py-3 font-bold ${
                      isDark ? "bg-white text-[#173B42]" : "bg-[#EEF1EE] text-[#3E555A]"
                    }`}
                  >
                    Medicine changes are managed by your carer.
                  </div>
                )}
              </section>

              <section
                aria-labelledby="patient-help"
                className={`rounded-2xl border-2 p-6 ${panelClass}`}
              >
                <h2 id="patient-help" className="text-2xl font-bold">
                  Need help?
                </h2>
                <p className={`mt-2 leading-6 ${secondaryClass}`}>
                  Tell your carer if you feel unwell or think you took the wrong dose.
                </p>
                {settings.carerPhone.trim() ? (
                  <a className={helpButton} href={telHref(settings.carerPhone)}>
                    <Icon name="phone" />
                    Call {carer}
                  </a>
                ) : (
                  <button className={helpButton} onClick={() => goTo("emergency")} type="button">
                    <Icon name="phone" />
                    Contact my carer
                  </button>
                )}
              </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                settings.colourSafe && "Icons and labels enabled",
                settings.reducedMotion && "Reduced motion",
              ]
                .filter(Boolean)
                .map((label) => (
                  <span
                    className={`rounded-full border-2 px-3 py-2 text-sm font-bold ${
                      isDark ? "border-white" : "border-[#276D64] text-[#276D64]"
                    }`}
                    key={String(label)}
                  >
                    {label}
                  </span>
                ))}
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F7F6F1] text-[#172E35]">
        <div className="mx-auto flex min-h-screen max-w-[1600px]">
          {sidebar}
          <main className="min-w-0 flex-1">
            <header className="relative z-30 flex min-h-20 items-center justify-between border-b border-[#DDE2DE] bg-[#F7F6F1] px-5 md:px-10">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173B42] text-[#F8CF73]">
                  <Icon name="medication" />
                </div>
                <span className="hidden font-bold sm:block">AccessCare</span>
              </div>
              <p className="hidden text-sm font-semibold text-[#526267] lg:block">
                {new Date(now).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <div className="ml-auto flex items-center gap-3">
                <button
                  aria-label={settings.remindersOn ? "Turn reminders off" : "Turn reminders on"}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42] ${
                    settings.remindersOn
                      ? "border-[#BCD8D1] bg-[#E8F3EF] text-[#276D64]"
                      : "border-[#71827D] bg-white text-[#526267]"
                  }`}
                  onClick={() => setReminders(!settings.remindersOn)}
                  type="button"
                >
                  <Icon name="bell" className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Reminders {settings.remindersOn ? "on" : "off"}
                  </span>
                </button>
                <div className="relative">
                  <button
                    aria-expanded={showNotifications}
                    aria-label={`View notifications (${overdueDoses.length})`}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#71827D] bg-white hover:bg-[#EEF1EE] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                    onClick={() => setShowNotifications((open) => !open)}
                    type="button"
                  >
                    <Icon name="bell" />
                    {overdueDoses.length > 0 && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#E27064] ring-2 ring-white" />
                    )}
                  </button>
                  {showNotifications && (
                    <>
                      <button
                        aria-label="Close notifications"
                        className="fixed inset-0 cursor-default"
                        onClick={() => setShowNotifications(false)}
                        type="button"
                      />
                      <div className="absolute right-0 top-13 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#E1E4E1] bg-white p-4 shadow-xl">
                        <h2 className="text-lg font-bold">Notifications</h2>
                        {overdueDoses.length === 0 ? (
                          <p className="mt-2 text-base text-[#526267]">
                            You’re all caught up. No doses are waiting to be recorded.
                          </p>
                        ) : (
                          <ul className="mt-2 divide-y divide-[#ECEEEC]">
                            {overdueDoses.map((dose) => (
                              <li className="px-2 py-3" key={dose.key}>
                                <span className="block text-base font-bold">
                                  {dose.medication.name} · {dose.medication.dosage}
                                </span>
                                <span className="block text-sm text-[#A14940]">
                                  Due at {formatTime(dose.time)} ·{" "}
                                  {dose.dueAt > now
                                    ? `snoozed for ${formatDuration(dose.dueAt - now)}`
                                    : `${formatDuration(now - dose.scheduledAt)} ago`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {mobileNav}

            <div className="px-5 py-8 md:px-10 md:py-10 xl:px-14">
              <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-[#276D64]">
                    {patient}’s care plan · fictional medicines
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-[#173B42] md:text-4xl">
                    {greeting}, {carer.split(/\s+/)[0]}
                  </h1>
                  <p className="mt-2 text-base text-[#526267]">
                    {todaysDoses.length === 0
                      ? `${patient} has no doses scheduled today.`
                      : `${patient} has ${todaysDoses.length} dose${todaysDoses.length === 1 ? "" : "s"} scheduled today, ${pendingDoses.length} still to record.`}
                  </p>
                </div>
                <button
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#173B42] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                  onClick={() => setForm(emptyForm)}
                  type="button"
                >
                  <Icon name="plus" />
                  Add prescription
                </button>
              </section>

              {!settings.consentGiven && (
                <button
                  className="mt-6 flex w-full items-center gap-3 rounded-2xl border-2 border-[#B45248] bg-[#FAECE9] p-4 text-left font-bold text-[#913C34] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                  onClick={() => goTo("setup")}
                  type="button"
                >
                  <Icon name="document" className="h-5 w-5 shrink-0" />
                  Patient consent has not been recorded yet. Open patient setup to record it.
                </button>
              )}

              {lowStock.length > 0 && (
                <button
                  className="mt-6 flex w-full items-start gap-3 rounded-2xl border-2 border-[#936315] bg-[#FBF1DC] p-4 text-left font-bold text-[#6B4A10] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                  onClick={() => goTo("prescriptions")}
                  type="button"
                >
                  <Icon name="medication" className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    Refill needed soon:{" "}
                    {lowStock
                      .map((medication) => `${medication.name} (${stockLabel(medication)})`)
                      .join("; ")}
                    .
                  </span>
                </button>
              )}

              <section
                aria-labelledby="next-dose-heading"
                className={`mt-8 overflow-hidden rounded-2xl ${
                  lateDose ? "border-2 border-[#B45248] bg-[#FAECE9]" : "bg-[#DDEDE7]"
                }`}
                role={lateDose ? "alert" : undefined}
              >
                <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-7">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm ${
                        lateDose ? "bg-[#913C34] text-white" : "bg-white text-[#276D64]"
                      }`}
                    >
                      <Icon name="bell" className="h-6 w-6" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-bold uppercase tracking-[0.1em] ${
                          lateDose ? "text-[#913C34]" : "text-[#276D64]"
                        }`}
                      >
                        {nextDoseLabel()}
                      </p>
                      <h2 id="next-dose-heading" className="mt-1 text-xl font-bold">
                        {nextDose
                          ? `${nextDose.medication.name}, ${nextDose.medication.dosage}`
                          : "Add a prescription to start getting reminders"}
                      </h2>
                      {nextDose && (
                        <p className="mt-1 text-base font-medium text-[#3E555A]">
                          {formatTime(nextDose.time)} · {nextDose.medication.quantity} ·{" "}
                          {nextDose.medication.instructions}
                        </p>
                      )}
                      {lateDose && (
                        <p className="mt-2 text-base font-bold text-[#913C34]">
                          This dose is more than 30 minutes late. Record it below, or get
                          clinical advice before giving it. Never double the next dose.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                  {lateDose &&
                    callButton(
                      "on-call doctor",
                      settings.doctorPhone,
                      "flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#913C34] px-5 text-sm font-bold text-white hover:bg-[#7A3029] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]",
                    )}
                  {nextDose?.date === today && (
                    <button
                      className="min-h-11 rounded-xl border-2 border-[#276D64] bg-transparent px-5 text-sm font-bold text-[#276D64] hover:bg-white/60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                      onClick={() => snooze(nextDose)}
                      type="button"
                    >
                      Remind me in 10 min
                    </button>
                  )}
                  </div>
                </div>
              </section>

              <section aria-labelledby="schedule-heading" className="mt-8">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2 id="schedule-heading" className="text-2xl font-bold">
                      Today’s prescriptions
                    </h2>
                    <p className="mt-1 text-base text-[#526267]">
                      Record whether each dose was “Given” or “Not given.”
                    </p>
                  </div>
                  <button
                    className="hidden min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-[#173B42] sm:flex"
                    onClick={() => goTo("prescriptions")}
                    type="button"
                  >
                    Manage prescriptions
                    <Icon name="chevron" className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {todaysDoses.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-[#71827D] bg-white p-6 text-base text-[#526267]">
                      No prescriptions yet. Select “Add prescription” to set up {patient}’s first
                      medicine.
                    </p>
                  )}
                  {todaysDoses.map((dose) => {
                    const { medication } = dose;
                    const [time, period] = formatTime(dose.time).split(" ");
                    return (
                      <article
                        key={dose.key}
                        className={`rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(23,59,66,0.04)] transition md:p-6 ${
                          dose.status === "taken"
                            ? "border-[#B7D7CF]"
                            : dose.status === "missed"
                              ? "border-[#E5C4BF]"
                              : "border-[#E1E4E1]"
                        }`}
                      >
                        <div className="flex flex-col gap-5 md:flex-row md:items-center">
                          <div className="flex min-w-0 flex-1 items-start gap-4">
                            <div className="mt-1">
                              {medicineBadge(medication, "h-12 w-12", "h-6 w-6")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold">{medication.name}</h3>
                                <span className="rounded-full bg-[#EEF1EE] px-2.5 py-1 text-sm font-semibold text-[#526267]">
                                  {medication.purpose}
                                </span>
                              </div>
                              <p className="mt-1 font-bold text-[#3E555A]">
                                {medication.dosage} · {medication.quantity}
                              </p>
                              <p className="mt-1 text-base text-[#526267]">
                                {medication.instructions}
                              </p>
                              {medication.times.length > 1 && (
                                <p className="mt-2 text-sm font-bold text-[#276D64]">
                                  {medication.times.length} daily reminders:{" "}
                                  {medication.times.map(formatTime).join(", ")}
                                </p>
                              )}
                              {dose.entry?.reason && (
                                <p className="mt-2 text-sm font-bold text-[#A14940]">
                                  Reason: {dose.entry.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 border-t border-[#ECEEEC] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                            <div className="w-16 text-center">
                              <p className="text-xl font-bold">{time}</p>
                              <p className="text-sm font-bold text-[#526267]">{period}</p>
                            </div>
                            {dose.status === "pending" ? (
                              <div className="flex flex-1 gap-2 md:flex-none">
                                <button
                                  aria-label={`Mark ${medication.name} as given to ${patient}`}
                                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064] md:flex-none"
                                  onClick={() => markTaken(dose)}
                                  type="button"
                                >
                                  <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-white">
                                    <Icon name="check" className="h-3 w-3" />
                                  </span>
                                  Given
                                </button>
                                <button
                                  aria-label={`Mark ${medication.name} as not given to ${patient}`}
                                  className="min-h-12 rounded-xl border border-[#71827D] px-3 text-sm font-bold text-[#526267] hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                                  onClick={() => setReasonFor(dose)}
                                  type="button"
                                >
                                  Not given
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-1 items-center gap-2 md:flex-none">
                                <div
                                  className={`flex min-h-12 min-w-36 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${
                                    dose.status === "taken"
                                      ? "bg-[#E8F3EF] text-[#276D64]"
                                      : "bg-[#FAECE9] text-[#A14940]"
                                  }`}
                                >
                                  <Icon
                                    name={dose.status === "taken" ? "check" : "close"}
                                    className="h-4 w-4"
                                  />
                                  {dose.status === "taken" ? "Given" : "Not given"}
                                </div>
                                <button
                                  aria-label={`Undo the record for ${medication.name}`}
                                  className={textButton}
                                  onClick={() => undoDose(dose)}
                                  type="button"
                                >
                                  Undo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderScreen()}

      {form && (
        <Modal
          description={
            form.id === null
              ? `Leave the name blank to add it as Medicine ${medications.length + 1}.`
              : "Changes apply to today’s doses and future reminders."
          }
          eyebrow="Manage prescriptions"
          onClose={() => setForm(null)}
          size="max-w-lg"
          title={form.id === null ? "Add a new prescription" : "Edit prescription"}
        >
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-base font-bold">
                Medicine photo <span className="font-normal text-[#526267]">(optional)</span>
              </span>
              <span className="flex min-h-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#71827D] bg-[#F7F8F6] p-4 text-center transition hover:bg-[#EEF1EE] focus-within:border-[#276D64] focus-within:ring-3 focus-within:ring-[#BCD8D1]">
                <input
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    toThumbnail(file).then(
                      (imageUrl) => setForm((current) => current && { ...current, imageUrl }),
                      () => showToast("That photo could not be read. Try a different image."),
                    );
                  }}
                  type="file"
                />
                {form.imageUrl ? (
                  <span className="flex items-center gap-4">
                    <img
                      alt="Selected medicine preview"
                      className="h-20 w-20 rounded-xl border border-[#71827D] object-cover"
                      src={form.imageUrl}
                    />
                    <span className="text-left">
                      <span className="block font-bold text-[#173B42]">Photo added</span>
                      <span className="mt-1 block text-sm text-[#526267]">
                        Select to choose a different photo
                      </span>
                    </span>
                  </span>
                ) : (
                  <span>
                    <Icon name="image" className="mx-auto h-7 w-7 text-[#276D64]" />
                    <span className="mt-2 block font-bold text-[#173B42]">
                      Add a photo of the medicine
                    </span>
                    <span className="mt-1 block text-sm text-[#526267]">
                      Use a clear photo of the packaging or label
                    </span>
                  </span>
                )}
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                optional
                placeholder={`Medicine ${medications.length + 1}`}
                value={form.name}
              />
              <Field
                label="What it’s for"
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
                optional
                placeholder="For example: Blood pressure"
                value={form.purpose}
              />
              <Field
                label="Dosage"
                onChange={(event) => setForm({ ...form, dosage: event.target.value })}
                placeholder="For example: 20 mg"
                value={form.dosage}
              />
              <Field
                label="Quantity"
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                placeholder="For example: 1 tablet"
                value={form.quantity}
              />
            </div>

            <Field
              inputMode="numeric"
              label="Tablets or doses left"
              min="0"
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              optional
              placeholder="For example: 28. Leave blank to skip refill alerts"
              type="number"
              value={form.stock}
            />

            <Field
              label="Instructions"
              onChange={(event) => setForm({ ...form, instructions: event.target.value })}
              optional
              placeholder="For example: Take with food"
              value={form.instructions}
            />

            <fieldset>
              <legend className="mb-2 text-base font-bold">Reminder times</legend>
              <p className="mb-3 text-sm text-[#526267]">
                Add every time this medicine should be given.
              </p>
              <div className="space-y-3">
                {form.times.map((reminderTime, index) => (
                  <div className="flex items-center gap-2" key={index}>
                    <label className="sr-only" htmlFor={`reminder-${index}`}>
                      Reminder time {index + 1}
                    </label>
                    <input
                      className={`${inputClass} min-w-0 flex-1`}
                      id={`reminder-${index}`}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          times: form.times.map((time, timeIndex) =>
                            timeIndex === index ? event.target.value : time,
                          ),
                        })
                      }
                      type="time"
                      value={reminderTime}
                    />
                    {form.times.length > 1 && (
                      <button
                        aria-label={`Remove reminder time ${index + 1}`}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#71827D] text-[#913C34] hover:bg-[#FAECE9] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                        onClick={() =>
                          setForm({
                            ...form,
                            times: form.times.filter((_, timeIndex) => timeIndex !== index),
                          })
                        }
                        type="button"
                      >
                        <Icon name="close" className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="mt-3 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                onClick={() => setForm({ ...form, times: [...form.times, ""] })}
                type="button"
              >
                <Icon name="plus" className="h-4 w-4" />
                Add another reminder time
              </button>
            </fieldset>
          </div>

          <div className="mt-7 flex gap-3">
            <button
              className={`${secondaryButton} flex-1`}
              onClick={() => setForm(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${primaryButton} flex-1`}
              disabled={!formIsComplete}
              onClick={savePrescription}
              type="button"
            >
              {form.id === null ? "Add prescription" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}

      {reasonFor !== null && (
        <Modal
          alert
          description={
            asPatient
              ? `Tell us why you did not take ${reasonFor.medication.name}. This will be added to your care log.`
              : `Record what happened when you offered ${reasonFor.medication.name} to ${patient}. This information will be added to the care log.`
          }
          eyebrow={asPatient ? "Dose not taken" : "Dose not given"}
          onClose={closeReason}
          title={asPatient ? "Why was this dose not taken?" : "Why was this dose not given?"}
        >
          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Reason the dose was not given to {patient}</legend>
            {(asPatient
              ? [
                  "I did not want to take it",
                  "I was asleep",
                  "I felt unwell",
                  "The medicine was unavailable",
                  "A doctor or nurse told me not to take it",
                  OTHER_REASON,
                ]
              : [
                  `${patient} refused to take the medicine`,
                  `${patient} was asleep`,
                  `${patient} felt unwell`,
                  "The medicine was unavailable",
                  "The dose was withheld following clinical advice",
                  "I was unable to administer the medicine",
                  OTHER_REASON,
                ]
            ).map((option) => (
              <label
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-semibold transition ${
                  reason === option
                    ? "border-[#276D64] bg-[#E8F3EF] text-[#173B42]"
                    : "border-[#71827D] hover:bg-[#F7F8F6]"
                }`}
                key={option}
              >
                <input
                  checked={reason === option}
                  className="h-5 w-5 accent-[#276D64]"
                  name="missed-reason"
                  onChange={() => setReason(option)}
                  type="radio"
                  value={option}
                />
                {option}
              </label>
            ))}
            {reason === OTHER_REASON && (
              <input
                aria-label="Describe the reason"
                autoFocus
                className={inputClass}
                onChange={(event) => setOtherReason(event.target.value)}
                placeholder="Describe what happened"
                type="text"
                value={otherReason}
              />
            )}
          </fieldset>
          <div className="mt-7 flex gap-3">
            <button className={`${secondaryButton} flex-1`} onClick={closeReason} type="button">
              Cancel
            </button>
            <button
              className={`${primaryButton} flex-1`}
              disabled={!finalReason}
              onClick={saveMissed}
              type="button"
            >
              Save to care log
            </button>
          </div>
        </Modal>
      )}

      {incidentNote !== null && (
        <Modal
          alert
          description="Describe what happened, including the medicine, the dose, and the time. Contact a clinician if you have not already."
          eyebrow="Medication incident"
          onClose={() => setIncidentNote(null)}
          size="max-w-lg"
          title="Record a medication incident"
        >
          <textarea
            aria-label="What happened"
            autoFocus
            className={`${textareaClass} mt-6`}
            onChange={(event) => setIncidentNote(event.target.value)}
            placeholder="For example: Medicine 2 was given twice at 8:30 AM"
            value={incidentNote}
          />
          <div className="mt-5 flex gap-3">
            <button
              className={`${secondaryButton} flex-1`}
              onClick={() => setIncidentNote(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`${primaryButton} flex-1`}
              disabled={!incidentNote.trim()}
              onClick={saveIncident}
              type="button"
            >
              Save incident
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] flex min-h-12 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl bg-[#173B42] px-5 py-3 text-sm font-bold text-white shadow-xl"
          role="status"
        >
          <Icon name="check" className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}
    </>
  );
}
