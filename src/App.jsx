const { contractors, categoryAverage, loadEvents, defaultJobs } = window.TrustFixData;
const { withPreferenceBoost } = window.TrustFixScoring;
const { fallbackParse, llmParseIntake } = window.TrustFixParsing;
const { findBackup, routeByIntake } = window.TrustFixAutonomy;
const { evaluateAutonomy } = window.TrustFixWorker;
const {
  listNotifications,
  putNotifications,
  getMemory,
  putMemory,
  getSuspensions,
  putSuspensions,
  setNotificationStatus,
} = window.TrustFixApi;

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_CONFIG = {
  watchdog: {
    icon: '🔴',
    label: 'ETA Alert',
    badgeClass: 'bg-red-100 text-red-700 ring-red-300',
    borderClass: 'border-red-200',
    bgClass: 'bg-red-50',
  },
  rematch: {
    icon: '🔁',
    label: 'Re-match Proposal',
    badgeClass: 'bg-amber-100 text-amber-700 ring-amber-300',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50',
  },
  anomaly: {
    icon: '⚠️',
    label: 'Anomaly',
    badgeClass: 'bg-orange-100 text-orange-700 ring-orange-300',
    borderClass: 'border-orange-200',
    bgClass: 'bg-orange-50',
  },
  memory: {
    icon: '🔵',
    label: 'Insight',
    badgeClass: 'bg-blue-100 text-blue-700 ring-blue-300',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50',
  },
};

