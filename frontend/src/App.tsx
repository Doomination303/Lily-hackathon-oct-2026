import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon, type IconProps } from "./Icon";
import {
  addDays,
  dateKey,
  dosesFor,
  formatDuration,
  formatLogTime,
  formatTime,
  loadState,
  logToCsv,
  medicationColors,
  sampleState,
  saveState,
  weekSummary,
  type CareState,
  type Dose,
  type LogEntry,
  type Medication,
  type Settings,
} from "./care";

type NavTarget =
  | "dashboard"
  | "prescriptions"
  | "next-reminder"
  | "medicine-log"
  | "emergency-contacts";

const navItems: Array<{
  label: string;
  icon: IconProps["name"];
  target: NavTarget;
}> = [
  { label: "Dashboard", icon: "home", target: "dashboard" },
  { label: "Prescriptions", icon: "medication", target: "prescriptions" },
  { label: "Reminders", icon: "calendar", target: "next-reminder" },
  { label: "Medicine log", icon: "document", target: "medicine-log" },
  { label: "Emergency contacts", icon: "phone", target: "emergency-contacts" },
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
};

type Panel = "settings" | "help" | "log" | null;

const OTHER_REASON = "Other reason";
const SNOOZE_MS = 10 * 60 * 1000;
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

const inputClass =
  "min-h-12 w-full rounded-xl border-2 border-[#71827D] bg-white px-4 text-base text-[#172E35] outline-none placeholder:text-[#6A787C] focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]";
const primaryButton =
  "min-h-12 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white enabled:hover:bg-[#24515A] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]";
const secondaryButton =
  "min-h-12 rounded-xl border border-[#71827D] px-4 text-sm font-bold hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]";
const textButton =
  "min-h-10 rounded-lg px-2 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-[#173B42]";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102C33]/55 p-4"
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

