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

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold text-indigo-600">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function App() {
  const [events] = React.useState(loadEvents);
  const [suspended, setSuspended] = React.useState(getSuspensions);
  const [description, setDescription] = React.useState('My shutoff valve has been weeping for 48 hours and wall is damp.');
  const [parsed, setParsed] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [agentLog, setAgentLog] = React.useState([]);
  const [notifications, setNotifications] = React.useState(listNotifications);
  const [preferenceMemory, setPreferenceMemory] = React.useState(getMemory);
  const [jobs, setJobs] = React.useState(defaultJobs);

  const contractorStats = React.useMemo(() => withPreferenceBoost(contractors, events, preferenceMemory.acceptedByContractor || {}), [events, preferenceMemory]);

  function contractorById(id) {
    return contractorStats.find((c) => c.id === id) || contractors.find((c) => c.id === id);
  }

  function syncNotifications(next) {
    setNotifications(next);
    putNotifications(next);
  }

  function syncMemory(next) {
    setPreferenceMemory(next);
    putMemory(next);
  }

  function syncSuspensions(next) {
    setSuspended(next);
    putSuspensions(next);
  }

  function applyRouting(intake) {
    const ranked = routeByIntake(contractorStats, intake, suspended);
    setMatches(ranked);
    setAgentLog((l) => [`Parsed: ${intake.trade}, ${intake.severity} severity. Applying ${intake.urgency} routing rules. Excluding contractors with active jobs > 2. Ranked ${ranked.length} candidates.`, ...l].slice(0, 12));
  }

  async function runIntake() {
    try {
      const intake = await llmParseIntake(description);
      setParsed(intake);
      applyRouting(intake);
    } catch (e) {
      const intake = fallbackParse(description);
      setParsed(intake);
      setAgentLog((l) => [`⚠️ LLM unavailable, fallback parser used: ${e.message}`, ...l].slice(0, 12));
      applyRouting(intake);
    }
  }

  function handleNotificationAction(n, action) {
    if (action === 'why') {
      setAgentLog((l) => [`Why: ${n.why}`, ...l].slice(0, 12));
      return;
    }

    const updated = setNotificationStatus(n.id, action === 'dismiss' ? 'dismissed' : 'accepted');
    setNotifications(updated);

    if (action === 'accept' && n.type === 'rematch' && n.jobId && n.backupId) {
      setJobs((prev) => prev.map((j) => j.id === n.jobId
        ? { ...j, contractorId: n.backupId, etaDueAt: Date.now() + (contractorById(n.backupId).etaMin * 60 * 1000), flags: { ...j.flags, rematched: true } }
        : j));

      const nextMemory = {
        ...preferenceMemory,
        acceptedByContractor: {
          ...(preferenceMemory.acceptedByContractor || {}),
          [n.backupId]: ((preferenceMemory.acceptedByContractor || {})[n.backupId] || 0) + 1,
        },
      };
      syncMemory(nextMemory);
      setAgentLog((l) => [`Accepted auto re-match to ${contractorById(n.backupId).name}. Preference memory updated.`, ...l].slice(0, 12));
    }
  }

  React.useEffect(() => { runIntake(); }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const result = evaluateAutonomy({
        jobs,
        events,
        notifications,
        suspended,
        contractorStats,
        categoryAverage,
        findBackup,
        contractorById,
        now: Date.now(),
      });

      setJobs(result.nextJobs);
      syncNotifications(result.nextNotifications);
      syncSuspensions(result.nextSuspended);
      if (result.logLines.length) setAgentLog((l) => [...result.logLines, ...l].slice(0, 12));
    }, 5000);

    return () => clearInterval(timer);
  }, [jobs, events, notifications, suspended, contractorStats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="inline-flex rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/40">TrustFix Agentic Marketplace</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl">Phase 2 + 3 + 4 in one visible frontend</h1>
          <p className="mt-3 max-w-3xl text-slate-200">Data layer (live trust score), intelligence layer (LLM/fallback parsing + routing), and autonomy layer (watchdogs + proactive actions).</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Contractors" value={String(contractorStats.length)} />
            <Stat label="Open notifications" value={String(notifications.filter((n) => (n.status || 'open') === 'open').length)} />
            <Stat label="In-progress jobs" value={String(jobs.filter((j) => j.status === 'In Progress').length)} />
            <Stat label="Suspended pros" value={String(Object.values(suspended).filter(Boolean).length)} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold">Phase 3 — Intake + Smart Routing</h2>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button onClick={runIntake} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Run intake</button>
          {parsed && <pre className="mt-3 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(parsed, null, 2)}</pre>}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {matches.map((c) => (
              <article key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold">{c.name}</p>
                <p className="text-sm text-slate-600">{c.trade} • score {c.score} • ETA {c.etaMin}m</p>
                {suspended[c.id] && <p className="mt-1 text-xs font-bold text-red-600">Suspended</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">Phase 4 — Notification Center</h2>
            <div className="mt-4 space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-500">Status: {n.status || 'open'}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleNotificationAction(n, 'accept')} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Accept</button>
                    <button onClick={() => handleNotificationAction(n, 'dismiss')} className="rounded bg-slate-600 px-2 py-1 text-xs font-bold text-white">Dismiss</button>
                    <button onClick={() => handleNotificationAction(n, 'why')} className="rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white">Ask agent why</button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications yet.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold">Phase 2 — Trust & Agent State</h2>
            <p className="mt-2 text-sm text-slate-600">Preference memory for Dain: {JSON.stringify(preferenceMemory.acceptedByContractor || {})}</p>
            <h3 className="mt-4 text-sm font-bold uppercase text-slate-500">In-progress jobs</h3>
            <div className="mt-2 space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-sm">
                  {j.id}: {j.title} • {contractorById(j.contractorId).name}
                </div>
              ))}
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase text-slate-500">Agent log</h3>
            <ul className="mt-2 space-y-2">
              {agentLog.map((line, i) => <li key={i} className="rounded bg-slate-100 px-2 py-1 text-xs">{line}</li>)}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
