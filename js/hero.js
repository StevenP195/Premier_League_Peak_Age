import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makePitchTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 660;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1c7a4a";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1e8250";
  for (let i = 0; i < 10; i++) {
    ctx.fillRect((i * c.width) / 10, 0, c.width / 20, c.height);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  const m = 30;
  ctx.strokeRect(m, m, c.width - m * 2, c.height - m * 2);
  ctx.beginPath();
  ctx.moveTo(c.width / 2, m);
  ctx.lineTo(c.width / 2, c.height - m);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.width / 2, c.height / 2, 70, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(c.width / 2, c.height / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  const boxW = 300;
  const boxH = 130;
  ctx.strokeRect(m, m, boxW, boxH);
  ctx.strokeRect(m, c.height - m - boxH, boxW, boxH);
  ctx.strokeRect(c.width - m - boxW, m, boxW, boxH);
  ctx.strokeRect(c.width - m - boxW, c.height - m - boxH, boxW, boxH);
  return new THREE.CanvasTexture(c);
}

function makeStandTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2a2038";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let row = 0; row < 16; row++) {
    ctx.fillStyle = row % 2 === 0 ? "#352a48" : "#241b32";
    ctx.fillRect(0, row * 8, c.width, 6);
  }
  return new THREE.CanvasTexture(c);
}

function buildStand(width, depth, height) {
  const group = new THREE.Group();
  const texture = makeStandTexture();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / 20, height / 12);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 })
  );
  body.position.y = height / 2;
  group.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.03, 0.6, depth * 0.5),
    new THREE.MeshStandardMaterial({ color: 0x120c1a, roughness: 0.6 })
  );
  roof.position.set(0, height + 0.3, -depth * 0.2);
  group.add(roof);
  return group;
}

function buildFloodlight() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 32, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
  );
  pole.position.y = 16;
  group.add(pole);
  const headGeo = new THREE.BoxGeometry(4, 2.4, 1.2);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    emissive: 0xfff3d0,
    emissiveIntensity: 1.6,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 32;
  group.add(head);
  const light = new THREE.PointLight(0xfff3d0, 180, 140, 2);
  light.position.y = 31;
  group.add(light);
  return group;
}

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

async function initHero() {
  const heroEl = document.getElementById("hero-3d");
  const overlayEl = document.querySelector(".hero-overlay");
  const canvas = document.getElementById("hero-canvas");
  if (!heroEl || !canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0714, 0.0068);

  const camera = new THREE.PerspectiveCamera(55, heroEl.clientWidth / heroEl.clientHeight, 0.1, 500);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);

  scene.add(new THREE.AmbientLight(0x8899cc, 0.55));
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.4);
  moon.position.set(-40, 60, -20);
  scene.add(moon);

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(105, 68),
    new THREE.MeshStandardMaterial({ map: makePitchTexture(), roughness: 0.95 })
  );
  pitch.rotation.x = -Math.PI / 2;
  scene.add(pitch);

  const standLong = buildStand(110, 8, 22);
  const standShort = buildStand(76, 8, 22);

  const northStand = standLong.clone();
  northStand.position.set(0, 0, -40);
  scene.add(northStand);

  const southStand = standLong.clone();
  southStand.position.set(0, 0, 40);
  southStand.rotation.y = Math.PI;
  scene.add(southStand);

  const eastStand = standShort.clone();
  eastStand.rotation.y = -Math.PI / 2;
  eastStand.position.set(60, 0, 0);
  scene.add(eastStand);

  const westStand = standShort.clone();
  westStand.rotation.y = Math.PI / 2;
  westStand.position.set(-60, 0, 0);
  scene.add(westStand);

  const cornerPositions = [
    [58, -38], [-58, -38], [58, 38], [-58, 38],
  ];
  cornerPositions.forEach(([x, z]) => {
    const fl = buildFloodlight();
    fl.position.set(x, 0, z);
    scene.add(fl);
  });

  const startPos = new THREE.Vector3(0, 78, 128);
  const endPos = new THREE.Vector3(0, 2.4, 26);
  const startLook = new THREE.Vector3(0, 0, 0);
  const endLook = new THREE.Vector3(0, 3, -20);

  function getProgress() {
    const heroHeight = heroEl.offsetHeight || window.innerHeight;
    return Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  }

  function animate() {
    requestAnimationFrame(animate);
    const progress = getProgress();

    if (progress < 1.05) {
      const t = easeInOut(progress);
      camera.position.lerpVectors(startPos, endPos, t);
      const look = new THREE.Vector3().lerpVectors(startLook, endLook, t);
      camera.lookAt(look);

      if (overlayEl) overlayEl.style.opacity = Math.max(0, 1 - progress * 3.2);
      heroEl.style.opacity = progress <= 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.4);

      renderer.render(scene, camera);
    }
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = heroEl.clientWidth / heroEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);
  });
}

initHero();
