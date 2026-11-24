// Persistent save system for the Vice Bay sandbox.
// Serializes the important parts of the live game state into a small
// JSON blob in localStorage, restores it on demand, and autosaves on
// a fixed interval so progress survives a page reload or crash.

const KEY = 'vicebay.save.v1';

export const Save = {
  key: KEY,
  timerId: null,

  // Collect the current saveable snapshot from the live game state.
  capture(state) {
    return {
      version: 1,
      player: {
        x: state.player.x,
        y: state.player.y,
        money: state.player.money,
      },
      weapons: (state.player.weapons || []).map((w) => ({
        name: w.name,
        ammo: w.ammo,
      })),
      missions: {
        completed: state.missions.completed.slice(),
        active: state.missions.active ? state.missions.active.id : null,
      },
      wanted: { level: state.wanted.level },
      settings: { ...state.settings },
    };
  },

  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(Save.capture(state)));
      return true;
    } catch (err) {
      console.warn('[save] write failed:', err);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
      // Note: shape validation happens in applySave.
    } catch (err) {
      console.warn('[save] read failed:', err);
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
      return true;
    }
    catch (err) {
      console.warn('[save] clear failed:', err);
      return false;
    }
  },

  // Autosave every 20 seconds while the game is running.
  startAutosave(state, intervalMs = 20000) {
    Save.stopAutosave();
    Save.timerId = setInterval(() => {
      if (state.paused) return;
      Save.save(state);
    }, intervalMs);
    return Save.timerId;
  },

  stopAutosave() {
    if (Save.timerId !== null) {
      clearInterval(Save.timerId);
      Save.timerId = null;
    }
  },
};

// Merge a captured snapshot back into a fresh game state. Fields are
// applied defensively so a corrupted or partially-written blob never
// crashes the game; missing keys simply keep their defaults.
export function applySave(state, data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== 1) return false;

  if (data.player && typeof data.player === 'object') {
    if (Number.isFinite(data.player.x)) state.player.x = data.player.x;
    if (Number.isFinite(data.player.y)) state.player.y = data.player.y;
    if (Number.isFinite(data.player.money)) state.player.money = data.player.money;
  }

  if (Array.isArray(data.weapons) && Array.isArray(state.player.weapons)) {
    for (const saved of data.weapons) {
      const live = state.player.weapons.find((w) => w.name === saved.name);
      if (live && Number.isFinite(saved.ammo)) {
        live.ammo = saved.ammo;
      }
    }
  }

  if (data.missions && typeof data.missions === 'object') {
    if (Array.isArray(data.missions.completed)) {
      state.missions.completed = data.missions.completed.filter(
        (id) => typeof id === 'string'
      );
    }
    if (typeof data.missions.active === 'string') {
      state.missions.active = state.missions.list.find(
        (m) => m.id === data.missions.active
      ) || null;
    }
  }

  if (data.wanted && Number.isFinite(data.wanted.level)) {
    state.wanted.level = Math.max(0, Math.min(6, data.wanted.level | 0));
  }

  if (data.settings && typeof data.settings === 'object') {
    Object.assign(state.settings, data.settings);
  }

  return true;
}

// Wipe the stored save and reset the autosave timer.
export function resetSave(state) {
  Save.stopAutosave();
  return Save.clear();
}
