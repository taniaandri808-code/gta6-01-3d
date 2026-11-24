import * as THREE from 'three';

const CAR_MATERIALS = [
  new THREE.MeshLambertMaterial({ color: 0xe05000 }),
  new THREE.MeshLambertMaterial({ color: 0x2050e0 }),
  new THREE.MeshLambertMaterial({ color: 0x50a050 }),
  new THREE.MeshLambertMaterial({ color: 0xe0d050 }),
];

function makeCar(scene, material) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.5, 4.0),
    material
  );
  group.add(body);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.35, 2.6),
    new THREE.MeshLambertMaterial({ color: 0x303030 })
  );
  cab.position.z = -1.4;
  group.add(cab);
  scene.add(group);
  return group;
}

function makePed(scene) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.4, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x20a0c0 })
  );
  scene.add(mesh);
  colliders.push(mesh);
  return mesh;
}

export class Traffic {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders || [];
    this.cars = [];
    this.peds = [];
    this.waypoints = [];

    // Spawn AI cars on road lanes
    const lanes = RoadGrid.getLanes();
    for (let i = 0; i < lanes.length && this.cars.length < 40; i++) {
      const lane = lanes[i];
      const car = makeCar(scene, CAR_MATERIALS[i % CAR_MATERIALS.length]);
      car.position.set(lane.start.x, 0.5, lane.start.z);
      car.userData = {
        lane: lane,
        wp: 0,
        speed: 8 + Math.random() * 6,
        dir: lane.dir || 1,
      };
      this.cars.push(car);
    }

    // Spawn ~80 pedestrians on sidewalks
    while (this.peds.length < 80) {
      const ped = makePed(scene, 0.2);
      ped.position.set(
        (Math.random() - 0.5) * 200,
        0.2,
        (Math.random() - 0.5) * 200
      );
      ped.userData = {
        target: null,
        wanderTimer: Math.random() * 3,
        speed: 0.8 + Math.random() * 0.8,
        fleeing: false,
      };
      this.peds.push(ped);
    }
  }

  _nextWaypoint(car) {
    const lane = car.userData.lane;
    if (!lane.pts || !lane.pts.length) return null;
    const pts = lane.pts;
    let wp = car.userData.wp;
    if (wp >= pts.length - 1) {
      wp = lane.loop ? 0 : Math.max(0, pts.length - 2);
    }
    return pts[wp];
  }

  update(dt, player, wanted) {
    // Drive cars along waypoints
    for (const car of this.cars) {
      const lane = car.userData.lane;
      if (!lane || !lane.pts || !lane.pts.length) continue;

      const wp = this._nextWaypoint(car);
      if (!wp) continue;

      const pos = car.position;
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.0) {
        car.userData.wp++;
        if (car.userData.wp >= lane.pts.length) {
          if (lane.loop) car.userData.wp = 0;
          else car.userData.wp = Math.max(0, lane.pts.length - 2);
        }
      }

      const ang = Math.atan2(dx, dz);
      car.rotation.y = ang;
      const speed = car.userData.speed;
      pos.x += Math.sin(ang) * speed * dt;
      pos.z += Math.cos(ang) * speed * dt;
    }

    // Wander pedestrians
    for (const ped of this.peds) {
      const ud = ped.userData;
      ud.wanderTimer -= dt;

      if (ud.wanderTimer <= 0) {
        ud.target = new THREE.Vector3(
          ped.position.x + (Math.random() - 0.5) * 30,
          ped.position.y,
          ped.position.z + (Math.random() - 0.5) * 30
        );
        ud.wanderTimer = 2 + Math.random() * 3;
      }

      let speed = ud.speed;
      let target = ud.target;

      // Flee when wanted > 1
      if (wanted > 1) {
        ud.fleeing = true;
        const away = new THREE.Vector3(ped.position.x - player.position.x, 0, ped.position.z - player.position.z).normalize();
        target = new THREE.Vector3(
          ped.position.x + away.x * 30,
          ped.position.y,
          ped.position.z + away.z * 30
        );
        speed *= 1.8;
      }

      if (target) {
        const dx = target.x - ped.position.x;
        const dz = target.z - ped.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          const ang = Math.atan2(dx, dz);
          ped.rotation.y = ang;
          ped.position.x += Math.sin(ang) * speed * dt;
          ped.position.z += Math.cos(ang) * speed * dt;
        }
      }
    }
  }
}
