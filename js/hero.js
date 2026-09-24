import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

async function initHero() {
  const heroEl = document.getElementById("hero-3d");
  const overlayEl = document.querySelector(".hero-overlay");
  const canvas = document.getElementById("hero-canvas");
  if (!heroEl || !canvas) return;

  const res = await fetch("data/club_weights.json");
  const weights = await res.json();
  const clubs = Object.entries(weights);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, heroEl.clientWidth / heroEl.clientHeight, 0.1, 100);
  camera.position.z = 16;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);

  const loader = new THREE.TextureLoader();
  const sprites = [];

  clubs.forEach(([club, info], i) => {
    const texture = loader.load(`assets/crests/${info.slug}.png`);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    const baseSize = 1.15 * info.weight;
    sprite.scale.set(baseSize, baseSize, 1);

    const x = (Math.random() - 0.5) * 16;
    const yBand = 1.9 + Math.random() * 2.6;
    const y = Math.random() < 0.5 ? -yBand : yBand;
    const z = (Math.random() - 0.5) * 10;
    sprite.position.set(x, y, z);

    sprite.userData = {
      base: { x, y, z },
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.2,
      driftX: 0.3 + Math.random() * 0.4,
      driftY: 0.2 + Math.random() * 0.3,
      biasX: 4 + Math.random() * 4,
      biasY: 2 + Math.random() * 3,
      baseSize,
    };

    scene.add(sprite);
    sprites.push(sprite);
  });

  function getProgress() {
    const heroHeight = heroEl.offsetHeight || window.innerHeight;
    return Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const progress = getProgress();

    if (progress < 1.05) {
      const t = clock.getElapsedTime();

      camera.position.z = 16 - progress * 19;

      sprites.forEach((sprite) => {
        const d = sprite.userData;
        const bobX = Math.sin(t * d.speed + d.phase) * d.driftX;
        const bobY = Math.cos(t * d.speed * 0.8 + d.phase) * d.driftY;
        sprite.position.x = d.base.x + bobX + progress * d.biasX;
        sprite.position.y = d.base.y + bobY + progress * d.biasY;
        sprite.position.z = d.base.z;
        const scale = d.baseSize * (1 - progress * 0.82);
        sprite.scale.set(scale, scale, 1);
        sprite.material.opacity = 1 - progress * 0.9;
      });

      if (overlayEl) overlayEl.style.opacity = Math.max(0, 1 - progress * 1.4);
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
