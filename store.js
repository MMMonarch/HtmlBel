const STATE_KEY = 'hrms-by-state';

// Polyfill structuredClone for older browsers
if (typeof structuredClone !== 'function') {
  window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return structuredClone(seedData);
    const parsed = JSON.parse(raw);
    if (!parsed.schemaVersion || parsed.schemaVersion < seedData.schemaVersion) {
      const merged = { ...structuredClone(seedData), ...parsed, schemaVersion: seedData.schemaVersion };
      saveState(merged);
      return merged;
    }
    return parsed;
  } catch (e) {
    console.error('Broken state, reset to seed', e);
    const s = structuredClone(seedData);
    saveState(s);
    return s;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Cannot save state', e);
  }
}

function resetToSeed() {
  const s = structuredClone(seedData);
  saveState(s);
  return s;
}
