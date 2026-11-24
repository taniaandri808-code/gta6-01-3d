// User interface layer for the Vice Bay sandbox. Builds the DOM chrome
// (start overlay, pause menu, settings sliders, achievements panel)
// and wires every button to the game-state callbacks it needs.

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class Ui {
  constructor(state, hooks) {
    this.state = state;
    this.hooks = hooks; // { onPlay, onResume, onQuit, onToggleSettings, onSetting }

    this.root = document.createElement('div');
    this.root.id = 'ui-root';
    this.build();
  }

  mount(parent) {
    parent.appendChild(this.root);
  }

  // --- Screen chrome --------------------------------------------------

  build() {
    this.buildStartOverlay();
    this.buildPauseMenu();
    this.buildAchievements();
  }

  buildStartOverlay() {
    const overlay = el('div', 'overlay start-overlay');

    const title = el('h1', 'start-title', 'Vice Bay');
    const subtitle = el('p', 'start-subtitle', 'The city is yours. What will you do?');

    const playBtn = el('button', 'start-play btn', 'Play');
    playBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      this.hooks.onPlay();
    });

    const achievementsBtn = el('button', 'start-achievements btn', 'Achievements');
    achievementsBtn.addEventListener('click', () => this.showAchievements());

    const settingsBtn = el('button', 'start-settings btn', 'Settings');
    settingsBtn.addEventListener('click', () => this.openSettings());

    overlay.append(title, subtitle, playBtn, achievementsBtn, settingsBtn);
    this.startOverlay = overlay;
    this.root.appendChild(overlay);
  }

  buildPauseMenu() {
    const menu = el('div', 'menu pause-menu hidden');

    const resumeBtn = el('button', 'btn', 'Resume');
    resumeBtn.addEventListener('click', () => this.resumeGame());

    const achievementsBtn = el('button', 'btn', 'Achievements');
    achievementsBtn.addEventListener('click', () => {
      this.closePause();
      this.showAchievements();
    });

    const settingsBtn = el('button', 'btn', 'Settings');
    settingsBtn.addEventListener('click', () => this.openSettings());

    const quitBtn = el('button', 'btn quit', 'Quit');
    quitBtn.addEventListener('click', () => this.quitGame());

    menu.append(resumeBtn, achievementsBtn, settingsBtn, quitBtn);
    this.pauseMenu = menu;
    this.root.appendChild(menu);
  }

  // --- Pause control ---------------------------------------------------

  openPause() {
    if (this.state.paused) return;
    this.state.paused = true;
    this.pauseMenu.classList.remove('hidden');
  }

  closePause() {
    if (!this.state.paused) return;
    this.state.paused = false;
    this.pauseMenu.classList.add('hidden');
    this.settingsPanel?.classList.add('hidden');
  }

  resumeGame() {
    this.closePause();
    this.hooks.onResume();
  }

  quitGame() {
    this.closePause();
    this.hideAchievements();
    this.hooks.onQuit();
  }

  // --- Settings --------------------------------------------------------

  openSettings() {
    this.closePause();
    this.ensureSettingsPanel();
    this.settingsPanel.classList.remove('hidden');
  }

  ensureSettingsPanel() {
    if (this.settingsPanel) return;

    const panel = el('div', 'menu settings-panel hidden');

    const sliders = [
      { key: 'masterVolume', label: 'Master Volume', min: 0, max: 1, step: 0.01 },
      { key: 'musicVolume', label: 'Music Volume', min: 0, max: 1, step: 0.01 },
      { key: 'soundVolume', label: 'SFX Volume', min: 0, max: 1, step: 0.01 },
      { key: 'brightness', label: 'Brightness', min: 0.4, max: 1, step: 0.01 },
    ];

    panel.append(el('h2', null, 'Settings'));
    for (const def of sliders) {
      const label = el('label', 'setting-row', def.label);
      panel.appendChild(label);
      const slider = el('input', 'slider');
      slider.type = 'range';
      slider.min = def.min;
      slider.max = def.max;
      slider.step = def.step;
      slider.value = (this.state.settings[def.key] ?? (def.min + def.max) / 2).toString();
      slider.addEventListener('input', () => {
        this.state.settings[def.key] = parseFloat(slider.value);
        this.hooks.onSetting?.(def.key, parseFloat(slider.value));
      });
      label.appendChild(slider);
    }

    const close = el('button', 'btn', 'Close');
    close.addEventListener('click', () => {
      panel.classList.add('hidden');
      this.closePause();
    });
    panel.appendChild(close);

    this.settingsPanel = panel;
    this.root.appendChild(panel);
  }

  // --- Achievements -----------------------------------------------------

  buildAchievements() {
    const container = document.createElement('div');
    container.className = 'overlay achievements-panel hidden';

    const header = el('h1', null, 'Achievements');
    const grid = document.createElement('div');
    grid.className = 'achievements-grid';

    for (const ach of ACHIEVEMENTS) {
      const card = el('div', 'achievement-card');
      card.dataset.id = ach.id;

      const status = document.createElement('span');
      status.className = 'ach-status';
      status.textContent = 'locked';

      const body = document.createElement('div');
      body.className = 'ach-body';
      const name = el('h3', null, ach.name);
      const desc = el('p', 'ach-desc', ach.desc);

      card.append(status, body);
      body.appendChild(name);
      body.appendChild(desc);
      grid.appendChild(card);
    }

    const close = el('button', 'btn', 'Close');
    close.addEventListener('click', () => this.hideAchievements());

    container.append(header, grid, close);
    this.achievementsPanel = container;
    this.root.appendChild(container);
  }

  showAchievements() {
    this.ensureAchievementsData();
    this.achievementsPanel.classList.remove('hidden');
  }

  hideAchievements() {
    this.achievementsPanel.classList.add('hidden');
  }

  // Overridden by hooks when unlocked-achievement events are fired.
  ensureAchievementsData() {
    const set = new Set(this.state.achievements || []);
    for (const card of this.achievementsPanel.querySelectorAll('.achievement-card')) {
      const done = set.has(card.dataset.id);
      card.querySelector('.ach-status').textContent = done ? 'unlocked' : 'locked';
      card.classList.toggle('unlocked', done);
    }
  }
}

// Twelve achievements, hidden until the hooks reward them.
export const ACHIEVEMENTS = [
  { id: 'first_blood',     name: 'First Blood',        desc: 'Complete your first mission.' },
  { id: 'cops_worst_friend', name: 'Cops Worst Friend', desc: 'Reach wanted level 6.' },
  { id: 'small_loans',     name: 'Small Loans',        desc: 'Earn $10,000.' },
  { id: 'empire',          name: 'Empire',             desc: 'Earn $100,000.' },
  { id: 'pacifist',        name: 'Pacifist',           desc: 'Clear five missions without firing a shot.' },
  { id: 'marksman',        name: 'Marksman',           desc: 'Hit 90% of shots in a single gunfight.' },
  { id: 'speedrunner',     name: 'Speedrunner',        desc: 'Finish a mission in under 2 minutes.' },
  { id: 'collector',       name: 'Collector',          desc: 'Stimulate the economy: collect every vehicle.' },
  { id: 'tourist',         name: 'Tourist',            desc: 'Visit every district of Vice Bay.' },
  { id: 'houdini',         name: 'Houdini',            desc: 'Escape the police 50 times.' },
  { id: 'bank_heist',      name: 'Bank Heist',         desc: 'Rob a bank and keep the money.' },
  { id: 'legend',          name: 'Legend',             desc: 'Complete all 12 achievements on one save.' },
];