function LogList({ entries, now }: { entries: LogEntry[]; now: number }) {
  if (entries.length === 0) {
    return <p className="mt-4 text-base text-[#526267]">No doses have been recorded yet.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-[#ECEEEC]">
      {entries.map((entry) => {
        const given = entry.status === "taken";
        return (
          <li className="flex items-center gap-3 py-4" key={entry.key}>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                given ? "bg-[#E8F3EF] text-[#276D64]" : "bg-[#FAECE9] text-[#A14940]"
              }`}
            >
              <Icon name={given ? "check" : "close"} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">
                {entry.name} · {entry.dosage}
              </p>
              <p className="text-sm text-[#526267]">
                {formatLogTime(entry, now)}
                {entry.reason && ` · ${entry.reason}`}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm font-bold ${given ? "text-[#276D64]" : "text-[#913C34]"}`}
            >
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
  const [activeNav, setActiveNav] = useState<NavTarget>("dashboard");
  const [form, setForm] = useState<PrescriptionForm | null>(null);
  const [reasonFor, setReasonFor] = useState<Dose | null>(null);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWeekMenu, setShowWeekMenu] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const lastReminderCheck = useRef(Date.now());

  const { medications, settings } = state;
  const patient = settings.patientName.trim() || "the patient";
  const carer = settings.carerName.trim() || "Carer";
  const carerInitials = carer
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("AccessCare reminder", { body: message });
    }
  }, [now]);

  const updateSettings = (changes: Partial<Settings>) =>
    setState((current) => ({ ...current, settings: { ...current.settings, ...changes } }));

  const setReminders = (remindersOn: boolean) => {
    updateSettings({ remindersOn });
    if (remindersOn && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    showToast(remindersOn ? "Reminders turned on." : "Reminders turned off.");
  };

  const goTo = (target: NavTarget) => {
    setActiveNav(target);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const recordDose = (dose: Dose, status: "taken" | "missed", doseReason?: string) => {
    setState((current) => {
      const { [dose.key]: _snooze, ...snoozes } = current.snoozes;
      return {
        ...current,
        snoozes,
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
    showToast("Dose logged as given.");
  };

  const undoDose = (dose: Dose) => {
    setState((current) => ({
      ...current,
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

  const removePrescription = () => {
    if (!form || form.id === null) return;
    if (!window.confirm("Remove this prescription? Doses already recorded stay in the medicine log.")) {
      return;
    }
    setState((current) => ({
      ...current,
      medications: current.medications.filter((medication) => medication.id !== form.id),
    }));
    showToast("Prescription removed.");
    setForm(null);
  };

  const resetData = () => {
    if (!window.confirm("Replace everything with the sample care plan? This cannot be undone.")) {
      return;
    }
    setState(sampleState());
    setPanel(null);
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

  const callButton = (contact: string, phone: string, className: string) =>
    phone.trim() ? (
      <a className={className} href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
        <Icon name="phone" className="h-4 w-4" />
        Call {contact} · {phone.trim()}
      </a>
    ) : (
      <button
        className={className}
        onClick={() => {
          setPanel("settings");
          showToast(`Add a phone number for the ${contact} to call from here.`);
        }}
        type="button"
      >
        <Icon name="phone" className="h-4 w-4" />
        Add {contact} number
      </button>
    );

  return (
    <div className="min-h-screen bg-[#F7F6F1] text-[#172E35]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#173B42] px-5 py-8 text-white lg:flex">
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8CF73] text-[#173B42]">
              <Icon name="medication" className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">AccessCare</span>
          </div>

          <nav aria-label="Main navigation" className="mt-12 space-y-2">
            {navItems.map((item) => (
              <button
                aria-current={activeNav === item.target ? "page" : undefined}
                key={item.label}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73] ${
                  activeNav === item.target
                    ? "bg-white text-[#173B42]"
                    : "text-[#C9D7D8] hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => goTo(item.target)}
                type="button"
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-[#C9D7D8] hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-[#F8CF73]"
              onClick={() => setPanel("help")}
              type="button"
            >
              <Icon name="help" />
              Help & support
            </button>
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-[#C9D7D8] hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-[#F8CF73]"
              onClick={() => setPanel("settings")}
              type="button"
            >
              <Icon name="settings" />
              Settings
            </button>
            <div className="mt-5 flex items-center gap-3 border-t border-white/15 px-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CFE2DC] font-bold text-[#173B42]">
                {carerInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{carer}</p>
                <p className="truncate text-sm text-[#C9D7D8]">Carer account</p>
              </div>
            </div>
          </div>
        </aside>

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
                            <li key={dose.key}>
                              <button
                                className="w-full rounded-lg px-2 py-3 text-left hover:bg-[#F7F8F6] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                                onClick={() => {
                                  setShowNotifications(false);
                                  goTo("prescriptions");
                                }}
                                type="button"
                              >
                                <span className="block text-base font-bold">
                                  {dose.medication.name} · {dose.medication.dosage}
                                </span>
                                <span className="block text-sm text-[#A14940]">
                                  Due at {formatTime(dose.time)} ·{" "}
                                  {dose.dueAt > now
                                    ? `snoozed for ${formatDuration(dose.dueAt - now)}`
                                    : `${formatDuration(now - dose.scheduledAt)} ago`}
                                </span>
                              </button>
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

          <nav
            aria-label="Mobile navigation"
            className="flex gap-2 overflow-x-auto border-b border-[#DDE2DE] bg-white px-4 py-3 lg:hidden"
          >
            {navItems.map((item) => (
              <button
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#F0F3F0] px-4 text-sm font-bold text-[#173B42] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                key={item.label}
                onClick={() => goTo(item.target)}
                type="button"
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <button
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#F0F3F0] px-4 text-sm font-bold text-[#173B42] focus-visible:outline-3 focus-visible:outline-[#173B42]"
              onClick={() => setPanel("help")}
              type="button"
            >
              <Icon name="help" className="h-4 w-4" />
              Help
            </button>
            <button
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#F0F3F0] px-4 text-sm font-bold text-[#173B42] focus-visible:outline-3 focus-visible:outline-[#173B42]"
              onClick={() => setPanel("settings")}
              type="button"
            >
              <Icon name="settings" className="h-4 w-4" />
              Settings
            </button>
          </nav>

          <div className="px-5 py-8 md:px-10 md:py-10 xl:px-14">
            <section
              className="scroll-mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
              id="dashboard"
            >
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

            <section
              aria-labelledby="next-dose-heading"
              className="mt-8 scroll-mt-6 overflow-hidden rounded-2xl bg-[#DDEDE7]"
              id="next-reminder"
            >
              <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#276D64] shadow-sm">
                    <Icon name="bell" className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
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
                  </div>
                </div>
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
            </section>

            <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section
                aria-labelledby="schedule-heading"
                className="scroll-mt-6"
                id="prescriptions"
              >
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
                    onClick={() => setForm(emptyForm)}
                    type="button"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Add prescription
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
                            {medication.imageUrl ? (
                              <img
                                alt={`${medication.name} packaging`}
                                className="mt-1 h-12 w-12 shrink-0 rounded-xl border border-[#71827D] object-cover"
                                src={medication.imageUrl}
                              />
                            ) : (
                              <div
                                aria-hidden="true"
                                className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${medication.color} text-white`}
                              >
                                <Icon name="medication" className="h-6 w-6" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold">{medication.name}</h3>
                                <span className="rounded-full bg-[#EEF1EE] px-2.5 py-1 text-sm font-semibold text-[#526267]">
                                  {medication.purpose}
                                </span>
                                <button
                                  aria-label={`Edit ${medication.name}`}
                                  className={textButton}
                                  onClick={() => editPrescription(medication)}
                                  type="button"
                                >
                                  Edit
                                </button>
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

              <aside className="space-y-6">
                <section
                  aria-labelledby="progress-heading"
                  className="rounded-2xl border border-[#E1E4E1] bg-white p-6"
                >
                  <div className="relative flex items-center justify-between">
                    <h2 id="progress-heading" className="text-lg font-bold">
                      This week
                    </h2>
                    <button
                      aria-expanded={showWeekMenu}
                      aria-label="More adherence options"
                      className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F0F2EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                      onClick={() => setShowWeekMenu((open) => !open)}
                      type="button"
                    >
                      <Icon name="more" />
                    </button>
                    {showWeekMenu && (
                      <>
                        <button
                          aria-label="Close menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setShowWeekMenu(false)}
                          type="button"
                        />
                        <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[#E1E4E1] bg-white p-2 shadow-xl">
                          <button
                            className={`${textButton} w-full text-left`}
                            onClick={() => {
                              setShowWeekMenu(false);
                              setPanel("log");
                            }}
                            type="button"
                          >
                            View full medicine log
                          </button>
                          <button
                            className={`${textButton} w-full text-left`}
                            onClick={() => {
                              setShowWeekMenu(false);
                              exportLog();
                            }}
                            type="button"
                          >
                            Download log (CSV)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                            <Icon
                              name={day === "complete" ? "check" : "close"}
                              className="h-4 w-4"
                            />
                          ) : day === "pending" ? (
                            <Icon name="clock" className="h-4 w-4" />
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-bold text-[#526267]">{weekDays[index]}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  aria-labelledby="log-heading"
                  className="scroll-mt-6 rounded-2xl border border-[#E1E4E1] bg-white p-6"
                  id="medicine-log"
                >
                  <div className="flex items-center justify-between">
                    <h2 id="log-heading" className="text-lg font-bold">
                      Medicine log
                    </h2>
                    <button className={textButton} onClick={() => setPanel("log")} type="button">
                      View all
                    </button>
                  </div>
                  <LogList entries={sortedLog.slice(0, 3)} now={now} />
                </section>

                <section
                  aria-labelledby="emergency-heading"
                  className="scroll-mt-6 overflow-hidden rounded-2xl border-2 border-[#B45248] bg-white"
                  id="emergency-contacts"
                >
                  <div className="bg-[#FAECE9] p-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#913C34] text-white">
                        <Icon name="phone" className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[#913C34]">
                          Medication error support
                        </p>
                        <h2 id="emergency-heading" className="mt-1 text-xl font-bold">
                          Possible missed or incorrect dose?
                        </h2>
                      </div>
                    </div>
                    <p className="mt-4 text-base leading-6 text-[#3E555A]">
                      Do not give another dose until you have received clinical advice.
                      Contact {patient}’s doctor or nurse now.
                    </p>
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#913C34]">
                      If {patient} is seriously unwell, call your local emergency services
                      immediately.
                    </p>
                  </div>

                  <div className="divide-y divide-[#DDE2DE] p-2">
                    <div className="p-3">
                      <p className="text-base font-bold">On-call doctor</p>
                      <p className="mt-1 text-sm text-[#526267]">
                        For incorrect, extra, or missed doses · Available 24 hours
                      </p>
                      {callButton(
                        "on-call doctor",
                        settings.doctorPhone,
                        "mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]",
                      )}
                    </div>

                    <div className="p-3">
                      <p className="text-base font-bold">Community nurse</p>
                      <p className="mt-1 text-sm text-[#526267]">
                        For medication guidance and care support · 7 AM–10 PM
                      </p>
                      {callButton(
                        "community nurse",
                        settings.nursePhone,
                        "mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#276D64] bg-white px-4 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]",
                      )}
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>

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
          {form.id !== null && (
            <button
              className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-bold text-[#913C34] hover:bg-[#FAECE9] focus-visible:outline-3 focus-visible:outline-[#173B42]"
              onClick={removePrescription}
              type="button"
            >
              Remove this prescription
            </button>
          )}
        </Modal>
      )}

      {reasonFor !== null && (
        <Modal
          alert
          description={`Record what happened when you offered ${reasonFor.medication.name} to ${patient}. This information will be added to the care log.`}
          eyebrow="Dose not given"
          onClose={closeReason}
          title="Why was this dose not given?"
        >
          <fieldset className="mt-6 space-y-3">
            <legend className="sr-only">Reason the dose was not given to {patient}</legend>
            {[
              `${patient} refused to take the medicine`,
              `${patient} was asleep`,
              `${patient} felt unwell`,
              "The medicine was unavailable",
              "The dose was withheld following clinical advice",
              "I was unable to administer the medicine",
              OTHER_REASON,
            ].map((option) => (
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

      {panel === "log" && (
        <Modal
          description={`Every dose recorded for ${patient}, newest first.`}
          eyebrow="Care record"
          onClose={() => setPanel(null)}
          size="max-w-lg"
          title="Medicine log"
        >
          <LogList entries={sortedLog} now={now} />
          <div className="mt-5 flex gap-3">
            <button className={`${secondaryButton} flex-1`} onClick={exportLog} type="button">
              Download CSV
            </button>
            <button
              className={`${primaryButton} flex-1`}
              onClick={() => setPanel(null)}
              type="button"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {panel === "settings" && (
        <Modal
          description="Changes are saved on this device as you type."
          eyebrow="Settings"
          onClose={() => setPanel(null)}
          size="max-w-lg"
          title="Care plan settings"
        >
          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Your name"
                onChange={(event) => updateSettings({ carerName: event.target.value })}
                value={settings.carerName}
              />
              <Field
                label="Person you care for"
                onChange={(event) => updateSettings({ patientName: event.target.value })}
                value={settings.patientName}
              />
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

            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#71827D] px-4 text-sm font-semibold">
              <input
                checked={settings.remindersOn}
                className="h-5 w-5 accent-[#276D64]"
                onChange={(event) => setReminders(event.target.checked)}
                type="checkbox"
              />
              Remind me when a dose is due
            </label>
            <p className="text-sm text-[#526267]">
              {!("Notification" in window)
                ? "This browser can’t show system notifications, so reminders appear inside AccessCare only."
                : Notification.permission === "granted"
                  ? "System notifications are allowed. Keep AccessCare open in a tab to receive them."
                  : Notification.permission === "denied"
                    ? "System notifications are blocked in your browser settings, so reminders appear inside AccessCare only."
                    : "Turn reminders on to be asked for permission to show system notifications."}
            </p>
          </div>

          <div className="mt-7 flex gap-3">
            <button className={`${secondaryButton} flex-1`} onClick={resetData} type="button">
              Restore sample data
            </button>
            <button
              className={`${primaryButton} flex-1`}
              onClick={() => setPanel(null)}
              type="button"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

      {panel === "help" && (
        <Modal
          eyebrow="Help & support"
          onClose={() => setPanel(null)}
          size="max-w-lg"
          title="How AccessCare works"
        >
          <ul className="mt-5 space-y-4 text-base leading-6 text-[#3E555A]">
            <li>
              <span className="font-bold text-[#173B42]">Recording a dose.</span> Select “Given”
              or “Not given” next to each dose. “Undo” removes a record made by mistake.
            </li>
            <li>
              <span className="font-bold text-[#173B42]">Prescriptions.</span> “Add prescription”
              sets up a medicine and its daily times. “Edit” on a medicine changes or removes it.
            </li>
            <li>
              <span className="font-bold text-[#173B42]">Reminders.</span> With reminders on, you
              are alerted when a dose is due while AccessCare is open. “Remind me in 10 min”
              postpones the next one.
            </li>
            <li>
              <span className="font-bold text-[#173B42]">Medicine log.</span> Every record is kept
              in the log, which you can download as a CSV file to share with a clinician.
            </li>
            <li>
              <span className="font-bold text-[#173B42]">Your data.</span> Everything is stored in
              this browser on this device only.
            </li>
          </ul>
          <p className="mt-5 rounded-lg bg-[#FAECE9] px-3 py-2 text-sm font-bold text-[#913C34]">
            AccessCare does not give medical advice. If you are worried about a dose, contact a
            doctor or nurse.
          </p>
          <button
            className={`${primaryButton} mt-6 w-full`}
            onClick={() => setPanel(null)}
            type="button"
          >
            Done
          </button>
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
    </div>
  );
}
