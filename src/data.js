window.TrustFixData = (() => {
  const STORAGE_KEY = 'trustfix.reliabilityEvents.v1';

  const contractors = [
    { id: 1, name: 'Maya Plumbing Co.', trade: 'plumbing', etaMin: 32, activeJobs: 1 },
    { id: 2, name: 'Marcus HVAC', trade: 'hvac', etaMin: 28, activeJobs: 2 },
    { id: 3, name: 'CoolAir Pro', trade: 'hvac', etaMin: 28, activeJobs: 1 },
    { id: 4, name: 'Springfield Rooter', trade: 'plumbing', etaMin: 24, activeJobs: 1 },
    { id: 5, name: 'Rapid Dry Mitigation', trade: 'mitigation', etaMin: 35, activeJobs: 1 },
  ];

  const categoryAverage = { plumbing: 220, hvac: 340, mitigation: 450, general: 180 };

  function seedEvents() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    return [
      { contractorId: 1, jobId: 'j-100', type: 'completed_on_time', timestamp: now - day * 2, rating: 5 },
      { contractorId: 1, jobId: 'j-101', type: 'completed_on_time', timestamp: now - day * 1, rating: 5 },
      { contractorId: 2, jobId: 'j-200', type: 'dispute', timestamp: now - day * 10, rating: 2 },
      { contractorId: 2, jobId: 'j-201', type: 'dispute', timestamp: now - day * 5, rating: 1 },
      { contractorId: 3, jobId: 'j-300', type: 'completed_on_time', timestamp: now - day * 3, rating: 5 },
      { contractorId: 4, jobId: 'j-400', type: 'completed_on_time', timestamp: now - day * 6, rating: 5 },
    ];
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = seedEvents();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw);
    } catch {
      return seedEvents();
    }
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function defaultJobs() {
    return [
      {
        id: 'job-live-1', homeownerId: 'dain', address: '14 Maple St', title: 'AC not cooling', trade: 'hvac',
        contractorId: 2, status: 'In Progress', quotedPrice: 495, createdAt: Date.now() - 2 * 60 * 60 * 1000,
        startedAt: Date.now() - 90 * 60 * 1000, etaDueAt: Date.now() - 47 * 60 * 1000, flags: {},
      },
      {
        id: 'job-live-2', homeownerId: 'dain', address: '14 Maple St', title: 'simple faucet fix', trade: 'plumbing',
        contractorId: 1, status: 'In Progress', quotedPrice: 180, createdAt: Date.now() - 5 * 60 * 60 * 1000,
        startedAt: Date.now() - 4.4 * 60 * 60 * 1000, etaDueAt: Date.now() - 20 * 60 * 1000, flags: {},
      },
    ];
  }

  return { STORAGE_KEY, contractors, categoryAverage, seedEvents, loadEvents, saveEvents, defaultJobs };
})();
