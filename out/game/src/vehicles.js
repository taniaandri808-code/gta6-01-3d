import * as THREE from 'three';
import { CFG } from './config.js';

const CAR_COLORS = [0xcc0000, 0x0044cc, 0x00aa44, 0xffcc00, 0xff6600, 0x8844aa, 0x222222, 0xeeeeee, 0x448844, 0xdd4444];
const ROAD_SEGMENTS = [];

export class Vehicles {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.cars = [];
    this.activeCar = null;
    this.playerInCar = false;
    this.buildRoadNetwork();
    this.spawnCars();
  }

  buildRoadNetwork() {
    const gridSize = CFG.ROAD_GRID_SIZE || 80;
    const roadWidth = CFG.ROAD_WIDTH || 10;
    for (let x = -4; x <= 4; x++) {
      ROAD_SEGMENTS.push({ x1: x * gridSize, z1: -gridSize * 4, x2: x * gridSize, z2: gridSize * 4, dir: 'z' });
    }
    for (let z = -4; z <= 4; z++) {
      ROAD_SEGMENTS.push({ x1: -gridSize * 4, z1: z * gridSize, x2: gridSize * 4, z2: z * gridSize, dir: 'x' });
    }
  }

  spawnCars() {
    const spacing = 14;
    for (const seg of ROAD_SEGMENTS) {
      const isHorizontal = seg.dir === 'x';
      const length = isHorizontal ? seg.x2 - seg.x1 : seg.z2 - seg.z1;
      const numCars = Math.floor(length / spacing);
      for (let i = 0; i < numCars; i++) {
        const t = (i + 0.5) / numCars;
        let px, pz;
        if (isHorizontal) {
          px = seg.x1 + t * length;
          const side = (i % 2 === 0) ? 1 : -1;
          pz = seg.z1 + side * 8;
        } else {
          pz = seg.z1 + t * length;
          const side = (i % 2 === 0) ? 1 : -1;
          px = seg.x1 + side * 8;
        }
        const rot = isHorizontal ? 0 : Math.PI / 2;
        const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
        this.cars.push(this.createCar(px, pz, rot, color));
      }
    }
  }

  createCar(x, z, rot, color) {
    const car = new THREE.Group();
    car.position.set(x, 0, z);
    car.rotation.y = rot;

    const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4.2);
    const bodyMat = new THREE.MeshPhongMaterial({ color, shininess: 80 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    car.add(body);

    const roofGeo = new THREE.BoxGeometry(1.6, 0.7, 2.2);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.35, -0.2);
    roof.castShadow = true;
    car.add(roof);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const wheelPos = [
      [-0.95, 0.35, 1.4], [0.95, 0.35, 1.4],
      [-0.95, 0.35, -1.4], [0.95, 0.35, -1.4]
    ];
    for (const pos of wheelPos) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...pos);
      wheel.castShadow = true;
      car.add(wheel);
    }

    car.userData = {
      velocity: 0,
      steerAngle: 0,
      driftAngle: 0,
      handbrake: false,
      speed: 0,
      mesh: car
    };

    this.scene.add(car);
    return car;
  }

  enterExit(player) {
    if (this.playerInCar) {
      const car = this.activeCar;
      const forward = new THREE.Vector3(0, 0, -3);
      forward.applyQuaternion(car.quaternion);
      player.position.copy(car.position).add(forward);
      player.visible = true;
      car.userData.velocity = 0;
      this.activeCar = null;
      this.playerInCar = false;
    } else {
      let nearest = null;
      let minDist = 6;
      for (const car of this.cars) {
        const d = player.position.distanceTo(car.position);
        if (d < minDist) { minDist = d; nearest = car; }
      }
      if (nearest) {
        this.activeCar = nearest;
        this.playerInCar = true;
        player.visible = false;
      }
    }
  }

  update(dt, input, player, camera) {
    if (!this.playerInCar || !this.activeCar) return;
    const car = this.activeCar;
    const d = car.userData;
    const accel = CFG.CAR_ACCEL || 25;
    const brake = CFG.CAR_BRAKE || 40;
    const maxSpeed = CFG.CAR_MAX_SPEED || 35;
    const friction = CFG.CAR_FRICTION || 0.98;
    const steerSpeed = CFG.CAR_STEER || 2.5;
    const driftFactor = CFG.CAR_DRIFT || 0.92;

    if (input.forward) d.velocity += accel * dt;
    if (input.backward) d.velocity -= brake * dt;
    if (!input.forward && !input.backward) d.velocity *= friction;

    const speedFactor = Math.min(Math.abs(d.velocity) / maxSpeed, 1);
    const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const targetSteer = steerInput * steerSpeed * speedFactor;
    d.steerAngle += (targetSteer - d.steerAngle) * 4 * dt;

    d.handbrake = input.handbrake || false;
    let effectiveVel = d.velocity;

    if (d.handbrake && Math.abs(d.velocity) > 1) {
      d.driftAngle += d.steerAngle * dt * 0.6;
      effectiveVel *= 0.95;
    } else {
      d.driftAngle *= driftFactor;
    }

    car.rotation.y += d.steerAngle * dt * Math.sign(d.velocity);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(car.quaternion);
    const moveX = forward.x * effectiveVel * dt;
    const moveZ = forward.z * effectiveVel * dt;

    car.position.x += moveX;
    car.position.z += moveZ;

    const newPos = new THREE.Vector3(car.position.x, 0, car.position.z);
    for (const coll of this.colliders) {
      const box = new THREE.Box3().setFromObject(coll);
      if (box.containsPoint(newPos)) {
        car.position.x -= moveX * 1.5;
        car.position.z -= moveZ * 1.5;
        d.velocity *= 0.3;
        break;
      }
    }

    d.velocity = THREE.MathUtils.clamp(d.velocity, -maxSpeed * 0.4, maxSpeed);
    d.speed = Math.abs(d.velocity);

    const camOffset = new THREE.Vector3(0, 5, 10);
    camOffset.applyQuaternion(car.quaternion);
    const targetCam = car.position.clone().add(camOffset);
    camera.position.lerp(targetCam, 5 * dt);
    camera.lookAt(car.position.x, car.position.y + 1.5, car.position.z);

    if (input.exit && !this.exitCooldown) {
      this.enterExit(player);
      this.exitCooldown = true;
      setTimeout(() => { this.exitCooldown = false; }, 300);
    }
  }
}
