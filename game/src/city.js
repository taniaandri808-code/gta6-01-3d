import * as THREE from 'three';
import { CFG } from './config.js';

// Procedural 12x12 grid city
const GRID = 12; // blocks per axis
const BLOCK = 220; // block size in world units
const ROAD = 24;   // road width
const SIDEWALK = 8; // sidewalk width

function rand(min, max) { return min + Math.random() * (max - min); }

// Major avenue every 4th block line
function isMajorBlock(x) { return (x + 1) % 4 === 0; }

// Road strips: every 4th grid line is a wide avenue
export function isOnRoad(x, z) {
  const bx = Math.floor(x / (BLOCK + ROAD));
  const bz = Math.floor(z / (BLOCK + ROAD));
  if (isMajorBlock(bx) || isMajorBlock(bz)) {
    return (
      (bx > 0 && Math.abs(x - (bx * (BLOCK + ROAD)) - ROAD / 2) < ROAD) ||
      (bz > 0 && Math.abs(z - (bz * (BLOCK + ROAD)) - ROAD / 2) < ROAD)
    );
  }
  return false;
}

function makeMaterial(color, emissive = null) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
    ...(emissive ? { emissive, emissiveIntensity: 0.6 } : {})
  });
}

// Create a canvas texture with lit windows for a building
function windowTexture(width, height, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  const prng = (() => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      if (prng() < 0.45) {
        const oy = prng() < 0.3 ? 1 : 0;
        ctx.fillStyle = '#ffdd88';
        ctx.fillRect(x + 1, y + 1 + oy, 2, 2);
      } else {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x + 1, y + 1, 2, 2);
      }
    }
  }
  return canvas;
}

function makeWindowTextureMaterial(canvas, aspect) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
}

// Add a building extruded box with windows
function addBuilding(group, x, z, w, d, h, seed) {
  const canvas = windowTexture(64, 64, seed);
  const mat = makeWindowTextureMaterial(canvas, w / d);
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2 - 110, h / 2, z + d / 2 - 110);
  mesh.geometry.computeBoundingBox();
  group.add(mesh);
}

// Extruded box for warehouses
function addWarehouse(group, x, z, w, d, h, seed) {
  const canvas = windowTexture(64, 64, seed);
  const winTex = new THREE.CanvasTexture(canvas);
  winTex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({
    map: winTex,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2 - 110, h / 2, z + d / 2 - 110);
  mesh.geometry.computeBoundingBox();
  group.add(mesh);
}

// Landmark tower with glowing windows and spire
function addTower(group, x, z, w, d, h, seed) {
  const canvas = windowTexture(128, 128, seed);
  const mat = makeWindowTextureMaterial(canvas, w / d);
  const spireGeo = new THREE.ConeGeometry(w / 2.5, 40, 8);
  const spireMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(x + w / 2 - 110, h + 20, z + d / 2 - 110);
  const shaftGeo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const shaft = new THREE.Mesh(shaftGeo, mat);
  shaft.position.set(x + w / 2 - 110, h / 2, z + d / 2 - 110);
  shaft.geometry.computeBoundingBox();
  const baseGeo = new THREE.BoxGeometry(w * 1.6, 18, d * 1.6, 1, 1, 1);
  const baseMat = makeMaterial(0x5b6770);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.set(x + w / 2 - 110, 9, z + d / 2 - 110);
  base.geometry.computeBoundingBox();
  group.add(shaft, spire, base);
}

// South-coast beach hotel: larger flat-roofed building with pool
function addHotel(group, x, z, w, d, seed) {
  const canvas = windowTexture(96, 96, seed);
  const mat = makeWindowTextureMaterial(canvas, w / d);
  const geo = new THREE.BoxGeometry(w, 50, d, 1, 1, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x + w / 2 - 110, 25, z + d / 2 - 110);
  mesh.geometry.computeBoundingBox();
  const poolGeo = new THREE.PlaneGeometry(w - 40, d - 40);
  const poolMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x + w / 2 - 110, 0.2, z + d / 2 - 110);
  const poolBB = new THREE.Box3().setFromObject(pool);
  group.add(mesh, pool);
}

// Build the city
export function buildCity(scene, colliders) {
  const city = new THREE.Group();
  const seedBase = 42;

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(GRID * (BLOCK + ROAD), GRID * (BLOCK + ROAD));
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  city.add(ground);

  for (let bx = 0; bx < GRID; bx++) {
    for (let bz = 0; bz < GRID; bz++) {
      const px = bx * (BLOCK + ROAD);
      const pz = bz * (BLOCK + ROAD);

      const isSouth = bz <= 1;
      const isNorth = bz >= GRID - 2;
      const isMajor = isMajorBlock(bx) || isMajorBlock(bz);

      // Roads and sidewalks between blocks
      if (bx < GRID - 1) {
        const roadGeo = new THREE.PlaneGeometry(ROAD, BLOCK + ROAD);
        const roadMat = makeMaterial(0x555566);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(px + BLOCK + ROAD / 2 - 110, 0, pz + (BLOCK + ROAD) / 2 - 110);
        city.add(road);
      }
      if (bz < GRID - 1) {
        const roadGeo = new THREE.PlaneGeometry(BLOCK + ROAD, ROAD);
        const roadMat = makeMaterial(0x555566);
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(px + (BLOCK + ROAD) / 2 - 110, 0, pz + BLOCK + ROAD / 2 - 110);
        city.add(road);
      }

      const seed = seedBase + bx * 7 + bz * 13;

      // Buildings per block: 1-4 extruded boxes 8-60 high
      if (isSouth) {
        // Beach hotels on south coast
        addHotel(city, px + 20, pz + 30, BLOCK - 40, 90, seed);
      } else if (isNorth) {
        // Industrial warehouses north
        addWarehouse(city, px + 30, pz + 40, BLOCK - 60, 100, 26, seed + 100);
        addWarehouse(city, px + 90, pz + 110, BLOCK - 120, 70, 34, seed + 200);
      } else if (isMajor && bx % 2 === 0 && bz % 2 === 0) {
        // Landmark towers on major intersections
        addTower(city, px + 40, pz + 40, BLOCK - 80, BLOCK - 80, rand(80, 160), seed + 300);
      } else {
        const nBuild = Math.floor(rand(1, 5));
        const cell = Math.ceil(Math.sqrt(nBuild));
        const bsize = (BLOCK - 50) / cell;
        for (let i = 0; i < nBuild; i++) {
          const wx = px + 30 + (i % cell) * (bsize + 10);
          const wz = pz + 30 + Math.floor(i / cell) * (bsize + 10);
          if (wx + bsize > px + BLOCK - 10) continue;
          const h = rand(8, 60);
          addBuilding(city, wx, wz, bsize, bsize, h, seed + i);
        }
      }
    }
  }

  // Push every building bounding box into colliders
  city.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      obj.geometry.computeBoundingBox();
      const bb = obj.geometry.boundingBox.clone();
      bb.applyMatrix4(obj.matrixWorld);
      colliders.push({ min: bb.min, max: bb.max });
    }
  });

  scene.add(city);
  return city;
}
