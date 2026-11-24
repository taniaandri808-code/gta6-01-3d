import * as THREE from 'three';

export const worldColliders = [];

function canvasTexture(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas);
  return new THREE.CanvasTexture(canvas);
}

function gradientSkyTexture() {
  return canvasTexture(256, (ctx, canvas) => {
    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0, '#ffdca8'); // horizon glow
    grad.addColorStop(0.35, '#ff9e4d'); // warm sunset band
    grad.addColorStop(0.65, '#7fb2e5'); // dusk blue
    grad.addColorStop(1, '#2b3a67'); // upper sky
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
}

function roadTexture() {
  return canvasTexture(1024, (ctx, canvas) => {
    ctx.fillStyle = '#2a2a2a'; // dark asphalt
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
    ctx.strokeStyle = '#e8c34a'; // yellow lane dashes
    ctx.lineWidth = 8;
    ctx.setLineDash([48, 40]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([48, 40]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  });
}

function createSun() {
  const sun = new THREE.DirectionalLight(0xffb066, 1.6);
  sun.position.set(-60, 35, -120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -200;
  sun.shadow.camera.right = 200;
  sun.shadow.camera.top = 200;
  sun.shadow.camera.bottom = -200;
  sun.shadow.camera.far = 600;
  return sun;
}

function createHemisphere() {
  return new THREE.HemisphereLight(0xffc499, 0x4a3a2a, 0.55);
}

function createSky() {
  const geometry = new THREE.SphereGeometry(1500, 32, 20);
  const material = new THREE.MeshBasicMaterial({
    map: gradientSkyTexture(),
    side: THREE.BackSide,
    fog: false,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'sky';
  return sky;
}

function createOcean() {
  const geometry = new THREE.PlaneGeometry(3000, 700, 120, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1d6f8f,
    roughness: 0.25,
    metalness: 0.35,
  });
  const ocean = new THREE.Mesh(geometry, material);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.1, -900); // south edge
  ocean.name = 'ocean';
  ocean.userData.basePositions = Float32Array.from(
    geometry.attributes.position.array,
  );
  ocean.userData.phase = Math.random() * Math.PI * 2;
  return ocean;
}

function createBeach() {
  const geometry = new THREE.PlaneGeometry(3000, 140);
  const material = new THREE.MeshStandardMaterial({ color: 0xdbc38a, roughness: 1 });
  const beach = new THREE.Mesh(geometry, material);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.05, -500);
  beach.receiveShadow = true;
  beach.name = 'beach';
  return beach;
}

function createGround() {
  const texture = roadTexture();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 5);
  const geometry = new THREE.PlaneGeometry(3000, 1300);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 200);
  ground.receiveShadow = true;
  ground.name = 'ground';
  return ground;
}

function createParks() {
  const parkMaterial = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 1 });
  const group = new THREE.Group();
  group.name = 'parks';
  const rects = [
    [-700, 150, 320, 260],
    [500, 400, 280, 220],
    [150, -200, 240, 200],
  ];
  for (const [x, z, w, d] of rects) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), parkMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(x, 0.02, z);
    patch.receiveShadow = true;
    group.add(patch);
    worldColliders.push(patch);
  }
  return group;
}

export function createWorld(scene) {
  scene.fog = new THREE.Fog(0xf5b97f, 300, 1800);
  scene.add(createSun());
  scene.add(createHemisphere());
  scene.add(createSky());
  const ocean = createOcean();
  scene.add(ocean);
  scene.add(createBeach());
  scene.add(createGround());
  scene.add(createParks());
  scene.userData.ocean = ocean;
  return scene;
}

export function updateWorld(scene, elapsedTime) {
  const ocean = scene.userData.ocean;
  if (!ocean) return;
  const pos = ocean.geometry.attributes.position;
  const base = ocean.userData.basePositions;
  for (let i = 0; i < pos.count; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    pos.array[i * 3 + 2] =
      Math.sin(bx * 0.02 + elapsedTime * 1.2 + ocean.userData.phase) * 1.6 +
      Math.cos(by * 0.03 + elapsedTime * 0.9) * 1.1;
  }
  pos.needsUpdate = true;
  ocean.geometry.computeVertexNormals();
}
