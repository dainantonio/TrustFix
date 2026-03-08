window.TrustFixAutonomy = (() => {
  function rankContractors(pool) {
    return [...pool].sort((a, b) => (b.score - a.score) || (a.etaMin - b.etaMin));
  }

  function findBackup(contractorStats, job, suspended) {
    return rankContractors(
      contractorStats.filter((c) => c.trade === job.trade && c.id !== job.contractorId && !suspended[c.id])
    )[0];
  }

  function routeByIntake(contractorStats, intake, suspended) {
    let pool = contractorStats.filter((c) =>
      c.trade === intake.trade || ((intake.flags || []).includes('potential_water_damage') && c.trade === 'mitigation')
    );
    if (intake.severity === 'critical') pool = pool.filter((c) => c.score >= 95 && c.etaMin <= 120);
    pool = pool.filter((c) => c.activeJobs <= 2 && !suspended[c.id]);
    const ranked = rankContractors(pool);
    return intake.urgency === 'emergency' ? ranked.slice(0, 3) : ranked;
  }

  return { rankContractors, findBackup, routeByIntake };
})();
