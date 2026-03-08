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
    const rated = sorted.filter((e) => typeof e.rating === 'number');
    const avgRating = rated.length ? rated.reduce((acc, e) => acc + e.rating, 0) / rated.length : 4;
    const ratingBonus = Math.max(-4, Math.min(6, (avgRating - 3.8) * 4));

    const total = onTime + late + disputes + cancelled;
    const onTimeRate = total ? onTime / total : 0;
    const completionVolume = Math.min(total / 15, 1);
    const disputePenalty = disputes + cancelled * 0.6;
    const score = baseScore * recencyWeight + onTimeRate * 40 + completionVolume * 10 - disputePenalty * 15 + ratingBonus;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function scoreLabel(score) {
    if (score >= 90) return 'Elite';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Fair';
    return 'Watch';
  }

  function scoreClass(score) {
    if (score >= 85) return 'high';
    if (score >= 65) return 'mid';
    return 'low';
  }

  function withPreferenceBoost(contractors, events, acceptedByContractor) {
    return contractors.map((c) => {
      const mine = events.filter((e) => e.contractorId === c.id);
      const score = calcScore(mine);
      const preferenceBoost = acceptedByContractor[c.id] ? 2 : 0;
      return { ...c, score: Math.min(100, score + preferenceBoost) };
    });
  }

  return { calcScore, scoreLabel, scoreClass, withPreferenceBoost };
})();
