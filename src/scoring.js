window.TrustFixScoring = (() => {
  function calcScore(events) {
    if (!events.length) return 60;
    const now = Date.now();
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const ageDays = (now - sorted[sorted.length - 1].timestamp) / (1000 * 60 * 60 * 24);
    const baseScore = 50;
    const recencyWeight = Math.max(0.7, 1.25 - Math.min(ageDays / 60, 0.55));
    const onTime = sorted.filter((e) => e.type === 'completed_on_time').length;
    const late = sorted.filter((e) => e.type === 'late').length;
    const disputes = sorted.filter((e) => e.type === 'dispute').length;
    const cancelled = sorted.filter((e) => e.type === 'cancelled').length;
    const total = onTime + late + disputes + cancelled;
    const onTimeRate = total ? onTime / total : 0;
    const completionVolume = Math.min(total / 15, 1);
    const disputePenalty = disputes + cancelled * 0.6;
    const score = baseScore * recencyWeight + onTimeRate * 40 + completionVolume * 10 - disputePenalty * 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function withPreferenceBoost(contractors, events, acceptedByContractor) {
    return contractors.map((c) => {
      const mine = events.filter((e) => e.contractorId === c.id);
      const score = calcScore(mine);
      const preferenceBoost = acceptedByContractor[c.id] ? 2 : 0;
      return { ...c, score: Math.min(100, score + preferenceBoost) };
    });
  }

  return { calcScore, withPreferenceBoost };
})();
