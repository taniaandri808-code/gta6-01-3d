import * as THREE from 'three';

/**
 * Minimap rendered into a 2D canvas at the bottom-left of the screen.
 * Shows the city layout (roads, blocks, water at south), the player
 * arrow, mission blips, police blips while wanted, district name
 * labels, rotation with the player heading and a north indicator.
 */
export class Minimap {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.padding = 8;                     // margin inside canvas
    this.size = 0;                        // square side in px
    this.heading = 0;                     // radians, east = 0, north = PI/2
    this.wantLevel = 0;
    this._police = [];                    // external police positions
    // City layout (mirrors city.js geometry)
    this.city = {
      half: { x: 512, y: 512 },           // city spans -half..half
      waterSouthY: -128,                  // water occupies y < this
      cell: 128,                          // block/road grid step
      districts: [
        { x: -256, y: 224, text: 'North Point' },
        { x: 256,  y: 192, text: 'East End' },
        { x: -192, y: -224, text: 'South Bay' }
      ]
    };
  }

  /** Recompute pixel scale each frame so the minimap stays square. */
  _syncLayout() {
    const w = this.canvas.width, h = this.canvas.height;
    this.size = Math.min(w, h) - 2 * this.padding;
    this.originX = w / 2;
    this.originY = h / 2;
  }

  /** Convert city coords to canvas coords, rotated by the heading. */
  _project(cityX, cityY) {
    const c = Math.cos(this.heading), s = Math.sin(this.heading);
    // rotate by -heading so the map turns to follow the player
    const rx = cityX * c + cityY * s;
    const ry = -cityX * s + cityY * c;
    const k = this.size / (this.city.half.x * 2); // city units -> px
    return { x: this.originX + rx * k, y: this.originY - ry * k };
  }

  /** Clip drawing to the circular minimap area. */
  _clipCircle() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, this.size / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  /** Draw the static city backdrop (water, blocks, roads). */
  _drawCity() {
    const ctx = this.ctx, cell = this.city.cell;
    ctx.save();
    this._clipCircle();
    ctx.fillStyle = '#0a2b3c';          // base ground
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // water at the south
    const wy = this._project(0, this.city.waterSouthY).y;
    ctx.fillStyle = '#163f5b';
    ctx.fillRect(0, wy, this.canvas.width, this.canvas.height - wy);
    // city blocks
    ctx.fillStyle = '#33475b';
    for (let gy = this.city.waterSouthY; gy < this.city.half.y; gy += cell) {
      for (let gx = -this.city.half.x; gx < this.city.half.x; gx += cell) {
        const bl = this._project(gx, gy + cell);
        const tr = this._project(gx + cell, gy);
        ctx.fillRect(bl.x, bl.y, tr.x - bl.x, tr.y - bl.y);
      }
    }
    // roads on grid lines
    ctx.fillStyle = '#22333f';
    for (let gx = -this.city.half.x; gx <= this.city.half.x; gx += cell) {
      const a = this._project(gx, this.city.waterSouthY);
      const b = this._project(gx, this.city.half.y);
      ctx.fillRect(a.x - 1, Math.min(a.y, b.y) - 1, 2, Math.abs(b.y - a.y) + 2);
    }
    for (let gy = this.city.waterSouthY; gy <= this.city.half.y; gy += cell) {
      const a = this._project(-this.city.half.x, gy);
      const b = this._project(this.city.half.x, gy);
      ctx.fillRect(Math.min(a.x, b.x) - 1, a.y - 1, Math.abs(b.x - a.x) + 2, 2);
    }
    ctx.restore();
  }

  /** District name labels placed at fixed city spots. */
  _drawDistrictLabels() {
    const ctx = this.ctx;
    ctx.save();
    this._clipCircle();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#cfd8dc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.85;
    for (const d of this.city.districts) {
      const p = this._project(d.x, d.y);
      ctx.fillText(d.text, p.x, p.y);
    }
    ctx.restore();
  }

  /** Draw mission markers. */
  _drawMissions(missions) {
    const ctx = this.ctx;
    ctx.save();
    this._clipCircle();
    for (const m of missions || []) {
      if (!m || typeof m.x !== 'number') continue;
      const p = this._project(m.x, m.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = m.completed ? '#7ed321' : '#e53935';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Draw police markers while wanted. */
  _drawPolice(police) {
    const ctx = this.ctx;
    ctx.save();
    this._clipCircle();
    for (const cop of police) {
      const p = this._project(cop.x, cop.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1e88e5';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Draw the player position and a heading arrow. */
  _drawPlayer(player) {
    const ctx = this.ctx;
    const p = this._project(player.x, player.y);
    const r = 6;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-this.heading);
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 2);
    ctx.lineTo(r, r * 1.5);
    ctx.lineTo(0, r * 0.5);
    ctx.lineTo(-r, r * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** North indicator fixed to the screen (does not rotate). */
  _drawNorth() {
    const ctx = this.ctx;
    const r = 9;
    const cx = this.padding + r + 2;
    const cy = this.padding + r + 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // triangle points to true north on screen
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.7);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.5);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#ffd54a';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy);
    ctx.restore();
  }

  /**
   * Update the minimap for a frame.
   * @param {number} _dt delta time (kept for API parity, unused)
   * @param {{x:number,y:number,heading:number}} player
   * @param {Array<{x:number,y:number,completed?:boolean}>} missions
   * @param {number} wanted
   */
  update(_dt, player, missions, wanted) {
    this._syncLayout();
    this.heading = player.heading;
    this.wantLevel = wanted;
    this._drawCity();
    this._drawDistrictLabels();
    this._drawMissions(missions);
    if (this.wantLevel > 0 && this.police.length > 0) {
      this._drawPolice(this.police);
    }
    this._drawPlayer(player);
    this._drawNorth();
  }

  /** Optional external police positions (used when wanted > 0). */
  set police(list) { this._police = list || []; }
  get police() { return this._police; }
}

export default Minimap;
