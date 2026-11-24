import * as THREE from 'three';

import { CFG } from './config.js';


// Third-person humanoid player: capsule body + sphere head + arm/leg boxes
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.health = 100;
    this.money = CFG.startMoney;
    this.weaponSlot = null;
    this.group = new THREE.Group();

    // Physics state
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.position = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.rotation = 0; // yaw
    this.onGround = false;
    this.jumpCooldown = 0;

    // Input state (set externally via input object)
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
    };

    // --- Build visuals ---
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a237e });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });

    // Body (capsule approximation: cylinder + two hemisphere-like spheres)
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.6, 4, 8);
    this.bodyMesh = new THREE.Mesh(bodyGeo, mat);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.position.y = 0.7;
    this.group.add(this.bodyMesh);

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.22, 12, 8);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.castShadow = true;
    this.headMesh.position.y = 1.32;
    this.group.add(this.headMesh);

    // Left arm
    const armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    this.leftArm = new THREE.Mesh(armGeo, mat);
    this.leftArm.castShadow = true;
    this.leftArm.position.set(-0.38, 0.7, 0);
    this.group.add(this.leftArm);

    // Right arm
    this.rightArm = new THREE.Mesh(armGeo, mat);
    this.rightArm.castShadow = true;
    this.rightArm.position.set(0.38, 0.7, 0);
    this.group.add(this.rightArm);

    // Left leg
    const legGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.castShadow = true;
    this.leftLeg.position.set(-0.12, 0.0, 0);
    this.group.add(this.leftLeg);

    // Right leg
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.castShadow = true;
    this.rightLeg.position.set(0.12, 0.0, 0);
    this.group.add(this.rightLeg);

    // Left shoe
    const shoeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.22);
    this.leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    this.leftShoe.castShadow = true;
    this.leftShoe.position.set(-0.12, -0.325, 0.03);
    this.group.add(this.leftShoe);

    // Right shoe
    this.rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    this.rightShoe.castShadow = true;
    this.rightShoe.position.set(0.12, -0.325, 0.03);
    this.group.add(this.rightShoe);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  // AABB for collision (capsule approximated as a box)
  getAABB() {
    return {
      minX: this.position.x - 0.3,
      maxX: this.position.x + 0.3,
      minY: this.position.y - 0.4,
      maxY: this.position.y + 1.6,
      minZ: this.position.z - 0.3,
      maxZ: this.position.z + 0.3,
    };
  }

  update(dt, input, colliders) {
    // Merge input
    if (input) Object.assign(this.input, input);
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    // Determine camera yaw for relative movement
    const cam = this._getCameraYaw();
    const yaw = cam !== undefined ? cam : 0;

    // Build movement direction relative to camera
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.input.forward)  moveDir.z -= 1;
    if (this.input.backward) moveDir.z += 1;
    if (this.input.left)     moveDir.x -= 1;
    if (this.input.right)    moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate by camera yaw
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const rx = moveDir.x * cos - moveDir.z * sin;
      const rz = moveDir.x * sin + moveDir.z * cos;
      const speed = this.input.sprint ? 10 : 5;
      this.velocity.x = rx * speed;
      this.velocity.z = rz * speed;

      // Face movement direction
      this.rotation = Math.atan2(-rx, -rz);
    } else {
      // Friction / deceleration
      this.velocity.x *= 0.85;
      this.velocity.z *= 0.85;
    }

    // Gravity
    this.velocity.y -= 25 * dt;
    if (this.velocity.y < -30) this.velocity.y = -30;

    // Jump
    if (this.input.jump && this.grounded && this.jumpCooldown <= 0) {
      this.velocity.y = 9;
      this.grounded = false;
      this.jumpCooldown = 0.3;
    }

    // Move and collide
    const steps = 4;
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      this._moveAxis('x', stepDt, colliders);
      this._moveAxis('y', stepDt, colliders);
      this._moveAxis('z', stepDt, colliders);
    }

    // Update visual group
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotation;

    // Animate limbs
    this._animateLimbs(dt);

    // Reset per-frame input flags that shouldn't persist
    this.input.jump = false;
  }

  _moveAxis(axis, dt, colliders) {
    const sign = axis === 'y' ? 1 : 1;
    const oldPos = this.position.clone();
    this.position[axis] += this.velocity[axis] * dt;

    // Ground check
    if (axis === 'y' && this.position.y < 0.4) {
      this.position.y = 0.4;
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
        this.grounded = true;
      }
    } else {
      this.grounded = false;
    }

    // Collider pushout
    const aabb = this.getAABB();
    for (const col of colliders) {
      if (this._aabbIntersect(aabb, col)) {
        // Push out along this axis
        const overlapX = Math.min(aabb.maxX - col.minX, col.maxX - aabb.minX);
        const overlapY = Math.min(aabb.maxY - col.minY, col.maxY - aabb.minY);
        const overlapZ = Math.min(aabb.maxZ - col.minZ, col.maxZ - aabb.minZ);

        // Choose smallest overlap axis to resolve
        const minOverlap = Math.min(overlapX, overlapY, overlapZ);
        if (minOverlap === overlapX) {
          const midCol = (col.minX + col.maxX) / 2;
          const midPlayer = (aabb.minX + aabb.maxX) / 2;
          this.position.x = midPlayer < midCol
            ? col.minX - 0.31
            : col.maxX + 0.31;
          this.velocity.x = 0;
        } else if (minOverlap === overlapY) {
          const midCol = (col.minY + col.maxY) / 2;
          const midPlayer = (aabb.minY + aabb.maxY) / 2;
          if (midPlayer < midCol) {
            this.position.y = col.minY - 0.41;
            if (this.velocity.y > 0) this.velocity.y = 0;
          } else {
            this.position.y = col.maxY + 0.41;
            if (this.velocity.y < 0) {
              this.velocity.y = 0;
              this.grounded = true;
            }
          }
        } else {
          const midCol = (col.minZ + col.maxZ) / 2;
          const midPlayer = (aabb.minZ + aabb.maxZ) / 2;
          this.position.z = midPlayer < midCol
            ? col.minZ - 0.31
            : col.maxZ + 0.31;
          this.velocity.z = 0;
        }
      }
    }
  }

  _aabbIntersect(a, b) {
    return (
      a.maxX > b.minX && a.minX < b.maxX &&
      a.maxY > b.minY && a.minY < b.maxY &&
      a.maxZ > b.minZ && a.minZ < b.maxZ
    );
  }

  _getCameraYaw() {
    if (this.scene && this.scene.camera) {
      return this.scene.camera.rotation.y;
    }
    return 0;
  }

  _animateLimbs(dt) {
    const moving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1;
    const t = performance.now() * 0.01;
    const swing = moving ? Math.sin(t) * 0.6 : 0;

    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  addMoney(amount) {
    this.money += amount;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export function createPlayer(scene) {
  return new Player(scene);
}
