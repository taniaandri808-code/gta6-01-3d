import * as THREE from 'three';
import { createWorld, worldColliders } from './world.js';
import { buildCity } from './city.js';
import { CFG } from './config.js';
import { Player } from './systems/player.js';
import { Vehicles } from './systems/vehicles.js';
import { Traffic } from './systems/traffic.js';
import { Police } from './systems/police.js';
import { Combat } from './systems/combat.js';
import { Missions } from './systems/missions.js';
import { Hud } from './systems/hud.js';
import { Minimap } from './systems/minimap.js';
import { AudioSys } from './systems/audio.js';
import { Save } from './systems/save.js';
import { Ui } from './systems/ui.js';

// --- functions defined first to avoid TDZ, boot code runs at the bottom ---

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game') });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.y = 3;
  return camera;
}

function createInputManager() {
  const pressed = new Set();
  return {
    pressed,
    onKey(e, fn) {
      if ((e.type === 'keydown' && pressed.has(e.code)) || (e.type === 'keyup' && !pressed.has(e.code))) return;
      if (e.type === 'keydown') pressed.add(e.code);
      else pressed.delete(e.code);
      fn(e);
    },
    handleKeyDown(e) {
      if (e.repeat) return;
      pressed.add(e.code);
    },
    handleKeyUp(e) {
      pressed.delete(e.code);
    },
    bind() {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('mousedown', (e) => { if (e.button !== 0) return; pressed.add('LMB'); });
      window.addEventListener('mouseup', (e) => { if (e.button !== 0) return; pressed.delete('LMB'); });
    },
    unbind() {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    },
  };
}

function createStateMachine(core) {
  const states = {
    start: {
      next: 'playing',
      play(dt) {
        if (dt > 0) this.next = 'playing';
      },
    },
    playing: {
      next: 'playing',
      play(dt) { this.next = 'playing'; },
    },
    paused: {
      next: 'paused',
      play() { this.next = 'paused'; },
    },
    wasted: {
      next: 'wasted',
      timer: 0,
      play(dt) {
        this.timer += dt;
        if (this.timer >= 2) this.next = 'playing';
      },
    },
  };
  return {
    state: 'start',
    get inState() { return this.state; },
    transition(to) { if (states[to]) this.state = to; },
    get next() { return states[this.state].next; },
    play(dt) {
      let s = states[this.state];
      s.play.call(s, dt);
      if (s.next !== this.state) {
        states[this.state].next = this.state;
        this.state = s.next;
      }
    },
  };
}

function createCore() {
  const dom = document.querySelector('#game');
  const core = {};
  core.dom = dom;
  core.renderer = createRenderer();
  core.scene = new THREE.Scene();
  core.scene.fog = new THREE.FogExp2(0x222222, 0.008);
  core.camera = createCamera();

  const world = createWorld(core.scene, core.renderer);
  core.debugger = buildCity(world);

  core.input = createInputManager();
  core.input.bind();
  core.states = createStateMachine();

  core.player = new Player(core.scene, core.camera, core.input, core.dom, core.renderer, dom, core, [0, 0, 0]);
  core.vehicles = new Vehicles(core.scene, core.renderer, world);
  core.traffic = new Traffic(core.scene, core.renderer, core.vehicles, dom, core, world);
  core.police = new Police(core.scene, core.renderer, world, dom, core);
  core.combat = new Combat(core.scene, core.renderer, core, dom);
  core.missions = Missions(core, world);
  core.hud = Hud(core, dom, CFG);
  core.minimap = Minimap(core, dom, CFG);
  core.audio = AudioSys(dom);
  core.save = Save();
  core.ui = Ui(core, dom, CFG);

  core.camera.position.add(new THREE.Vector3(0, 12, -14));
  core.camera.lookAt(new THREE.Vector3(0, 0, 0));

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    core.camera.aspect = w / h;
    core.camera.updateProjectionMatrix();
    core.renderer.setSize(w, h);
  });

  let lastTime = performance.now();
  const dtCap = 1000 / 60;
  let accumulator = 0;

  function update(dt) {
    const s = core.states;
    s.play(dt);
    if (s.inState === 'start' || s.inState === 'paused') return;
    core.player.update(dt, worldColliders(0, 0, 0));
    core.vehicles.update(dt, world, core.player, core);
    core.traffic.update(dt, core.camera, world, core.vehicles, core.player, core);
    core.police.update(dt, world, core.player, core.vehicles, core, core);
    core.combat.update(dt, core.player, core);
    core.missions.update(dt, core);
    core.hud.update(dt, core, dom);
    core.minimap.update(dt, core, dom, CFG);
    core.audio.update(dt, core);
    core.ui.update(dt, core, core.states, core.player, core, dom);
  }

  function render() {
    const ahead = core.player ? new THREE.Vector3(0, 3, 0).add(core.player.forwardVector) : new THREE.Vector3(0, 3, 0);
    core.camera.lookAt(ahead);
    core.renderer.render(core.scene, core.camera);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const frameTime = now - lastTime;
    lastTime = now;
    accumulator += Math.min(frameTime, 100);
    while (accumulator >= dtCap) {
      update(dtCap / 1000);
      accumulator -= dtCap;
    }
    render();
  }

  requestAnimationFrame(loop);

  // mission completion -> money rewards
  core.ui.onMissionComplete = (amount) => { core.player.addMoney(amount); };
  return core;
}

// --- boot code at the bottom to avoid TDZ ---

const core = createCore();
console.log('Game booted');
