window.TrustFixWorker = (() => {
  function addUniqueNotification(notifications, candidate) {
    if (notifications.some((n) => n.key === candidate.key)) return notifications;
    return [{ ...candidate, id: crypto.randomUUID(), status: 'open' }, ...notifications].slice(0, 30);
  }

  function evaluateAutonomy({
    jobs,
    events,
    notifications,
    suspended,
    contractorStats,
    categoryAverage,
    findBackup,
    contractorById,
    now,
  }) {
    let nextJobs = jobs;
    let nextNotifications = [...notifications];
    const nextSuspended = { ...suspended };
    const logLines = [];

    nextJobs = nextJobs.map((job) => {
      if (job.status !== 'In Progress') return job;
      const lateBy = Math.floor((now - job.etaDueAt) / 60000);
      const flags = { ...job.flags };

      if (lateBy > 15 && !flags.late15) {
        nextNotifications = addUniqueNotification(nextNotifications, {
          key: `${job.id}-late15`,
          type: 'watchdog',
          jobId: job.id,
          message: `${contractorById(job.contractorId).name} exceeded ETA by ${lateBy} min. Re-match option available.`,
          why: 'ETA watchdog detected >15 minutes late on an in-progress job.',
        });
        flags.late15 = true;
        logLines.push(`ETA watchdog alert on ${job.id}: ${lateBy} minutes late.`);
      }

      if (lateBy > 45 && !flags.late45) {
        const backup = findBackup(contractorStats, job, nextSuspended);
        if (backup) {
          nextNotifications = addUniqueNotification(nextNotifications, {
            key: `${job.id}-late45`,
            type: 'rematch',
            jobId: job.id,
            backupId: backup.id,
            message: `${contractorById(job.contractorId).name} has exceeded ETA by ${lateBy} minutes. Backup found: ${backup.name} (score ${backup.score}, ETA ${backup.etaMin}min). Accept re-match?`,
            why: 'Autonomous action threshold reached (>45 min late).',
          });
          logLines.push(`Auto-action: initiated re-match proposal for ${job.id} after ${lateBy} min delay.`);
        }
        flags.late45 = true;
      }

      const durationHrs = (now - job.startedAt) / (1000 * 60 * 60);
      const quickFix = /(simple|minor|faucet|drain|leak)/i.test(job.title);
      const durationThreshold = quickFix ? 3.5 : job.trade === 'mitigation' ? 6 : 4.5;
      if (durationHrs > durationThreshold && !flags.durationAlert) {
        nextNotifications = addUniqueNotification(nextNotifications, {
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
        nextNotifications = addUniqueNotification(nextNotifications, {
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
      nextNotifications = addUniqueNotification(nextNotifications, {
        key: 'address-pattern-14-maple',
        type: 'memory',
        message: 'This address has had 2 plumbing jobs in 60 days — suggest preventive inspection.',
        why: 'Job pattern awareness rule detected repeat service at same address.',
      });
    }

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const disputesByContractor = {};
    events.forEach((e) => {
      if (e.type === 'dispute' && e.timestamp >= thirtyDaysAgo) {
        disputesByContractor[e.contractorId] = (disputesByContractor[e.contractorId] || 0) + 1;
      }
    });

    Object.entries(disputesByContractor).forEach(([id, count]) => {
      const cid = Number(id);
      if (count >= 2 && !nextSuspended[cid]) {
        nextSuspended[cid] = true;
        const c = contractorById(cid);
        nextNotifications = addUniqueNotification(nextNotifications, {
          key: `suspend-${cid}`,
          type: 'anomaly',
          message: `${c.name} suspended from new matches after ${count} disputes in 30 days.`,
          why: 'Repeat dispute detection policy triggered.',
        });
        logLines.push(`Contractor suspended: ${c.name} (${count} disputes / 30 days).`);
      }
    });

    return { nextJobs, nextNotifications, nextSuspended, logLines };
  }

  return { evaluateAutonomy };
})();
