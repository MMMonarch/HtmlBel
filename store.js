const STATE_KEY = 'hrms-by-state';

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
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function resetToSeed() {
  const s = structuredClone(seedData);
  saveState(s);
  return s;
}
