import * as THREE from 'three';

import { createWorld, updateWorld, worldColliders } from './world.js';
import { buildCity, isOnRoad } from './city.js';
import { CFG } from './config.js';
import { Player } from './player.js';
import { Vehicles } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { AudioSys } from './audio.js';
import { Save } from './save.js';
import { Ui } from './ui.js';

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    shadows: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function createCamera() {
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 6, 10);
  return camera;
}

function createInputManager() {
  const pressed = new Set();
  
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
    }
    pressed.add(e.code);
    
    if (e.code === 'KeyR') {
      audio.cycleStation();
    }
    
    if (e.code === 'KeyM') {
      const next = missions.getNextMission();
      if (next) {
        missions.startMission(next.id);
        hud.toast('Mission started: ' + next.name);
      }
    }
  });
  
  window.addEventListener('keyup', (e) => {
    pressed.delete(e.code);
  });
  
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      pressed.add('MouseLeft');
    }
  });
  
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      pressed.delete('MouseLeft');
    }
  });
  
  return pressed;
}

function inputFrom(pressed, weapon) {
  const input = {
    forward: pressed.has('KeyW') || pressed.has('ArrowUp'),
    backward: pressed.has('KeyS') || pressed.has('ArrowDown'),
    left: pressed.has('KeyA') || pressed.has('ArrowLeft'),
    right: pressed.has('KeyD') || pressed.has('ArrowRight'),
    sprint: pressed.has('ShiftLeft') || pressed.has('ShiftRight'),
    jump: pressed.has('Space'),
    handbrake: pressed.has('Space'),
    exit: pressed.has('KeyE'),
    fire: pressed.has('MouseLeft'),
    weapon: weapon,
    weapons: {
      fists: pressed.has('Digit1'),
      pistol: pressed.has('Digit2'),
      smg: pressed.has('Digit3'),
      rifle: pressed.has('Digit4')
    }
  };
  return input;
}

function createCore() {
  const canvas = document.getElementById('game');
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  
  const camera = createCamera();
  scene.camera = camera;
  
  createWorld(scene);
  buildCity(scene, worldColliders);
  
  const player = new Player(scene);
  
  const vehicles = new Vehicles(scene, worldColliders);
  
  const traffic = new Traffic(scene, worldColliders);
  
  const police = new Police(scene, scene, player);
  
  const combat = new Combat(scene, camera, () => {
    player.position.set(0, 1, 0);
    player.health = 100;
    vehicles.playerInCar = false;
    vehicles.activeCar = null;
  });
  
  const missions = new Missions();
  
  const hud = new Hud();
  
  const minimap = new Minimap(document.getElementById('minimap-canvas'));
  
  const audio = new AudioSys();
  
  const ui = new Ui({ state: 'start' }, {
    onPlay: () => { state = 'playing'; },
    onResume: () => { state = 'playing'; },
    onQuit: () => { state = 'quit'; },
    onToggleSettings: () => { ui.openPause(); },
    onSetting: () => { ui.openPause(); }
  });
  
  ui.mount(document.body);
  
  return { renderer, scene, camera, player, vehicles, traffic, police, combat, missions, hud, minimap, audio, ui };
}

let state = 'start';
let lastTime = performance.now();
let frameTime = 0;

function update(dt) {
  frameTime += dt;
  if (frameTime > 100) dt = 100 - frameTime;
  frameTime = 0;
  
  updateWorld(scene, dt);
  
  if (state !== 'playing') return;
  
  if (!vehicles.playerInCar) {
    const offset = new THREE.Vector3(Math.sin(camera.rotation.y) * 8, 5, Math.cos(camera.rotation.y) * 8);
    camera.position.lerp(player.position.clone().add(offset), 5 * dt);
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
  }
  
  player.update(dt, input, worldColliders);
  player.hp = player.health;
  
  vehicles.update(dt, input, player, camera);
  
  const driving = !!vehicles.playerInCar;
  
  traffic.update(dt, player, police.wantedLevel);
  
  police.update(dt);
  
  combat.update(dt, player, input, traffic.peds);
  
  if (missions.currentMission) {
    const stage = missions.getCurrentStage();
    if (stage && stage.type === 'goto') {
      const dx = player.position.x - stage.marker.x;
      const dz = player.position.z - stage.marker.y;
      const dist = Math.hypot(dx, dz);
      if (dist < stage.marker.radius * 4) {
        missions.advanceStage();
        hud.toast('Objective complete');
      }
    }
  }
  
  const weaponName = combat.weapons[combat.currentWeapon]?.name || 'fists';
  const weaponAmmo = combat.weapons[combat.currentWeapon]?.ammo;
  
  hud.update({
    health: player.hp,
    armor: 0,
    money: player.money,
    wanted: police.wantedLevel,
    weapon: weaponName,
    ammo: weaponAmmo,
    driving: driving,
    speed: driving ? vehicles.activeCar.userData.speed * 3.6 : 0,
    objective: missions.currentMission ? missions.getCurrentStage()?.label : 'Press M for missions'
  });
  
  minimap.update(dt, { x: player.position.x, y: player.position.z, heading: camera.rotation.y }, missions.missions, police.wantedLevel);
  
  audio.update(dt, player, driving);
}

function loop() {
  const now = performance.now();
  const dt = Math.min(now - lastTime, 100) / 1000;
  lastTime = now;
  
  update(dt);
  
  renderer.render(scene, camera);
  
  requestAnimationFrame(loop);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

const input = createInputManager();
const { renderer, scene, camera, player, vehicles, traffic, police, combat, missions, hud, minimap, audio, ui } = createCore();
resize();
loop();
