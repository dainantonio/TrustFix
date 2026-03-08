const { contractors, categoryAverage, loadEvents, saveEvents, defaultJobs } = window.TrustFixData;
const { withPreferenceBoost } = window.TrustFixScoring;
const { fallbackParse, llmParseIntake } = window.TrustFixParsing;
const { findBackup, routeByIntake } = window.TrustFixAutonomy;

function App() {
  const [events, setEvents] = React.useState(loadEvents);
  const [suspended, setSuspended] = React.useState({});
  const [description, setDescription] = React.useState('Marcus HVAC is late and AC still not cooling.');
  const [parsed, setParsed] = React.useState(null);
  const [matches, setMatches] = React.useState([]);
  const [agentLog, setAgentLog] = React.useState([]);
  const [notifications, setNotifications] = React.useState([]);
  const [preferenceMemory, setPreferenceMemory] = React.useState({ homeownerId: 'dain', acceptedByContractor: { 1: 3 } });
  const [jobs, setJobs] = React.useState(defaultJobs);

  const contractorStats = React.useMemo(() => {
    return withPreferenceBoost(contractors, events, preferenceMemory.acceptedByContractor);
  }, [events, preferenceMemory]);

  function contractorById(id) {
    return contractorStats.find((c) => c.id === id) || contractors.find((c) => c.id === id);
  }

  function enqueueNotification(n) {
    setNotifications((prev) => prev.find((x) => x.key === n.key) ? prev : [{ ...n, id: crypto.randomUUID(), status: 'open' }, ...prev].slice(0, 20));
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
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, status: action === 'dismiss' ? 'dismissed' : 'accepted' } : x));

    if (action === 'why') {
      setAgentLog((l) => [`Why: ${n.why}`, ...l].slice(0, 12));
      return;
    }

    if (action === 'accept' && n.type === 'rematch' && n.jobId && n.backupId) {
      setJobs((prev) => prev.map((j) => j.id === n.jobId
        ? { ...j, contractorId: n.backupId, etaDueAt: Date.now() + (contractorById(n.backupId).etaMin * 60 * 1000), flags: { ...j.flags, rematched: true } }
        : j));
      setPreferenceMemory((m) => ({
        ...m,
        acceptedByContractor: { ...m.acceptedByContractor, [n.backupId]: (m.acceptedByContractor[n.backupId] || 0) + 1 },
      }));
      setAgentLog((l) => [`Accepted auto re-match to ${contractorById(n.backupId).name}. Preference memory updated.`, ...l].slice(0, 12));
    }
  }

  React.useEffect(() => { runIntake(); }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setJobs((prevJobs) => {
        const nextJobs = prevJobs.map((job) => {
          if (job.status !== 'In Progress') return job;
          const lateBy = Math.floor((now - job.etaDueAt) / 60000);
          let flags = { ...job.flags };

          if (lateBy > 15 && !flags.late15) {
            enqueueNotification({
              key: `${job.id}-late15`,
              type: 'watchdog',
              jobId: job.id,
              message: `${contractorById(job.contractorId).name} exceeded ETA by ${lateBy} min. Re-match option available.`,
              why: 'ETA watchdog detected >15 minutes late on an in-progress job.',
            });
            setAgentLog((l) => [`ETA watchdog alert on ${job.id}: ${lateBy} minutes late.`, ...l].slice(0, 12));
            flags.late15 = true;
          }

          if (lateBy > 45 && !flags.late45) {
            const backup = findBackup(contractorStats, job, suspended);
            if (backup) {
              enqueueNotification({
                key: `${job.id}-late45`,
                type: 'rematch',
                jobId: job.id,
                backupId: backup.id,
                message: `${contractorById(job.contractorId).name} has exceeded ETA by ${lateBy} minutes. Backup found: ${backup.name} (score ${backup.score}, ETA ${backup.etaMin}min). Accept re-match?`,
                why: 'Autonomous action threshold reached (>45 min late).',
              });
              setAgentLog((l) => [`Auto-action: initiated re-match proposal for ${job.id} after ${lateBy} min delay.`, ...l].slice(0, 12));
            }
            flags.late45 = true;
          }

          const durationHrs = (now - job.startedAt) / (1000 * 60 * 60);
          if (job.title.toLowerCase().includes('simple faucet fix') && durationHrs > 4 && !flags.durationAlert) {
            enqueueNotification({
              key: `${job.id}-duration`,
              type: 'anomaly',
              jobId: job.id,
              message: `${job.title} has been in progress for ${durationHrs.toFixed(1)} hours. Review recommended.`,
              why: 'Unusual duration anomaly detected for a simple repair class.',
            });
            flags.durationAlert = true;
          }

          const avg = categoryAverage[job.trade] || 200;
          if (job.quotedPrice > avg * 1.3 && !flags.priceFlag) {
            enqueueNotification({
              key: `${job.id}-price`,
              type: 'anomaly',
              jobId: job.id,
              message: `Quoted price $${job.quotedPrice} is >30% above ${job.trade} average ($${avg}).`,
              why: 'Price variance policy threshold exceeded.',
            });
            flags.priceFlag = true;
          }

          return { ...job, flags };
        });

        const sixtyDays = 60 * 24 * 60 * 60 * 1000;
        const plumbingAtAddress = nextJobs.filter((j) => j.address === '14 Maple St' && j.trade === 'plumbing' && now - j.createdAt <= sixtyDays).length;
        if (plumbingAtAddress >= 2) {
          enqueueNotification({
            key: 'address-pattern-14-maple',
            type: 'memory',
            message: 'This address has had 2 plumbing jobs in 60 days — suggest preventive inspection.',
            why: 'Job pattern awareness rule detected repeat service at same address.',
          });
        }

        return nextJobs;
      });

      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const disputesByContractor = {};
      events.forEach((e) => {
        if (e.type === 'dispute' && e.timestamp >= thirtyDaysAgo) {
          disputesByContractor[e.contractorId] = (disputesByContractor[e.contractorId] || 0) + 1;
        }
      });

      Object.entries(disputesByContractor).forEach(([id, count]) => {
        const cid = Number(id);
        if (count >= 2 && !suspended[cid]) {
          setSuspended((s) => ({ ...s, [cid]: true }));
          const c = contractorById(cid);
          enqueueNotification({
            key: `suspend-${cid}`,
            type: 'anomaly',
            message: `${c.name} suspended from new matches after ${count} disputes in 30 days.`,
            why: 'Repeat dispute detection policy triggered.',
          });
        }
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [events, suspended, contractorStats]);

  return (
    <div>
      <header className="hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <p className="inline-flex rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300/40">Phase 4: Proactive Agent + Autonomous Actions</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl">Codebase refactored into modules + autonomy kept advancing.</h1>
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
          <h2 className="text-xl font-extrabold">Homeowner notification center</h2>
          <div className="mt-4 space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm">{n.message}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleNotificationAction(n, 'accept')} className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Accept</button>
                  <button onClick={() => handleNotificationAction(n, 'dismiss')} className="rounded bg-slate-600 px-2 py-1 text-xs font-bold text-white">Dismiss</button>
                  <button onClick={() => handleNotificationAction(n, 'why')} className="rounded bg-indigo-600 px-2 py-1 text-xs font-bold text-white">Ask agent why</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
