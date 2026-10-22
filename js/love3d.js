/* ============================================================
   Love Meter — interactive 3D heart (Three.js)
   A draggable, zoomable heart that reacts to the love meter.
   ============================================================ */

(function () {
  "use strict";

  const container = document.getElementById("love3d");
  const canvas = document.getElementById("love3dCanvas");
  if (!container || !canvas) return;

  const THREE = window.THREE;
  if (!THREE) {
    container.classList.add("love3d--off");
    return;
  }

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  let ready = false;
  let failed = false;
  let contextLost = false;
  let renderer;
  let scene;
  let camera;
  let clock;
  let heart;
  let heartGroup;
  let orbitGroup;
  let sparkles;
  let material;
  let roseLight;
  let lavLight;
  const orbiters = [];

  let rafId = null;
  let pendingFrame = false;
  let lastFrameAt = 0;
  let active = false;
  let dragging = false;
  let progress = 0;
  let celebrating = 0;
  let rotationX = 0;
  let rotationY = 0;
  let targetX = 0;
  let targetY = 0;
  let zoom = 5.4;
  let targetZoom = 5.4;

  const pointers = new Map();
  let pinchDistance = 0;

  /* ---------- textures ---------- */

  function makeEnvTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, "#fffaf3");
    grad.addColorStop(0.32, "#f9dcdb");
    grad.addColorStop(0.58, "#ecc2d2");
    grad.addColorStop(0.8, "#c793ab");
    grad.addColorStop(1, "#7c4a63");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(16, 46, 12, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,242,222,0.7)";
    ctx.beginPath();
    ctx.ellipse(46, 150, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(c);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    if ("encoding" in texture) texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function makeSpriteTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,226,200,0.85)");
    grad.addColorStop(1, "rgba(255,200,190,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function makeShadowTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(84,35,49,0.42)");
    grad.addColorStop(0.55, "rgba(84,35,49,0.16)");
    grad.addColorStop(1, "rgba(84,35,49,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(64, 64, 62, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }

  /* ---------- geometry ---------- */

  function makeHeartGeometry() {
    const shape = new THREE.Shape();
    const scale = 0.062;
    const px = (t) => 16 * Math.pow(Math.sin(t), 3) * scale;
    const py = (t) =>
      (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;

    shape.moveTo(px(0), py(0));
    for (let t = 0; t <= Math.PI * 2 + 0.001; t += Math.PI / 48) {
      shape.lineTo(px(t), py(t));
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.28,
      bevelSize: 0.24,
      bevelSegments: mobile ? 5 : 8,
      curveSegments: 12,
      steps: 1
    });
    geometry.center();
    return geometry;
  }

  /* ---------- build ---------- */

  function build() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.32, zoom);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: mobile ? "low-power" : "default"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = makeEnvTexture();
    scene.environment = pmrem.fromEquirectangular(envTexture).texture;
    envTexture.dispose();
    pmrem.dispose();

    heartGroup = new THREE.Group();
    scene.add(heartGroup);

    const heartGeometry = makeHeartGeometry();

    material = new THREE.MeshPhysicalMaterial({
      color: 0xd85f78,
      roughness: 0.24,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      reflectivity: 0.6,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xffdbe4),
      emissive: new THREE.Color(0x5a0f26),
      emissiveIntensity: 0.16
    });

    heart = new THREE.Mesh(heartGeometry, material);
    heartGroup.add(heart);

    orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = 0.25;
    scene.add(orbitGroup);

    const orbiterMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe89aa8,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: new THREE.Color(0x56122a),
      emissiveIntensity: 0.12
    });

    const orbiterCount = mobile ? 3 : 6;
    for (let i = 0; i < orbiterCount; i += 1) {
      const mesh = new THREE.Mesh(heartGeometry, orbiterMaterial);
      const angle = (i / orbiterCount) * Math.PI * 2;
      const radius = 1.75 + (i % 2) * 0.22;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 0.5,
        Math.sin(angle) * radius
      );
      mesh.scale.setScalar(0.14 + Math.random() * 0.07);
      mesh.rotation.y = -angle;
      orbitGroup.add(mesh);
      orbiters.push(mesh);
    }

    const sparkleCount = mobile ? 40 : 70;
    const positions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i += 1) {
      const r = 1.9 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.8;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const sparkleMaterial = new THREE.PointsMaterial({
      size: 0.13,
      map: makeSpriteTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(0xffe2b8),
      opacity: 0.9
    });
    sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    scene.add(sparkles);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: makeShadowTexture(),
      transparent: true,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.5;
    scene.add(shadow);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(2.6, 4.2, 3.4);
    scene.add(keyLight);
    roseLight = new THREE.PointLight(0xff7d9c, 1.5, 22);
    roseLight.position.set(-3, 1.4, 3);
    scene.add(roseLight);
    lavLight = new THREE.PointLight(0xb495e0, 1.15, 22);
    lavLight.position.set(3, -0.6, 2.4);
    scene.add(lavLight);

    if (typeof ResizeObserver === "function") new ResizeObserver(resize).observe(container);
    else window.addEventListener("resize", resize, { passive: true });
    resize();
    ready = true;
  }

  function resize() {
    if (!ready && !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (reducedQuery.matches) requestRender();
  }

  /* ---------- render loop ---------- */

  function requestRender() {
    if (!ready || !active || contextLost || document.hidden || pendingFrame || rafId !== null) return;
    pendingFrame = true;
    requestAnimationFrame(() => {
      pendingFrame = false;
      if (!active || contextLost || document.hidden || failed) return;
      tick(0.016);
      renderer.render(scene, camera);
    });
  }

  function start() {
    if (!ready || rafId !== null) return;
    clock.getDelta();
    lastFrameAt = 0;
    rafId = requestAnimationFrame(loop);
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (mobile && now - lastFrameAt < 1000 / 30) return;
    lastFrameAt = now;
    tick(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function tick(dt) {
    const rm = reducedQuery.matches;
    const time = clock.elapsedTime;

    if (!rm && !dragging) targetY += dt * 0.35;

    rotationX += (targetX - rotationX) * 0.12;
    rotationY += (targetY - rotationY) * 0.12;
    heartGroup.rotation.x = rotationX;
    heartGroup.rotation.y = rotationY;

    let pulse = 1;
    if (!rm) {
      const rate = 0.75 + (progress / 100) * 1.5;
      const beat = (Math.sin(time * Math.PI * 2 * rate) + 1) / 2;
      const punch = Math.pow(beat, 5);
      const amplitude = 0.045 + (progress / 100) * 0.05 + (celebrating > 0 ? 0.09 : 0);
      pulse = 1 + punch * amplitude;
      if (celebrating > 0) {
        pulse += Math.sin(time * 26) * 0.02 * Math.min(celebrating, 1);
      }
      orbitGroup.rotation.y += dt * 0.55;
      sparkles.rotation.y += dt * 0.12;
      for (let i = 0; i < orbiters.length; i += 1) {
        orbiters[i].rotation.z += dt * 0.9;
      }
      roseLight.position.x = Math.cos(time * 0.55) * 3.1;
      roseLight.position.z = Math.sin(time * 0.55) * 3.1;
      lavLight.position.x = Math.cos(time * 0.55 + Math.PI) * 2.9;
      lavLight.position.z = Math.sin(time * 0.55 + Math.PI) * 2.9;
    }
    heart.scale.setScalar(pulse);

    material.emissiveIntensity =
      0.14 + (progress / 100) * 0.26 + (celebrating > 0 ? 0.45 * Math.min(celebrating, 1) : 0);

    zoom += (targetZoom - zoom) * 0.1;
    camera.position.z = zoom;
    camera.position.y = 0.32;
    camera.lookAt(0, 0, 0);

    if (celebrating > 0) celebrating = Math.max(0, celebrating - dt);
  }

  /* ---------- interaction ---------- */

  function onPointerDown(event) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragging = true;
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const pts = Array.from(pointers.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDistance) {
        targetZoom = clamp(targetZoom - (distance - pinchDistance) * 0.01, 3.4, 7.6);
      }
      pinchDistance = distance;
    } else {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      targetY += dx * 0.006;
      targetX = clamp(targetX + dy * 0.006, -0.7, 0.7);
    }
    if (reducedQuery.matches) requestRender();
  }

  function onPointerUp(event) {
    pointers.delete(event.pointerId);
    if (pointers.size === 0) dragging = false;
    if (pointers.size < 2) pinchDistance = 0;
  }

  function onWheel(event) {
    event.preventDefault();
    targetZoom = clamp(targetZoom + event.deltaY * 0.0016, 3.4, 7.6);
    if (reducedQuery.matches) requestRender();
  }

  function bindEvents() {
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      container.classList.add("love3d--off");
    });
    canvas.addEventListener("webglcontextrestored", () => {
      contextLost = false;
      container.classList.remove("love3d--off");
      resume();
    });
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else resume();
    });

    const onMotionChange = () => resume();
    if (reducedQuery.addEventListener) reducedQuery.addEventListener("change", onMotionChange);
    else if (reducedQuery.addListener) reducedQuery.addListener(onMotionChange);
  }

  /* ---------- public API ---------- */

  function resume() {
    if (!ready || !active || contextLost || document.hidden) return;
    if (reducedQuery.matches) {
      stop();
      requestRender();
    }
    else start();
  }

  function setActive(value) {
    active = Boolean(value);
    if (active && !ready && !failed) init();
    if (!ready || contextLost) return;
    if (active) {
      resize();
      resume();
    }
    else stop();
  }

  function setProgress(value) {
    progress = clamp(Number(value) || 0, 0, 100);
    if (ready && reducedQuery.matches) requestRender();
  }

  function celebrate() {
    if (!ready) return;
    if (reducedQuery.matches) {
      progress = 100;
      requestRender();
      return;
    }
    celebrating = 2.4;
  }

  function reset() {
    progress = 0;
    celebrating = 0;
    targetX = 0;
    targetY = 0;
    if (ready && reducedQuery.matches) requestRender();
  }

  function init() {
    try {
      build();
      bindEvents();
      const bar = document.getElementById("loveBar");
      if (bar) progress = clamp(Number(bar.value) || 0, 0, 100);
      const loveScreen = document.getElementById("screen-love");
      if (loveScreen && !loveScreen.hidden) setActive(true);
      else requestRender();
    } catch (error) {
      failed = true;
      stop();
      if (renderer) renderer.dispose();
      ready = false;
      container.classList.add("love3d--off");
    }
  }

  window.Love3D = {
    setActive,
    setProgress,
    celebrate,
    reset
  };

  // Allocate WebGL textures and geometry only when this chapter is visited.
  const loveScreen = document.getElementById("screen-love");
  if (loveScreen && !loveScreen.hidden) setActive(true);
})();
