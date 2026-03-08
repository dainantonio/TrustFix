window.TrustFixApi = (() => {
  const KEYS = {
    notifications: 'trustfix.notifications.v1',
    memory: 'trustfix.memory.v1',
    suspensions: 'trustfix.suspensions.v1',
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function listNotifications() {
    return loadJSON(KEYS.notifications, []);
  }

  function putNotifications(notifications) {
    saveJSON(KEYS.notifications, notifications);
    return notifications;
  }

  function getMemory() {
    return loadJSON(KEYS.memory, { homeownerId: 'dain', acceptedByContractor: { 1: 3 } });
  }

  function putMemory(memory) {
    saveJSON(KEYS.memory, memory);
    return memory;
  }

  function getSuspensions() {
    return loadJSON(KEYS.suspensions, {});
  }

  function putSuspensions(value) {
    saveJSON(KEYS.suspensions, value);
    return value;
  }

  function setNotificationStatus(notificationId, status) {
    const updated = listNotifications().map((n) => (n.id === notificationId ? { ...n, status } : n));
    putNotifications(updated);
    return updated;
  }

  return {
    listNotifications,
    putNotifications,
    getMemory,
    putMemory,
    getSuspensions,
    putSuspensions,
    setNotificationStatus,
  };
})();
