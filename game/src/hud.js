// DOM-based heads-up display: bars, money, wanted stars, weapon, speedo,
// objective tracker, toast stack and the wasted/busted end-state overlay.
// All layout lives in #hud; everything is built once in the constructor.

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    if (!this.root) throw new Error('Hud: missing #hud container element');
    this.root.innerHTML = '';

    const panel = (cls, label) => {
      const el = document.createElement('div');
      el.className = cls;
      const bar = document.createElement('div');
      bar.className = 'bar';
      const fill = document.createElement('div');
      fill.className = 'fill';
      bar.appendChild(fill);
      const name = document.createElement('span');
      name.className = 'label';
      name.textContent = label;
      el.appendChild(bar);
      el.appendChild(name);
      this.root.appendChild(el);
      return { el, fill, name };
    };

    this.health = panel('hud-panel hud-health', 'HP');
    this.armor = panel('hud-panel hud-armor', 'AP');

    this.moneyEl = document.createElement('div');
    this.moneyEl.className = 'hud-money';
    this.root.appendChild(this.moneyEl);

    this.starsEl = document.createElement('div');
    this.starsEl.className = 'hud-stars';
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.textContent = '\u2605';
      this.starsEl.appendChild(s);
      this.stars.push(s);
    }
    this.root.appendChild(this.starsEl);

    this.weaponEl = document.createElement('div');
    this.weaponEl.className = 'hud-weapon';
    this.root.appendChild(this.weaponEl);

    this.speedo = document.createElement('div');
    this.speedo.className = 'hud-speedo';
    this.speedo.style.display = 'none';
    this.root.appendChild(this.speedo);

    this.objectiveEl = document.createElement('div');
    this.objectiveEl.className = 'hud-objective';
    this.root.appendChild(this.objectiveEl);

    this.toastsEl = document.createElement('div');
    this.toastsEl.className = 'hud-toasts';
    this.root.appendChild(this.toastsEl);

    this.bigEl = document.createElement('div');
    this.bigEl.className = 'hud-big';
    this.bigEl.style.display = 'none';
    this.root.appendChild(this.bigEl);
  }

  update(state) {
    const s = state || {};
    const pct = (v, max) => Math.max(0, Math.min(100, ((v || 0) / max) * 100));
    this.health.fill.style.width = pct(s.health, 100) + '%';
    this.armor.fill.style.width = pct(s.armor, 100) + '%';
    this.moneyEl.textContent = '$' + (s.money || 0).toLocaleString();
    const wanted = Math.max(0, Math.min(5, s.wanted || 0));
    this.stars.forEach((star, i) => star.classList.toggle('lit', i < wanted));
    const weapon = s.weapon || 'Fists';
    this.weaponEl.textContent = s.ammo != null ? weapon + '  ' + s.ammo : weapon;
    if (s.driving) {
      this.speedo.style.display = 'block';
      this.speedo.textContent = Math.round(s.speed || 0) + ' km/h';
    } else {
      this.speedo.style.display = 'none';
    }
    this.objectiveEl.textContent = s.objective || '';
    this.objectiveEl.style.display = s.objective ? 'block' : 'none';
  }

  toast(msg, ms = 2500) {
    const t = document.createElement('div');
    t.className = 'hud-toast';
    t.textContent = msg;
    this.toastsEl.appendChild(t);
    setTimeout(() => {
      t.classList.add('fade');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }

  showWasted() {
    this.bigEl.textContent = 'WASTED';
    this.bigEl.classList.remove('busted');
    this.bigEl.classList.add('show');
    this.bigEl.style.display = 'flex';
  }

  showBusted() {
    this.bigEl.textContent = 'BUSTED';
    this.bigEl.classList.add('busted');
    this.bigEl.classList.add('show');
    this.bigEl.style.display = 'flex';
  }
}
