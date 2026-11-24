import * as THREE from 'three';

const WEAPONS = {
  fists: { name: 'fists', damage: 10, fireRate: 0.6, ammo: Infinity, range: 3, spread: 0.15 },
  pistol: { name: 'pistol', damage: 25, fireRate: 0.15, ammo: 120, range: 80, spread: 0.03 },
  smg: { name: 'smg', damage: 12, fireRate: 0.05, ammo: 180, range: 50, spread: 0.12 },
  rifle: { name: 'rifle', damage: 60, fireRate: 0.12, ammo: 40, range: 200, spread: 0.005 },
};

const FINES = { hospital: { money: 500 } };

export class Combat {
  constructor(scene, camera, onRespawn) {
    this.scene = scene;
    this.camera = camera;
    this.onRespawn = onRespawn;
    this.weapons = Object.fromEntries(
      Object.entries(WEAPONS).map(([key, stat]) => [key, { ...stat }])
    );
    this.currentWeapon = 'fists';
    this.lastShot = -Infinity;
    this.wasted = false;
    this.wastedTimer = 0;
    this.wastedDuration = 4;
    this.flashLight = null;
    this.flashLightTimeout = null;
    this.weaponSwitch = { fists: false, pistol: false, smg: false, rifle: false };
  }

  getEquipped() {
    return this.weapons[this.currentWeapon];
  }

  switchWeapon(index, keys) {
    const names = ['fists', 'pistol', 'smg', 'rifle'];
    const target = names[index];
    if (target && this.weapons[target].ammo !== 0 && keys[target] && !this.weaponSwitch[target]) {
      this.currentWeapon = target;
      this.weaponSwitch[target] = true;
    } else if (!keys[target]) {
      this.weaponSwitch[target] = false;
    }
  }

  _raycast() {
    const sceneObjects = [
      ...(this.scene.peds ? this.scene.peds.filter(p => !p.dead) : []),
      ...(this.scene.police ? this.scene.police.filter(p => !p.dead) : []),
      ...(this.scene.cars ? this.scene.cars : []),
    ];
    const from = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const ray = new THREE.Ray(from, dir);
    let closest = Infinity;
    let hit = null;
    sceneObjects.forEach(obj => {
      if (!obj || obj.dead || !obj.model) return;
      const intersects = ray.intersectObjects([obj.model], false);
      intersects.forEach(isect => {
        if (isect.distance < closest) {
          closest = isect.distance;
          hit = isect;
        }
      });
    });
    return hit;
  }

  shoot() {
    const w = this.getEquipped();
    if (this.wasted || w.ammo === 0) return;
    const now = performance.now();
    if (now - this.lastShot < w.fireRate * 1000) return;
    this.lastShot = now;
    if (w.ammo !== Infinity) w.ammo = Math.max(0, w.ammo - 1);
    const hit = this._raycast();
    if (hit) {
      const target = hit.object.userData.entity;
      if (target && typeof target.takeDamage === 'function') {
        target.takeDamage(w.damage);
      }
    }
    this._spawnMuzzleFlash();
    return !!hit;
  }

  _spawnMuzzleFlash() {
    const w = this.getEquipped();
    if (w.name === 'fists') return;
    const light = new THREE.PointLight(0xffddaa, 6, 15);
    light.position.copy(this.camera.position);
    this.scene.add(light);
    this.flashLight = light;
    if (this.flashLightTimeout) clearTimeout(this.flashLightTimeout);
    this.flashLightTimeout = setTimeout(() => {
      this.scene.remove(light);
      if (this.flashLight === light) this.flashLight = null;
    }, 40);
  }

  hurt(damage) {
    if (this.wasted) return;
    const player = this.scene.player;
    if (!player || player.dead) return;
    player.hp = Math.max(0, player.hp - damage);
    if (player.hp === 0) this.showWasted();
  }

  showWasted() {
    this.wasted = true;
    this.wastedTimer = 0;
    if (this.scene.wastedScreen) this.scene.wastedScreen.style.display = 'flex';
  }

  respawn() {
    const player = this.scene.player;
    player.hp = player.maxHp;
    player.money = Math.max(0, player.money - FINES.hospital.money);
    if (player.spawnPoint) {
      player.position.set(player.spawnPoint.x, player.spawnPoint.y, player.spawnPoint.z);
    }
    this.wasted = false;
    if (this.scene.wastedScreen) this.scene.wastedScreen.style.display = 'none';
    if (typeof this.onRespawn === 'function') this.onRespawn();
  }

  update(dt, player, input, targets) {
    this.wastedTimer += dt;
    if (this.wasted) {
      if (this.wastedTimer >= this.wastedDuration) this.respawn();
      return;
    }
    if (input.weapon && this.weapons[input.weapon] && input.weapons) {
      this.switchWeapon(Object.keys(this.weapons).indexOf(input.weapon), input.weapons);
    }
    if (input.fire) this.shoot();
    if (input.hurt) this.hurt(input.hurtDamage || 1);
  }
}
