// Wanted-level police system for the Vice Bay sandbox.
//
// Player crimes fill a heat meter which decays over time once it falls
// below the heat threshold for the current wanted level. Higher stars
// spawn progressively nastier responses: cruiser pursuits, an air unit
// with a searchable spotlight, roadblocks, and lethal response teams at
// 5 stars.

import * as THREE from 'three';

const MAX_WANTED = 5;

// Heat is measured on a 0-1999+ scale; each star level has a zone with a
// decay threshold that pauses cool-down until the heat drops below it.
const HEAT_FOR_STAR = [450, 600, 800, 1100, 1500];
const DECAY_PER_SECOND = [25, 20, 15, 10, 5];

export class Police {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;

    this.heat = 0;
    this.wantedLevel = 0;

    this.cars = [];         // active pursuit cruisers
    this.helicopter = null; // air unit at 3+ stars
    this.roadblocks = [];   // roadblock groups at 4+ stars
    this.shootPeds = [];    // near-5 lethal response peds

    // Pre-baked materials so spawning units does not rebuild them.
    this.cruiserMat = new THREE.MeshStandardMaterial({ color: 0xff3030 });
    this.sirenMat = new THREE.MeshStandardMaterial({ color: 0xffe100 });
  }

  // ---- Wanted level management ----

  // Crime events add heat; the wanted level is derived from the heat zones.
  addCrime(amount = 1) {
    this.heat += amount;
    this.heat = Math.min(this.heat, 1999);
    this._refreshWanted(true);
    this._spawnForLevel();
  }

  // Passive decay: when heat is below the threshold of the current wanted
  // level, stars cool toward zero; otherwise heat wanes but stars hold.
  update(dt) {
    const lvlIdx = Math.max(this.wantedLevel - 1, 0);
    const threshold = HEAT_FOR_STAR[lvlIdx];
    if (this.heat > threshold) {
      this.heat -= DECAY_PER_SECOND[lvlIdx] * dt * 0.25;
      this.heat = Math.max(this.heat, 0);
      return;
    }
    this._refreshWanted(false);
    if (this.wantedLevel > 0) {
      this.heat -= DECAY_PER_SECOND[lvlIdx] * dt;
      this.heat = Math.max(this.heat, 0);
      this._refreshWanted(false);
    }
  }

  // Recompute the wanted level from heat and spawn/clear units as needed.
  _refreshWanted(justHeat) {
    let newLevel = 0;
    for (let i = 4; i >= 0; i--) {
      if (this.heat >= HEAT_FOR_STAR[i]) { newLevel = i + 1; break; }
    }
    if (newLevel === this.wantedLevel && !justHeat) return;
    this.wantedLevel = newLevel;
    this._spawnForLevel();
  }

  clearWanted() {
    this.heat = 0;
    this.wantedLevel = 0;
    this.removeAllUnits();
  }

  removeAllUnits() {
    for (const c of this.cars) this.scene.remove(c.group);
    this.cars = [];
    if (this.helicopter) { this.scene.remove(this.helicopter.group); this.helicopter = null; }
    for (const r of this.roadblocks) for (const m of r) this.scene.remove(m);
    this.roadblocks = [];
    for (const p of this.shootPeds) this.scene.remove(p.group);
    this.shootPeds = [];
  }

  // ---- Unit spawning ----

  _spawnForLevel() {
    const lvl = this.wantedLevel;
    if (lvl < 1) return; // no heat, no police
    if (!this.cars.length) this._spawnCruisers(Math.min(lvl, 4));
    if (lvl >= 3 && !this.helicopter) this._spawnHelicopter();
    if (lvl >= 4 && this.roadblocks.length < 2) this._spawnRoadblocks(lvl);
    if (lvl >= 5 && this.shootPeds.length < 2) this._spawnResponse(lvl);
  }

  // Patrol cars that chase the player using the same arcade car model.
  _spawnCruisers(count) {
    for (let i = 0; i < count; i++) {
      const car = this.world.spawnCar(this.cruiserMat, true);
      car.pursuit = true; // mark for the car AI to chase rather than wander
      this.cars.push(car);
    }
  }

  // Air unit: circles a ring around the player with a cone spotlight.
  _spawnHelicopter() {
    const heli = this.world.spawnHelicopter();
    heli.spot = new THREE.SpotLight(0xffffff, 8, 120, Math.PI / 6, 0.2, 4);
    this.scene.add(heli.spot);
    this.helicopter = heli;
  }

  _spawnRoadblocks(count) {
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    for (let i = 0; i < Math.min(count, dirs.length); i++) {
      const dist = 40 + i * 20;
      const angle = this.player.rotation + dirs[i];
      const x = this.player.position.x + Math.cos(angle) * dist;
      const z = this.player.position.z + Math.sin(angle) * dist;
      const roadblock = this.world.buildRoadblock(x, z, dirs[i]);
      this.roadblocks.push(roadblock);
    }
  }

  _spawnResponse(count) {
    for (let i = 0; i < count; i++) {
      const offset = (i - 1) * 6;
      const pos = new THREE.Vector3(
        this.player.position.x + offset, 0,
        this.player.position.z + 10 + i * 8,
      );
      const ped = this.world.spawnResponsePed(pos);
      if (ped) this.shootPeds.push(ped);
    }
  }

  // ---- AI tick ----

  tickPursuit() {
    for (const car of this.cars) {
      // Cruisers steer toward the player's heading while avoiding overlap.
      const toPlayer = new THREE.Vector3().subVectors(
        this.player.position, car.group.position,
      );
      if (toPlayer.length() < 3) {
        car.group.position.addScaledVector(toPlayer, 0.1);
        continue;
      }
      const desired = toPlayer.clone().normalize();
      const fwd = car.group.getWorldDirection(new THREE.Vector3());
      car.input.turnLeft = fwd.dot(desired) < 0.7;
      car.input.boost = toPlayer.length() > 25 && car.speed < 40;
    }
    // The helicopter orbits on a parametric ring updated by the world.
    if (this.helicopter) this.helicopter.orbitTime =
      (this.helicopter.orbitTime || 0) + 0.02;
  }

  get maxWanted() { return MAX_WANTED; }
  get wantedStars() { return this.wantedLevel; }
}