function notifStyle(type) {
  return NOTIF_CONFIG[type] || {
    icon: '📋',
    label: 'Notice',
    badgeClass: 'bg-slate-100 text-slate-600 ring-slate-300',
    borderClass: 'border-slate-200',
    bgClass: 'bg-slate-50',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-indigo-600">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

// ─── Intake card (replaces raw JSON) ─────────────────────────────────────────
function IntakeCard({ parsed }) {
  if (!parsed) return null;

  const severityColor = parsed.severity === 'critical'
    ? 'bg-red-100 text-red-700'
    : parsed.severity === 'moderate'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-emerald-100 text-emerald-700';

  const urgencyColor = parsed.urgency === 'emergency'
    ? 'bg-red-600 text-white'
    : parsed.urgency === 'same-day'
    ? 'bg-indigo-600 text-white'
    : 'bg-slate-500 text-white';

  const sourceBadge = parsed._source === 'llm'
    ? <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-300">✦ AI Parsed</span>
    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-300">Fallback Parser</span>;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {sourceBadge}
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${severityColor}`}>{parsed.severity} severity</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${urgencyColor}`}>{parsed.urgency}</span>
        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold capitalize text-cyan-700 ring-1 ring-cyan-300">{parsed.trade}</span>
      </div>
      <p className="text-sm text-slate-700 mb-3">{parsed.summary}</p>
      {parsed.suggestedActions && parsed.suggestedActions.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-400 mb-1">Suggested Actions</p>
          <ul className="space-y-1">
            {parsed.suggestedActions.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
      {parsed.flags && parsed.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {parsed.flags.map((f) => (
            <span key={f} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">⚑ {f.replace(/_/g, ' ')}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [events] = React.useState(loadEvents);
  const [suspended, setSuspended] = React.useState(getSuspensions);
  const [description, setDescription] = React.useState('My shutoff valve has been weeping for 48 hours and wall is damp.');
  const [parsed, setParsed] = React.useState(null);
  const [parsingState, setParsingState] = React.useState('idle'); // idle | loading | done | error
  const [matches, setMatches] = React.useState([]);
  const [agentLog, setAgentLog] = React.useState([]);
  const [notifications, setNotifications] = React.useState(listNotifications);
  const [preferenceMemory, setPreferenceMemory] = React.useState(getMemory);
  const [jobs, setJobs] = React.useState(defaultJobs);
  const [bookingContractorId, setBookingContractorId] = React.useState(null); // contractor being booked
  const [bookedJobIds, setBookedJobIds] = React.useState(new Set()); // track which contractors were booked

  const contractorStats = React.useMemo(
    () => withPreferenceBoost(contractors, events, preferenceMemory.acceptedByContractor || {}),
    [events, preferenceMemory]
  );

  function contractorById(id) {
    return contractorStats.find((c) => c.id === id) || contractors.find((c) => c.id === id);
  }

  function syncNotifications(next) { setNotifications(next); putNotifications(next); }
  function syncMemory(next) { setPreferenceMemory(next); putMemory(next); }
  function syncSuspensions(next) { setSuspended(next); putSuspensions(next); }

  function applyRouting(intake) {
    const ranked = routeByIntake(contractorStats, intake, suspended);
    setMatches(ranked);
    setAgentLog((l) => [
      `Parsed: ${intake.trade}, ${intake.severity} severity. Applying ${intake.urgency} routing rules. Ranked ${ranked.length} candidates.`,
      ...l,
    ].slice(0, 12));
  }

  async function runIntake() {
    setParsingState('loading');
    setParsed(null);
    setMatches([]);
    try {
      const intake = await llmParseIntake(description);
      setParsed(intake);
      setParsingState('done');
      applyRouting(intake);
    } catch (e) {
      const intake = fallbackParse(description);
      setParsed(intake);
      setParsingState('error');
      setAgentLog((l) => [`⚠️ LLM unavailable — fallback parser used: ${e.message}`, ...l].slice(0, 12));
      applyRouting(intake);
    }
  }

  // ── Book a contractor from routing results ──────────────────────────────────
  function bookContractor(contractor) {
    if (!parsed) return;
    setBookingContractorId(contractor.id);

    // Create a live job with ETA 20 minutes out so watchdog fires during demo
    const ETA_MS = 20 * 60 * 1000;
    const newJob = {
      id: `job-booked-${contractor.id}-${Date.now()}`,
      homeownerId: 'dain',
      address: '14 Maple St',
      title: parsed.summary || description.slice(0, 60),
      trade: parsed.trade,
      contractorId: contractor.id,
      status: 'In Progress',
      quotedPrice: categoryAverage[parsed.trade] || 200,
      createdAt: Date.now(),
      startedAt: Date.now(),
      etaDueAt: Date.now() + ETA_MS,
      flags: {},
    };

    setJobs((prev) => [...prev, newJob]);
    setBookedJobIds((prev) => new Set([...prev, contractor.id]));

    // Update preference memory — homeowner is actively choosing this contractor
    const nextMemory = {
      ...preferenceMemory,
      acceptedByContractor: {
        ...(preferenceMemory.acceptedByContractor || {}),
        [contractor.id]: ((preferenceMemory.acceptedByContractor || {})[contractor.id] || 0) + 1,
      },
    };
    syncMemory(nextMemory);

    setAgentLog((l) => [
      `Job booked: ${contractor.name} dispatched for "${newJob.title}". ETA watchdog active — fires in ~20 min.`,
      ...l,
    ].slice(0, 12));

    setTimeout(() => setBookingContractorId(null), 800);
  }

  function handleNotificationAction(n, action) {
    if (action === 'why') {
      setAgentLog((l) => [`Why: ${n.why}`, ...l].slice(0, 12));
      return;
    }

    const updated = setNotificationStatus(n.id, action === 'dismiss' ? 'dismissed' : 'accepted');
    setNotifications(updated);

    if (action === 'accept' && n.type === 'rematch' && n.jobId && n.backupId) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === n.jobId
            ? { ...j, contractorId: n.backupId, etaDueAt: Date.now() + contractorById(n.backupId).etaMin * 60 * 1000, flags: { ...j.flags, rematched: true } }
            : j
        )
      );
      const nextMemory = {
        ...preferenceMemory,
        acceptedByContractor: {
          ...(preferenceMemory.acceptedByContractor || {}),
          [n.backupId]: ((preferenceMemory.acceptedByContractor || {})[n.backupId] || 0) + 1,
        },
      };
      syncMemory(nextMemory);
      setAgentLog((l) => [
        `Accepted auto re-match → ${contractorById(n.backupId).name}. Preference memory updated.`,
        ...l,
      ].slice(0, 12));
    }
  }

  React.useEffect(() => { runIntake(); }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const result = evaluateAutonomy({
        jobs, events, notifications, suspended, contractorStats,
        categoryAverage, findBackup, contractorById, now: Date.now(),
      });
      setJobs(result.nextJobs);
      syncNotifications(result.nextNotifications);
      syncSuspensions(result.nextSuspended);
      if (result.logLines.length) setAgentLog((l) => [...result.logLines, ...l].slice(0, 12));
    }, 5000);
    return () => clearInterval(timer);
  }, [jobs, events, notifications, suspended, contractorStats]);

  const openNotifs = notifications.filter((n) => (n.status || 'open') === 'open');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="inline-flex rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/40">TrustFix Agentic Marketplace</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl">Phase 2 + 3 + 4 in one visible frontend</h1>
          <p className="mt-3 max-w-3xl text-slate-200">Data layer (live trust score), intelligence layer (LLM/fallback parsing + routing), and autonomy layer (watchdogs + proactive actions).</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Contractors" value={String(contractorStats.length)} />
            <Stat label="Open notifications" value={String(openNotifs.length)} />
            <Stat label="In-progress jobs" value={String(jobs.filter((j) => j.status === 'In Progress').length)} />
            <Stat label="Suspended pros" value={String(Object.values(suspended).filter(Boolean).length)} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">

        {/* ── Phase 3: Intake + Smart Routing ──────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Phase 3 — Intake + Smart Routing</h2>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="3"
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={runIntake}
            disabled={parsingState === 'loading'}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60 flex items-center gap-2"
          >
            {parsingState === 'loading' ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Parsing…
              </>
            ) : 'Run Intake'}
          </button>

          <IntakeCard parsed={parsed} />

          {/* Routing results */}
          {matches.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold uppercase text-slate-500">Ranked Matches</h3>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {matches.map((c, idx) => {
                  const isBooked = bookedJobIds.has(c.id);
                  const isBooking = bookingContractorId === c.id;
                  return (
                    <article
                      key={c.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isBooked
                          ? 'border-emerald-300 bg-emerald-50'
                          : idx === 0
                          ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm">{c.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 capitalize">{c.trade}</p>
                        </div>
                        {idx === 0 && !isBooked && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">Top Pick</span>
                        )}
                        {isBooked && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">Booked</span>
                        )}
                      </div>

                      <div className="mt-2 flex gap-3 text-xs text-slate-600">
                        <span className="font-bold text-indigo-700">Score {c.score}</span>
                        <span>ETA {c.etaMin}m</span>
                        <span>{c.activeJobs} active job{c.activeJobs !== 1 ? 's' : ''}</span>
                      </div>

                      {suspended[c.id] && (
                        <p className="mt-1 text-xs font-bold text-red-600">⛔ Suspended</p>
                      )}

                      {!isBooked && !suspended[c.id] && (
                        <button
                          onClick={() => bookContractor(c)}
                          disabled={isBooking}
                          className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                        >
                          {isBooking ? 'Dispatching…' : 'Book this Contractor →'}
                        </button>
                      )}

                      {isBooked && (
                        <p className="mt-2 text-xs text-emerald-700 font-semibold">
                          ✓ Dispatched — ETA watchdog active
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ── Phase 4 + Phase 2 side by side ───────────────────────────────── */}
        <section className="grid gap-8 lg:grid-cols-2">

          {/* Notification Center */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">Phase 4 — Notification Center</h2>
              {openNotifs.length > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-300">
                  {openNotifs.length} open
                </span>
              )}
            </div>

            <div className="space-y-3">
              {notifications.map((n) => {
                const style = notifStyle(n.type);
                const isOpen = (n.status || 'open') === 'open';
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-3 transition-opacity ${style.borderClass} ${style.bgClass} ${!isOpen ? 'opacity-40' : ''}`}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base leading-none">{style.icon}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${style.badgeClass}`}>
                        {style.label}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 capitalize">{n.status || 'open'}</span>
                    </div>

                    <p className="text-sm text-slate-700 leading-snug">{n.message}</p>

                    {isOpen && (
                      <div className="mt-2.5 flex gap-2">
                        {n.type === 'rematch' && (
                          <button
                            onClick={() => handleNotificationAction(n, 'accept')}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                          >
                            Accept Re-match
                          </button>
                        )}
                        <button
                          onClick={() => handleNotificationAction(n, 'dismiss')}
                          className="rounded-lg bg-slate-500 px-3 py-1 text-xs font-bold text-white hover:bg-slate-400"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleNotificationAction(n, 'why')}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                        >
                          Ask Why
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <p className="text-sm text-slate-400 italic">No notifications yet — book a contractor to start the watchdog.</p>
              )}
            </div>
          </section>

          {/* Trust & Agent State */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">Phase 2 — Trust & Agent State</h2>

            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Preference Memory (Dain)</p>
              {Object.keys(preferenceMemory.acceptedByContractor || {}).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No bookings yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preferenceMemory.acceptedByContractor || {}).map(([id, count]) => {
                    const c = contractorById(Number(id));
                    return (
                      <span key={id} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        {c?.name || `#${id}`} ×{count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <h3 className="mt-4 text-xs font-bold uppercase text-slate-400">In-Progress Jobs</h3>
            <div className="mt-2 space-y-2">
              {jobs.map((j) => {
                const c = contractorById(j.contractorId);
                const lateBy = Math.floor((Date.now() - j.etaDueAt) / 60000);
                return (
                  <div key={j.id} className={`rounded-lg border p-2.5 text-xs ${lateBy > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{j.title}</span>
                      {lateBy > 0 && <span className="text-red-600 font-bold">{lateBy}m late</span>}
                    </div>
                    <span className="text-slate-500">{c?.name} • {j.trade}</span>
                  </div>
                );
              })}
            </div>

            <h3 className="mt-4 text-xs font-bold uppercase text-slate-400">Agent Log</h3>
            <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {agentLog.length === 0 && (
                <li className="text-xs text-slate-400 italic">Waiting for agent events…</li>
              )}
              {agentLog.map((line, i) => (
                <li key={i} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 leading-snug">{line}</li>
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
