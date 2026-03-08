window.TrustFixReset = (() => {
  const KEYS = {
    events:        'trustfix.reliabilityEvents.v1',
    notifications: 'trustfix.notifications.v1',
    memory:        'trustfix.memory.v1',
    suspensions:   'trustfix.suspensions.v1',
  };

  // Canonical seed state — same logic as data.js seedEvents()
  function buildSeedState() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const events = [
      { contractorId: 1, jobId: 'j-100', type: 'completed_on_time', timestamp: now - day * 2, rating: 5 },
      { contractorId: 1, jobId: 'j-101', type: 'completed_on_time', timestamp: now - day * 1, rating: 5 },
      { contractorId: 2, jobId: 'j-200', type: 'dispute',           timestamp: now - day * 10, rating: 2 },
      { contractorId: 2, jobId: 'j-201', type: 'dispute',           timestamp: now - day * 5,  rating: 1 },
      { contractorId: 3, jobId: 'j-300', type: 'completed_on_time', timestamp: now - day * 3, rating: 5 },
      { contractorId: 4, jobId: 'j-400', type: 'completed_on_time', timestamp: now - day * 6, rating: 5 },
    ];

    const memory = {
      homeownerId: 'dain',
      acceptedByContractor: { 1: 3 }, // Maya preferred by default
    };

    return { events, notifications: [], memory, suspensions: {} };
  }

  function resetDemo() {
    const seed = buildSeedState();
    localStorage.setItem(KEYS.events,        JSON.stringify(seed.events));
    localStorage.setItem(KEYS.notifications, JSON.stringify(seed.notifications));
    localStorage.setItem(KEYS.memory,        JSON.stringify(seed.memory));
    localStorage.setItem(KEYS.suspensions,   JSON.stringify(seed.suspensions));
    return seed;
  }

  function fullReset() {
    resetDemo();
    window.location.reload();
  }

  return { resetDemo, fullReset, KEYS };
})();
