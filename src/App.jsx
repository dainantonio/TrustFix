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

function App() {
  const [events] = React.useState(loadEvents);
  const [suspended, setSuspended] = React.useState(getSuspensions);
  const [description, setDescription] = React.useState('Marcus HVAC is late and AC still not cooling.');
  const [parsed, setParsed] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [agentLog, setAgentLog] = React.useState([]);
  const [notifications, setNotifications] = React.useState(listNotifications);
  const [preferenceMemory, setPreferenceMemory] = React.useState(getMemory);
  const [jobs, setJobs] = React.useState(defaultJobs);

  const contractorStats = React.useMemo(() => {
    return withPreferenceBoost(contractors, events, preferenceMemory.acceptedByContractor || {});
  }, [events, preferenceMemory]);

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

    const status = action === 'dismiss' ? 'dismissed' : 'accepted';
    const updated = setNotificationStatus(n.id, status);
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
      if (result.logLines.length) {
        setAgentLog((l) => [...result.logLines, ...l].slice(0, 12));
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [jobs, events, notifications, suspended, contractorStats]);

  return (
    <div>
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="inline-flex rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/40">Phase 4+: Backend-ready autonomy contract</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl">Autonomy extracted into API contract + worker module.</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-extrabold">Intake + smart routing</h2>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button onClick={runIntake} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Run intake</button>
          {parsed && <pre className="mt-3 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(parsed, null, 2)}</pre>}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-extrabold">Notification center (persisted contract)</h2>
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
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
