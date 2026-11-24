/**
 * AudioSys - WebAudio synthesized sounds for GTA6-R2.
 * Engine loop with pitch by speed, gunshots as noise bursts, police siren,
 * ambient waves near the beach, and 4 procedural radio stations built from
 * small pattern sequencers. Station cycles on the R key; volume from settings.
 */
export class AudioSys {
  constructor(ctx) {
    this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.master.gain.value = 0.7;
    this.engineOsc = null; this.sirenOsc = null; this.waveSrc = null; this.radioGain = null;
    this.radioPlaying = false;
    this.currentStation = 0; this.radioStep = 0; this.radioTimer = 0;
    this.stationPatterns = this._buildStationPatterns();
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.engineGainNode = this.ctx.createGain(); this.engineGainNode.connect(this.master);
    this.ambGain = this.ctx.createGain(); this.ambGain.connect(this.master);
  }
  _buildStationPatterns() {
    return [
      { bpm: 128, seq: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0], bass: [60,0,55,0,60,0,58,0,60,0,55,0,60,0,58,0], lead: [0,0,72,0,0,0,70,0,0,0,72,0,0,0,74,0] },
      { bpm: 90, seq: [1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,1], bass: [36,0,0,0,36,0,38,0,36,0,0,0,36,0,35,0], lead: [] },
      { bpm: 140, seq: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], bass: [0,0,0,0,48,0,0,0,0,0,0,0,48,0,0,0], lead: [48,52,55,0,48,52,55,0,51,55,58,0,51,55,58,0] },
      { bpm: 100, seq: [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0], bass: [55,0,0,0,0,0,60,0,0,0,0,0,58,0,0,0], lead: [60,63,67,60,63,67,62,66,60,63,67,62,66,69,67,60] }
    ];
  }
  _noteToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  _triggerSfx(type) {
    const now = this.ctx.currentTime;
    if (type === 'gunshot') {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const t = i / this.ctx.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20) * (1 - t * 2); }
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 2000;
      src.connect(flt); flt.connect(this.sfxGain); src.start(now);
    } else if (type === 'siren') {
      this.sirenOsc = this.ctx.createOscillator(); this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'sawtooth'; this.sirenOsc.frequency.value = 600; this.sirenGain.gain.value = 0.15;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master); this.sirenOsc.start(now);
      setTimeout(() => { if (this.sirenOsc) { this.sirenOsc.stop(); this.sirenOsc.disconnect(); this.sirenOsc = null; } }, 4000);
    }
  }
  startEngine() {
    if (this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 80;
    const dist = this.ctx.createWaveShaper(); dist.curve = this._makeDistortionCurve(50);
    this.engineOsc.connect(dist); dist.connect(this.engineGainNode);
    this.engineGainNode.gain.value = 0.15; this.engineOsc.start();
  }
  stopEngine() {
    if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc.disconnect(); this.engineOsc = null; }
    this.engineGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }
  startWaves() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 4, this.ctx.sampleRate);
    const d = buf.getChannelData(0); let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / this.ctx.sampleRate; ph += 0.0003 + Math.sin(t * 0.5) * 0.0001;
      d[i] = Math.sin(ph * 220) * 0.3 * (0.5 + 0.5 * Math.sin(t * 0.3)) + (Math.random() * 2 - 1) * 0.05;
    }
    this.waveSrc = this.ctx.createBufferSource(); this.waveSrc.buffer = buf; this.waveSrc.loop = true;
    const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 800;
    this.waveSrc.connect(flt); flt.connect(this.ambGain);
    this.ambGain.gain.value = 0.12; this.waveSrc.start();
  }
  stopWaves() { if (this.waveSrc) { this.waveSrc.stop(); this.waveSrc.disconnect(); this.waveSrc = null; } }
  cycleStation() { this.currentStation = (this.currentStation + 1) % 4; this.radioStep = 0; }
  startRadio() {
    this.radioPlaying = true;
    this.radioGain = this.ctx.createGain(); this.radioGain.gain.value = 0.25; this.radioGain.connect(this.master);
  }
  stopRadio() {
    this.radioPlaying = false;
    if (this.radioGain) { this.radioGain.disconnect(); this.radioGain = null; }
  }
  _playRadioStep(station) {
    const pat = this.stationPatterns[station];
    if (pat.seq[this.radioStep] && this.radioGain) {
      if (pat.bass[this.radioStep]) {
        const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.value = this._noteToFreq(pat.bass[this.radioStep]);
        g.gain.setValueAtTime(0.15, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(g); g.connect(this.radioGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.12);
      }
      if (pat.lead[this.radioStep]) {
        const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = this._noteToFreq(pat.lead[this.radioStep]);
        g.gain.setValueAtTime(0.08, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(g); g.connect(this.radioGain);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
      }
    }
    this.radioStep = (this.radioStep + 1) % 16;
  }
  _makeDistortionCurve(amount) {
    const samples = 44100; const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) { const x = (i * 2) / samples - 1; curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x)); }
    return curve;
  }
  setVolume(v) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
  update(dt, player, driving) {
    if (this.engineOsc && driving) {
      const speed = Math.abs(player?.vel?.x || 0) + Math.abs(player?.vel?.z || 0);
      this.engineOsc.frequency.setTargetAtTime(60 + speed * 40, this.ctx.currentTime, 0.1);
    }
    if (this.sirenOsc) {
      const t = this.ctx.currentTime; this.sirenOsc.frequency.setTargetAtTime(600 + Math.sin(t * 8) * 400, t, 0.01);
    }
    if (this.radioPlaying) {
      this.radioTimer += dt;
      const stepDur = 60 / this.stationPatterns[this.currentStation].bpm / 4;
      if (this.radioTimer >= stepDur) { this.radioTimer -= stepDur; this._playRadioStep(this.currentStation); }
    }
  }
  onKey(key) { if (key === 'KeyR') this.cycleStation(); }
  gunshot() { this._triggerSfx('gunshot'); }
  siren() { this._triggerSfx('siren'); }
}
