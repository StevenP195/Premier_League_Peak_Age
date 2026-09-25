import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makePitchTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 660;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#2e9e5b";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#34aa63";
  for (let i = 0; i < 10; i++) {
    ctx.fillRect((i * c.width) / 10, 0, c.width / 20, c.height);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
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
  ctx.fillStyle = "rgba(255,255,255,0.9)";
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

function makeCrowdTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 176;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#a3111f";
  ctx.fillRect(0, 0, c.width, c.height);

  const seatPalette = ["#c8102e", "#a3111f", "#8a0e1a", "#d81e35"];
  const crowdPalette = ["#c8102e", "#a3111f", "#8a0e1a", "#f2f2f2", "#1b1b1b", "#d8d8d8"];

  function paintTier(y0, y1, packed) {
    const rows = 12;
    const rowH = (y1 - y0) / rows;
    const palette = packed ? crowdPalette : seatPalette;
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * rowH;
      for (let x = 0; x < c.width; x += 3) {
        if (Math.random() < 0.9) {
          ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
          const jitter = Math.random() * 1.4;
          ctx.fillRect(x + jitter, y + Math.random() * (rowH - 2), 2.1, rowH * 0.6);
        }
      }
    }
  }

  paintTier(4, c.height * 0.52, true);
  paintTier(c.height * 0.6, c.height - 6, true);

  ctx.fillStyle = "#cfd2d8";
  ctx.fillRect(0, c.height * 0.52, c.width, c.height * 0.08);
  ctx.fillStyle = "#9aa0aa";
  ctx.fillRect(0, c.height * 0.52, c.width, 2);
  ctx.fillRect(0, c.height * 0.6 - 2, c.width, 2);

  return new THREE.CanvasTexture(c);
}

function buildStandSegment(width, depth, height, crowdTexture) {
  const group = new THREE.Group();
  const texture = crowdTexture.clone();
  texture.needsUpdate = true;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(Math.max(1, width / 9), 1);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 })
  );
  body.position.y = height / 2;
  body.rotation.x = -0.12;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.02, 0.5, depth * 0.62),
    new THREE.MeshStandardMaterial({ color: 0xe9ecf2, roughness: 0.4, metalness: 0.2 })
  );
  roof.position.set(0, height + 3.2, -depth * 0.32);
  roof.rotation.x = -0.28;
  group.add(roof);

  const trussMat = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.35, metalness: 0.3 });
  const strutCount = Math.max(2, Math.round(width / 12));
  for (let i = 0; i < strutCount; i++) {
    const sx = -width / 2 + (width / (strutCount - 1 || 1)) * i;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.2, 6), trussMat);
    strut.position.set(sx, height + 1.6, -depth * 0.05);
    strut.rotation.x = 0.95;
    group.add(strut);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.4, 6), trussMat);
    brace.position.set(sx, height + 1.2, depth * 0.12);
    brace.rotation.x = 0.35;
    group.add(brace);
  }

  return group;
}

function buildFloodlight() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.55, 34, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3 })
  );
  pole.position.y = 17;
  group.add(pole);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xfff3d0,
    emissiveIntensity: 1.4,
  });
  for (let i = -1; i <= 1; i++) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.9), headMat);
    head.position.set(i * 1.9, 34, 0);
    group.add(head);
  }
  const light = new THREE.PointLight(0xfff3d0, 120, 130, 2);
  light.position.y = 34;
  group.add(light);
  return group;
}

function buildWembleyArch() {
  const group = new THREE.Group();
  const archMat = new THREE.MeshStandardMaterial({ color: 0xfbfbfd, roughness: 0.25, metalness: 0.35 });

  const leg1 = new THREE.Vector3(-46, 6, -84);
  const apex = new THREE.Vector3(0, 86, -98);
  const leg2 = new THREE.Vector3(46, 6, -80);
  const mid1 = new THREE.Vector3(-34, 56, -102);
  const mid2 = new THREE.Vector3(34, 62, -94);

  const curve = new THREE.CatmullRomCurve3([leg1, mid1, apex, mid2, leg2]);
  const archMesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, 2.6, 10, false),
    archMat
  );
  group.add(archMesh);

  const cableMat = new THREE.MeshStandardMaterial({ color: 0xd7dae2, roughness: 0.5, metalness: 0.4 });
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    const p = curve.getPoint(t);
    const base = new THREE.Vector3(p.x * 0.65, 27, -76);
    const dir = new THREE.Vector3().subVectors(p, base);
    const len = dir.length();
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, len, 6), cableMat);
    cable.position.copy(p).add(base).multiplyScalar(0.5);
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(cable);
  }

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
  scene.fog = new THREE.FogExp2(0xbcd4e8, 0.0032);

  const camera = new THREE.PerspectiveCamera(55, heroEl.clientWidth / heroEl.clientHeight, 0.1, 600);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);

  scene.add(new THREE.AmbientLight(0xfff2d8, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0cf, 1.05);
  sun.position.set(60, 90, 40);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe3ff, 0.35);
  fill.position.set(-50, 40, -60);
  scene.add(fill);

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(105, 68),
    new THREE.MeshStandardMaterial({ map: makePitchTexture(), roughness: 0.9 })
  );
  pitch.rotation.x = -Math.PI / 2;
  scene.add(pitch);

  const crowdTexture = makeCrowdTexture();
  const RING_RADIUS = 82;
  const SEGMENTS = 26;
  const segWidth = (2 * Math.PI * RING_RADIUS) / SEGMENTS + 1.2;

  for (let i = 0; i < SEGMENTS; i++) {
    const angle = (i / SEGMENTS) * Math.PI * 2;
    const seg = buildStandSegment(segWidth, 16, 24, crowdTexture);
    seg.position.set(Math.sin(angle) * RING_RADIUS, 0, Math.cos(angle) * RING_RADIUS);
    seg.rotation.y = angle;
    scene.add(seg);
  }

  const cornerAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  cornerAngles.forEach((angle) => {
    const fl = buildFloodlight();
    fl.position.set(Math.sin(angle) * (RING_RADIUS + 6), 0, Math.cos(angle) * (RING_RADIUS + 6));
    scene.add(fl);
  });

  scene.add(buildWembleyArch());

  const startPos = new THREE.Vector3(0, 95, 155);
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

      if (overlayEl) overlayEl.style.opacity = Math.max(0, 1 - progress * 2.4);
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
