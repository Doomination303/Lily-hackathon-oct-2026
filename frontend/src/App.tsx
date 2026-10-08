import { useState, type ReactNode } from "react";

type DoseStatus = "pending" | "taken" | "missed";

type Medication = {
  id: number;
  name: string;
  purpose: string;
  dosage: string;
  instructions: string;
  time: string;
  period: string;
  color: string;
  imageUrl?: string;
  reminderTimes?: string[];
  status: DoseStatus;
};

type IconProps = {
  name:
    | "home"
    | "medication"
    | "calendar"
    | "document"
    | "settings"
    | "bell"
    | "plus"
    | "clock"
    | "check"
    | "chevron"
    | "more"
    | "help"
    | "image"
    | "phone"
    | "close";
  className?: string;
};

function Icon({ name, className = "h-5 w-5" }: IconProps) {
  const paths: Record<IconProps["name"], ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    medication: (
      <>
        <path d="M10.5 5.5 18.5 13a4 4 0 0 1-5.5 5.8L5 11.3a4 4 0 0 1 5.5-5.8Z" />
        <path d="m8.7 14.8 5.6-6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    document: (
      <>
        <path d="M6 3h9l3 3v15H6Z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.3 2.3 0 1 1 3.3 2c-.8.4-1.1.9-1.1 2M12 17h.01" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m4 17 5-4 3 3 3-3 5 4" />
      </>
    ),
    phone: (
      <path d="M5.4 3.5 8.7 3l1.6 4.2-2.1 1.6a15.8 15.8 0 0 0 7 7l1.6-2.1 4.2 1.6-.5 3.3c-.2 1.1-1.1 1.9-2.2 1.9C10.1 20.5 3.5 13.9 3.5 5.7c0-1.1.8-2 1.9-2.2Z" />
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

const initialMedications: Medication[] = [
  {
    id: 1,
    name: "Medicine 1",
    purpose: "Blood pressure",
    dosage: "10 mg · 1 tablet",
    instructions: "Take with a full glass of water",
    time: "8:00",
    period: "AM",
    color: "bg-[#E27064]",
    status: "pending",
  },
  {
    id: 2,
    name: "Medicine 2",
    purpose: "Blood sugar",
    dosage: "500 mg · 1 tablet",
    instructions: "Take with breakfast",
    time: "8:30",
    period: "AM",
    color: "bg-[#41998E]",
    status: "pending",
  },
  {
    id: 3,
    name: "Medicine 3",
    purpose: "Daily supplement",
    dosage: "1,000 IU · 1 capsule",
    instructions: "Take with food",
    time: "1:00",
    period: "PM",
    color: "bg-[#936315]",
    status: "pending",
  },
];

const navItems: Array<{
  label: string;
  icon: IconProps["name"];
  target: string;
  active?: boolean;
}> = [
  { label: "Dashboard", icon: "home", target: "dashboard", active: true },
  { label: "Prescriptions", icon: "medication", target: "prescriptions" },
  { label: "Reminders", icon: "calendar", target: "next-reminder" },
  { label: "Medicine log", icon: "document", target: "medicine-log" },
  { label: "Emergency contacts", icon: "phone", target: "emergency-contacts" },
];

export default function App() {
  const [medications, setMedications] = useState(initialMedications);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reminderOn, setReminderOn] = useState(true);
  const [toast, setToast] = useState("");
  const [showAddPrescription, setShowAddPrescription] = useState(false);
  const [newDosage, setNewDosage] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newTimes, setNewTimes] = useState([""]);
  const [medicineImage, setMedicineImage] = useState("");
  const prescriptionIsComplete =
    Boolean(newDosage) &&
    Boolean(newQuantity) &&
    newTimes.length > 0 &&
    newTimes.every(Boolean);

  const markTaken = (id: number) => {
    setMedications((items) =>
      items.map((item) => (item.id === id ? { ...item, status: "taken" } : item)),
    );
    setToast("Dose logged as given.");
    window.setTimeout(() => setToast(""), 2800);
  };

  const saveMissed = () => {
    if (!reasonFor || !reason) return;
    setMedications((items) =>
      items.map((item) => (item.id === reasonFor ? { ...item, status: "missed" } : item)),
    );
    setReasonFor(null);
    setReason("");
    setToast("Not-given dose and reason saved.");
    window.setTimeout(() => setToast(""), 2800);
  };

  const goTo = (target: string) => {
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const savePrescription = () => {
    const reminderTimes = newTimes.filter(Boolean);
    if (!newDosage || !newQuantity || reminderTimes.length === 0) return;
    const [time, period = "AM"] = reminderTimes[0].split(" ");
    setMedications((items) => [
      ...items,
      {
        id: Date.now(),
        name: `Medicine ${items.length + 1}`,
        purpose: "New prescription",
        dosage: `${newDosage} · ${newQuantity}`,
        instructions: "Follow the prescription instructions",
        time,
        period,
        color: "bg-[#6D7DB3]",
        imageUrl: medicineImage || undefined,
        reminderTimes,
        status: "pending",
      },
    ]);
    setShowAddPrescription(false);
    setNewDosage("");
    setNewQuantity("");
    setNewTimes([""]);
    setMedicineImage("");
    setToast("New prescription added.");
    window.setTimeout(() => setToast(""), 2800);
  };

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
                key={item.label}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#F8CF73] ${
                  item.active
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
              onClick={() => {
                setToast("Settings selected.");
                window.setTimeout(() => setToast(""), 2800);
              }}
              type="button"
            >
              <Icon name="help" />
              Help & support
            </button>
            <button
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold text-[#C9D7D8] hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-[#F8CF73]"
              type="button"
            >
              <Icon name="settings" />
              Settings
            </button>
            <div className="mt-5 flex items-center gap-3 border-t border-white/15 px-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CFE2DC] font-bold text-[#173B42]">
                SJ
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Sarah Jones</p>
                <p className="truncate text-sm text-[#C9D7D8]">Carer account</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex min-h-20 items-center justify-between border-b border-[#DDE2DE] bg-[#F7F6F1]/90 px-5 backdrop-blur md:px-10">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173B42] text-[#F8CF73]">
                <Icon name="medication" />
              </div>
              <span className="hidden font-bold sm:block">AccessCare</span>
            </div>
            <p className="hidden text-sm font-semibold text-[#526267] lg:block">
              Monday, June 16
            </p>
            <div className="ml-auto flex items-center gap-3">
              <button
                aria-label={reminderOn ? "Turn reminders off" : "Turn reminders on"}
                className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42] ${
                  reminderOn
                    ? "border-[#BCD8D1] bg-[#E8F3EF] text-[#276D64]"
                    : "border-[#71827D] bg-white text-[#526267]"
                }`}
                onClick={() => setReminderOn((value) => !value)}
                type="button"
              >
                <Icon name="bell" className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Reminders {reminderOn ? "on" : "off"}
                </span>
              </button>
              <button
                aria-label="View notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#71827D] bg-white hover:bg-[#EEF1EE] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                type="button"
              >
                <Icon name="bell" />
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#E27064] ring-2 ring-white" />
              </button>
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
              onClick={() => {
                setToast("Settings selected.");
                window.setTimeout(() => setToast(""), 2800);
              }}
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
                  Eleanor’s care plan · fictional medicines
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-[#173B42] md:text-4xl">
                  Good morning, Sarah
                </h1>
                <p className="mt-2 text-base text-[#526267]">
                  Eleanor has {medications.length} prescriptions scheduled today.
                </p>
              </div>
              <button
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#173B42] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                onClick={() => setShowAddPrescription(true)}
                type="button"
              >
                <Icon name="plus" />
                Add prescription
              </button>
            </section>

            <section
              aria-labelledby="next-dose-heading"
              className="mt-8 overflow-hidden rounded-2xl bg-[#DDEDE7]"
              id="next-reminder"
            >
              <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#276D64] shadow-sm">
                    <Icon name="bell" className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
                      Next reminder · in 20 minutes
                    </p>
                    <h2 id="next-dose-heading" className="mt-1 text-xl font-bold">
                      Medicine 2, 500 mg
                    </h2>
                    <p className="mt-1 text-base font-medium text-[#3E555A]">
                      8:30 AM · Take 1 tablet with breakfast
                    </p>
                  </div>
                </div>
                <button
                  className="min-h-11 rounded-xl border-2 border-[#276D64] bg-transparent px-5 text-sm font-bold text-[#276D64] hover:bg-white/60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                  type="button"
                >
                  Remind me in 10 min
                </button>
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
                    onClick={() => setShowAddPrescription(true)}
                    type="button"
                  >
                    <Icon name="plus" className="h-4 w-4" />
                    Add prescription
                  </button>
                </div>

                <div className="space-y-4">
                  {medications.map((medication) => (
                    <article
                      key={medication.id}
                      className={`rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(23,59,66,0.04)] transition md:p-6 ${
                        medication.status === "taken"
                          ? "border-[#B7D7CF]"
                          : medication.status === "missed"
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
                            </div>
                            <p className="mt-1 font-bold text-[#3E555A]">
                              {medication.dosage}
                            </p>
                            <p className="mt-1 text-base text-[#526267]">
                              {medication.instructions}
                            </p>
                            {medication.reminderTimes &&
                              medication.reminderTimes.length > 1 && (
                                <p className="mt-2 text-sm font-bold text-[#276D64]">
                                  {medication.reminderTimes.length} daily reminders:{" "}
                                  {medication.reminderTimes.join(", ")}
                                </p>
                              )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t border-[#ECEEEC] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                          <div className="w-16 text-center">
                            <p className="text-xl font-bold">{medication.time}</p>
                            <p className="text-sm font-bold text-[#526267]">
                              {medication.period}
                            </p>
                          </div>
                          {medication.status === "pending" ? (
                            <div className="flex flex-1 gap-2 md:flex-none">
                              <button
                                aria-label={`Mark ${medication.name} as given to Eleanor`}
                                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064] md:flex-none"
                                onClick={() => markTaken(medication.id)}
                                type="button"
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-white">
                                  <Icon name="check" className="h-3 w-3" />
                                </span>
                                Given
                              </button>
                              <button
                                aria-label={`Mark ${medication.name} as not given to Eleanor`}
                                className="min-h-12 rounded-xl border border-[#71827D] px-3 text-sm font-bold text-[#526267] hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                                onClick={() => setReasonFor(medication.id)}
                                type="button"
                              >
                                Not given
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${
                                medication.status === "taken"
                                  ? "bg-[#E8F3EF] text-[#276D64]"
                                  : "bg-[#FAECE9] text-[#A14940]"
                              }`}
                            >
                              <Icon
                                name={medication.status === "taken" ? "check" : "close"}
                                className="h-4 w-4"
                              />
                              {medication.status === "taken" ? "Given" : "Not given"}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="space-y-6">
                <section
                  aria-labelledby="progress-heading"
                  className="rounded-2xl border border-[#E1E4E1] bg-white p-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 id="progress-heading" className="text-lg font-bold">
                      This week
                    </h2>
                    <button
                      aria-label="More adherence options"
                      className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#F0F2EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                      type="button"
                    >
                      <Icon name="more" />
                    </button>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold tracking-tight">92%</p>
                      <p className="mt-1 text-base text-[#526267]">Doses given on time</p>
                    </div>
                    <span className="rounded-full bg-[#E8F3EF] px-3 py-1.5 text-sm font-bold text-[#276D64]">
                      +4% this week
                    </span>
                  </div>
                  <div className="mt-7 grid grid-cols-7 gap-2">
                    {[
                      ["M", true],
                      ["T", true],
                      ["W", true],
                      ["T", false],
                      ["F", true],
                      ["S", true],
                      ["S", true],
                    ].map(([day, complete], index) => (
                      <div className="text-center" key={`${day}-${index}`}>
                        <div
                          className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
                            complete
                              ? "bg-[#41998E] text-white"
                              : "bg-[#FAECE9] text-[#A14940]"
                          }`}
                        >
                          <Icon
                            name={complete ? "check" : "close"}
                            className="h-4 w-4"
                          />
                        </div>
                        <p className="mt-2 text-sm font-bold text-[#526267]">{day}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  aria-labelledby="log-heading"
                  className="rounded-2xl border border-[#E1E4E1] bg-white p-6"
                  id="medicine-log"
                >
                  <div className="flex items-center justify-between">
                    <h2 id="log-heading" className="text-lg font-bold">
                      Medicine log
                    </h2>
                    <button
                      className="min-h-10 rounded-lg px-2 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                      type="button"
                    >
                      View all
                    </button>
                  </div>
                  <ul className="mt-3 divide-y divide-[#ECEEEC]">
                    <li className="flex items-center gap-3 py-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F3EF] text-[#276D64]">
                        <Icon name="check" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold">
                          Medicine 1 · 10 mg
                        </p>
                        <p className="text-sm text-[#526267]">Yesterday, 8:04 AM</p>
                      </div>
                      <span className="text-sm font-bold text-[#276D64]">Given</span>
                    </li>
                    <li className="flex items-center gap-3 py-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F3EF] text-[#276D64]">
                        <Icon name="check" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold">
                          Medicine 2 · 500 mg
                        </p>
                        <p className="text-sm text-[#526267]">Yesterday, 8:32 AM</p>
                      </div>
                      <span className="text-sm font-bold text-[#276D64]">Given</span>
                    </li>
                    <li className="flex items-center gap-3 py-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9] text-[#A14940]">
                        <Icon name="close" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold">
                          Medicine 3 · 1,000 IU
                        </p>
                        <p className="text-sm text-[#526267]">
                          Sun, 1:00 PM · Eleanor refused
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#913C34]">Not given</span>
                    </li>
                  </ul>
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
                      Contact Eleanor’s doctor or nurse now.
                    </p>
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#913C34]">
                      If Eleanor is seriously unwell, call your local emergency services
                      immediately.
                    </p>
                  </div>

                  <div className="divide-y divide-[#DDE2DE] p-2">
                    <div className="p-3">
                      <p className="text-base font-bold">On-call doctor</p>
                      <p className="mt-1 text-sm text-[#526267]">
                        For incorrect, extra, or missed doses · Available 24 hours
                      </p>
                      <button
                        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white hover:bg-[#24515A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                        onClick={() => {
                          setToast("Contacting the on-call doctor.");
                          window.setTimeout(() => setToast(""), 2800);
                        }}
                        type="button"
                      >
                        <Icon name="phone" className="h-4 w-4" />
                        Call on-call doctor
                      </button>
                    </div>

                    <div className="p-3">
                      <p className="text-base font-bold">Community nurse</p>
                      <p className="mt-1 text-sm text-[#526267]">
                        For medication guidance and care support · 7 AM–10 PM
                      </p>
                      <button
                        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#276D64] bg-white px-4 text-sm font-bold text-[#276D64] hover:bg-[#E8F3EF] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                        onClick={() => {
                          setToast("Contacting the community nurse.");
                          window.setTimeout(() => setToast(""), 2800);
                        }}
                        type="button"
                      >
                        <Icon name="phone" className="h-4 w-4" />
                        Call community nurse
                      </button>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {showAddPrescription && (
        <div
          aria-labelledby="prescription-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102C33]/55 p-4"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#276D64]">
                  Manage prescriptions
                </p>
                <h2 id="prescription-title" className="mt-1 text-2xl font-bold">
                  Add a new prescription
                </h2>
                <p className="mt-2 text-base text-[#526267]">
                  The prescription will be added as Medicine {medications.length + 1}.
                </p>
              </div>
              <button
                aria-label="Close add prescription dialog"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#F0F2EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                onClick={() => setShowAddPrescription(false)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>

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
                      if (file) setMedicineImage(URL.createObjectURL(file));
                    }}
                    type="file"
                  />
                  {medicineImage ? (
                    <span className="flex items-center gap-4">
                      <img
                        alt="Selected medicine preview"
                        className="h-20 w-20 rounded-xl border border-[#71827D] object-cover"
                        src={medicineImage}
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
                <label className="block">
                  <span className="mb-2 block text-base font-bold">Dosage</span>
                  <input
                    className="min-h-12 w-full rounded-xl border-2 border-[#71827D] bg-white px-4 text-base text-[#172E35] outline-none placeholder:text-[#6A787C] focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]"
                    onChange={(event) => setNewDosage(event.target.value)}
                    placeholder="For example: 20 mg"
                    type="text"
                    value={newDosage}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-base font-bold">Quantity</span>
                  <input
                    className="min-h-12 w-full rounded-xl border-2 border-[#71827D] bg-white px-4 text-base text-[#172E35] outline-none placeholder:text-[#6A787C] focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]"
                    onChange={(event) => setNewQuantity(event.target.value)}
                    placeholder="For example: 1 tablet"
                    type="text"
                    value={newQuantity}
                  />
                </label>
              </div>

              <fieldset>
                <legend className="mb-2 text-base font-bold">Reminder times</legend>
                <p className="mb-3 text-sm text-[#526267]">
                  Add every time this medicine should be given.
                </p>
                <div className="space-y-3">
                  {newTimes.map((reminderTime, index) => (
                    <div className="flex items-center gap-2" key={index}>
                      <label className="sr-only" htmlFor={`reminder-${index}`}>
                        Reminder time {index + 1}
                      </label>
                      <select
                        className="min-h-12 min-w-0 flex-1 rounded-xl border-2 border-[#71827D] bg-white px-4 text-base text-[#172E35] outline-none focus:border-[#276D64] focus:ring-3 focus:ring-[#BCD8D1]"
                        id={`reminder-${index}`}
                        onChange={(event) =>
                          setNewTimes((times) =>
                            times.map((time, timeIndex) =>
                              timeIndex === index ? event.target.value : time,
                            ),
                          )
                        }
                        value={reminderTime}
                      >
                        <option value="">Choose a time</option>
                        <option value="8:00 AM">8:00 AM</option>
                        <option value="12:00 PM">12:00 PM</option>
                        <option value="6:00 PM">6:00 PM</option>
                        <option value="9:00 PM">9:00 PM</option>
                      </select>
                      {newTimes.length > 1 && (
                        <button
                          aria-label={`Remove reminder time ${index + 1}`}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#71827D] text-[#913C34] hover:bg-[#FAECE9] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                          onClick={() =>
                            setNewTimes((times) =>
                              times.filter((_, timeIndex) => timeIndex !== index),
                            )
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
                  onClick={() => setNewTimes((times) => [...times, ""])}
                  type="button"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add another reminder time
                </button>
              </fieldset>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                className="min-h-12 flex-1 rounded-xl border border-[#71827D] px-4 text-sm font-bold hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                onClick={() => setShowAddPrescription(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-12 flex-1 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white enabled:hover:bg-[#24515A] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                disabled={!prescriptionIsComplete}
                onClick={savePrescription}
                type="button"
              >
                Add prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {reasonFor !== null && (
        <div
          aria-labelledby="reason-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102C33]/55 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#A14940]">Dose not given</p>
                <h2 id="reason-title" className="mt-1 text-2xl font-bold">
                  Why was this dose not given?
                </h2>
                <p className="mt-2 text-base leading-6 text-[#526267]">
                  Record what happened when you offered this medicine to Eleanor. This
                  information will be added to her care log.
                </p>
              </div>
              <button
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#F0F2EF] focus-visible:outline-3 focus-visible:outline-[#173B42]"
                onClick={() => setReasonFor(null)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </div>
            <fieldset className="mt-6 space-y-3">
              <legend className="sr-only">Reason the dose was not given to Eleanor</legend>
              {[
                "Eleanor refused to take the medicine",
                "Eleanor was asleep",
                "Eleanor felt unwell",
                "The medicine was unavailable",
                "The dose was withheld following clinical advice",
                "I was unable to administer the medicine",
                "Other reason",
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
            </fieldset>
            <div className="mt-7 flex gap-3">
              <button
                className="min-h-12 flex-1 rounded-xl border border-[#71827D] px-4 text-sm font-bold hover:bg-[#F1F3F1] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#173B42]"
                onClick={() => setReasonFor(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-12 flex-1 rounded-xl bg-[#173B42] px-4 text-sm font-bold text-white enabled:hover:bg-[#24515A] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#E27064]"
                disabled={!reason}
                onClick={saveMissed}
                type="button"
              >
                Save to care log
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-xl bg-[#173B42] px-5 text-sm font-bold text-white shadow-xl"
          role="status"
        >
          <Icon name="check" className="h-4 w-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
