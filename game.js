'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const scoreEl = $('score');
  const timerEl = $('timer');
  const overlay = $('overlay');
  const startBtn = $('start');
  const arenaSize = 32;
  const half = arenaSize / 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07101d);
  scene.fog = new THREE.FogExp2(0x07101d, 0.027);
  const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 140);
  camera.position.set(0, 20, 24);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x9beaff, 0x101324, 1.12));
  const keyLight = new THREE.DirectionalLight(0xe4faff, 2.1);
  keyLight.position.set(-7, 18, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -22;
  keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 22;
  keyLight.shadow.camera.bottom = -22;
  scene.add(keyLight);
  const cyanLight = new THREE.PointLight(0x2df6ec, 24, 24, 2);
  cyanLight.position.set(-12, 4, -10);
  scene.add(cyanLight);
  const pinkLight = new THREE.PointLight(0x915cff, 18, 22, 2);
  pinkLight.position.set(12, 5, 10);
  scene.add(pinkLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaSize, arenaSize),
    new THREE.MeshStandardMaterial({ color: 0x101d30, metalness: 0.28, roughness: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(arenaSize, 32, 0x25c9d0, 0x234052);
  grid.position.y = 0.018;
  grid.material.transparent = true;
  grid.material.opacity = 0.24;
  scene.add(grid);
  const boundary = new THREE.Mesh(
    new THREE.RingGeometry(15.6, 16, 128),
    new THREE.MeshBasicMaterial({ color: 0x47e9e3, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  boundary.rotation.x = -Math.PI / 2;
  boundary.position.y = 0.04;
  scene.add(boundary);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x162c42, metalness: 0.55, roughness: 0.34 });
  for (let i = 0; i < 4; i++) {
    const horizontal = i % 2 === 0;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? arenaSize : 0.42, 1.35, horizontal ? 0.42 : arenaSize), wallMat
    );
    wall.position.set(i === 0 || i === 2 ? 0 : (i === 1 ? half : -half), 0.65,
      i === 0 ? -half : (i === 2 ? half : 0));
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x28445b, emissive: 0x0b646b, emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.3
  });
  for (const x of [-14.8, 14.8]) for (const z of [-14.8, 14.8]) {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 2.2, 6), pylonMat);
    pylon.position.set(x, 1.1, z);
    pylon.castShadow = true;
    scene.add(pylon);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ color: 0x68fff4 }));
    orb.position.set(x, 2.3, z);
    scene.add(orb);
  }

  const motePositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i++) {
    motePositions[i * 3] = (Math.random() - 0.5) * 68;
    motePositions[i * 3 + 1] = Math.random() * 17 + 1;
    motePositions[i * 3 + 2] = (Math.random() - 0.5) * 68;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  scene.add(new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0x79dce6, size: 0.065, transparent: true, opacity: 0.62 })));

  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.64, 24, 18), new THREE.MeshStandardMaterial({
    color: 0x52eee7, metalness: 0.32, roughness: 0.2, emissive: 0x087d82, emissiveIntensity: 0.7
  }));
  body.scale.set(1, 1.12, 1);
  body.castShadow = true;
  player.add(body);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), new THREE.MeshStandardMaterial({
    color: 0xefffff, metalness: 0.45, roughness: 0.12, emissive: 0x5bf4ed, emissiveIntensity: 0.6
  }));
  visor.rotation.x = -Math.PI / 2;
  visor.position.y = 0.33;
  player.add(visor);
  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.035, 8, 36), new THREE.MeshBasicMaterial({ color: 0x5bf4ed, transparent: true, opacity: 0.85 }));
  aura.rotation.x = Math.PI / 2;
  player.add(aura);
  player.position.set(0, 0.72, 0);
  scene.add(player);
  const shadowRing = new THREE.Mesh(new THREE.CircleGeometry(0.82, 32), new THREE.MeshBasicMaterial({ color: 0x32d4db, transparent: true, opacity: 0.15, depthWrite: false }));
  shadowRing.rotation.x = -Math.PI / 2;
  shadowRing.position.y = 0.035;
  player.add(shadowRing);

  const hazards = [];
  const shards = [];
  const shardGeometry = new THREE.OctahedronGeometry(0.48, 0);
  const shardMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf6a, metalness: 0.45, roughness: 0.2, emissive: 0x9d5a12, emissiveIntensity: 0.8 });
  const shardGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xffcf6a, transparent: true, opacity: 0.13, side: THREE.DoubleSide });
  const hazardGeometry = new THREE.IcosahedronGeometry(0.83, 1);
  const hazardMaterial = new THREE.MeshStandardMaterial({ color: 0xff506f, metalness: 0.3, roughness: 0.26, emissive: 0x8e122f, emissiveIntensity: 1.2 });

  function randomXZ(margin = 2) {
    return { x: (Math.random() * 2 - 1) * (half - margin), z: (Math.random() * 2 - 1) * (half - margin) };
  }
  function placeObject(object, safe = 0) {
    let point;
    let tries = 0;
    do {
      point = randomXZ();
      tries++;
    } while (tries < 100 && (Math.hypot(point.x - player.position.x, point.z - player.position.z) < safe ||
      hazards.some((hazard) => Math.hypot(point.x - hazard.group.position.x, point.z - hazard.group.position.z) < 1.9)));
    object.position.x = point.x;
    object.position.z = point.z;
  }
  function spawnShard() {
    const group = new THREE.Group();
    const gem = new THREE.Mesh(shardGeometry, shardMaterial);
    gem.castShadow = true;
    group.add(gem);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.018, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd879, transparent: true, opacity: 0.75 }));
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), shardGlowMaterial);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.32;
    group.add(glow);
    group.position.y = 0.92;
    scene.add(group);
    placeObject(group, 2.2);
    shards.push(group);
  }
  const hazardGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xff456e, transparent: true, opacity: 0.12, side: THREE.BackSide });
  function spawnHazard(safe = 5, speed = null) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(hazardGeometry, hazardMaterial);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.035, 7, 32), new THREE.MeshBasicMaterial({ color: 0xff7691, transparent: true, opacity: 0.72 }));
    ring.rotation.x = Math.PI / 2;
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), hazardGlowMaterial);
    group.add(core, ring, halo);
    group.position.y = 0.85;
    scene.add(group);
    placeObject(group, safe);
    hazards.push({
      group, ring, phase: Math.random() * Math.PI * 2,
      speed: speed || 0.65 + Math.random() * 0.38,
      amp: 2 + Math.random() * 2.2,
      turn: Math.random() < 0.5 ? 1 : -1,
      center: { x: group.position.x, z: group.position.z }
    });
  }
  for (let i = 0; i < 3; i++) spawnShard();
  for (let i = 0; i < 5; i++) spawnHazard();

  const keys = Object.create(null);
  let score = 0;
  let lives = 3;
  let elapsed = 0;
  let running = false;
  let paused = false;
  let dashCooldown = 0;
  let dashTime = 0;
  let invulnerable = 0;
  let moveX = 0;
  let moveZ = 0;
  let last = performance.now();
  let toastTimeout;

  function toast(message) {
    const element = $('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.classList.remove('show'), 850);
  }
  function updateScore() { scoreEl.textContent = String(score).padStart(3, '0'); }
  function updateLives() {
    $('lives').textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '♥' : '♡').join(' ');
  }
  function showOverlay(type) {
    overlay.classList.remove('hidden');
    if (type === 'pause') {
      $('eyebrow').textContent = 'CATCH YOUR BREATH';
      $('title').innerHTML = 'RUN<br><span>PAUSED</span>';
      $('message').textContent = 'Your run is on hold. The sentinels will wait.';
      $('result').hidden = true;
      startBtn.textContent = 'RESUME RUN';
      $('note').textContent = 'PRESS ESC OR TAP RESUME TO CONTINUE';
    } else {
      const victory = elapsed >= 60;
      $('eyebrow').textContent = victory ? 'SURVIVAL COMPLETE' : 'RUN ENDED';
      $('title').innerHTML = victory ? 'YOU<br><span>MADE IT</span>' : 'GAME<br><span>OVER</span>';
      $('message').textContent = victory ? 'The arena is yours. One minute survived.' : 'The sentinels got you. The arena awaits another run.';
      $('result').hidden = false;
      $('result').textContent = `SHARDS  ${String(score).padStart(3, '0')}`;
      startBtn.textContent = 'PLAY AGAIN';
      $('note').textContent = '';
    }
  }
  function begin() {
    score = 0;
    lives = 3;
    elapsed = 0;
    running = true;
    paused = false;
    dashCooldown = 0;
    dashTime = 0;
    invulnerable = 0;
    player.position.set(0, 0.72, 0);
    player.visible = true;
    for (const hazard of hazards) {
      placeObject(hazard.group, 4);
      hazard.center.x = hazard.group.position.x;
      hazard.center.z = hazard.group.position.z;
    }
    for (const shard of shards) placeObject(shard, 2);
    updateScore();
    updateLives();
    timerEl.textContent = '60';
    overlay.classList.add('hidden');
    last = performance.now();
  }
  startBtn.addEventListener('click', () => {
    if (paused) {
      paused = false;
      running = true;
      overlay.classList.add('hidden');
      last = performance.now();
    } else begin();
  });
  $('pause').addEventListener('click', () => {
    if (!running) return;
    running = false;
    paused = true;
    showOverlay('pause');
  });
  function dash() {
    if (!running || dashCooldown > 0) return;
    dashTime = 0.2;
    dashCooldown = 1.2;
    invulnerable = Math.max(invulnerable, 0.3);
    toast('DASH!');
  }
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) event.preventDefault();
    keys[key] = true;
    if (key === ' ' && !event.repeat) dash();
    if (key === 'escape' && running) {
      running = false;
      paused = true;
      showOverlay('pause');
    }
  });
  window.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => {
    for (const key in keys) keys[key] = false;
    if (running) {
      running = false;
      paused = true;
      showOverlay('pause');
    }
  });
  $('dash').addEventListener('pointerdown', (event) => { event.preventDefault(); dash(); });

  const pad = $('touchPad');
  const stick = $('stick');
  let activePointer = null;
  pad.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    activePointer = event.pointerId;
    pad.setPointerCapture(activePointer);
    updateStick(event);
  });
  function updateStick(event) {
    if (event.pointerId !== activePointer) return;
    const rect = pad.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = 38;
    const length = Math.hypot(dx, dy);
    const scale = length > max ? max / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    stick.style.transform = `translate(${x}px, ${y}px)`;
    moveX = x / max;
    moveZ = y / max;
  }
  pad.addEventListener('pointermove', updateStick);
  function releaseStick(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    moveX = 0;
    moveZ = 0;
    stick.style.transform = '';
  }
  pad.addEventListener('pointerup', releaseStick);
  pad.addEventListener('pointercancel', releaseStick);

  function collect(shard) {
    score += 10;
    updateScore();
    placeObject(shard, 2);
    toast('+10 SHARDS');
  }
  function hitHazard(hazard) {
    if (invulnerable > 0) return;
    lives--;
    updateLives();
    invulnerable = 1.15;
    const dx = player.position.x - hazard.group.position.x;
    const dz = player.position.z - hazard.group.position.z;
    const distance = Math.max(0.1, Math.hypot(dx, dz));
    player.position.x = THREE.MathUtils.clamp(player.position.x + dx / distance * 1.25, -half + 1, half - 1);
    player.position.z = THREE.MathUtils.clamp(player.position.z + dz / distance * 1.25, -half + 1, half - 1);
    if (lives <= 0) {
      running = false;
      showOverlay('over');
    } else toast('HIT! KEEP MOVING');
  }

  function update(dt) {
    elapsed += dt;
    const timeLeft = Math.max(0, 60 - elapsed);
    timerEl.textContent = String(Math.ceil(timeLeft)).padStart(2, '0');
    dashCooldown = Math.max(0, dashCooldown - dt);
    dashTime = Math.max(0, dashTime - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    let x = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0) + moveX;
    let z = (keys.w || keys.arrowup ? -1 : 0) + (keys.s || keys.arrowdown ? 1 : 0) + moveZ;
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    const speed = (dashTime > 0 ? 14 : 7.1) * dt;
    player.position.x = THREE.MathUtils.clamp(player.position.x + x * speed, -half + 0.95, half - 0.95);
    player.position.z = THREE.MathUtils.clamp(player.position.z + z * speed, -half + 0.95, half - 0.95);
    if (magnitude > 0.05) {
      player.rotation.y = Math.atan2(x, z);
      player.rotation.z = -x * 0.12;
    }
    player.position.y = 0.72 + Math.sin(elapsed * 5) * 0.045;
    player.scale.setScalar(dashTime > 0 ? 1.13 : 1);
    player.visible = invulnerable <= 0 || Math.floor(elapsed * 15) % 2 === 0;

    for (const shard of shards) {
      shard.rotation.y += dt * 1.6;
      shard.rotation.x = Math.sin(elapsed * 1.5 + shard.position.x) * 0.12;
      shard.position.y = 0.92 + Math.sin(elapsed * 2.7 + shard.position.z) * 0.13;
      if (Math.hypot(player.position.x - shard.position.x, player.position.z - shard.position.z) < 1.17) collect(shard);
    }
    for (const hazard of hazards) {
      hazard.phase += dt * hazard.speed * hazard.turn;
      hazard.group.position.x = THREE.MathUtils.clamp(hazard.center.x + Math.sin(hazard.phase) * hazard.amp, -half + 2, half - 2);
      hazard.group.position.z = THREE.MathUtils.clamp(hazard.center.z + Math.cos(hazard.phase * 0.8) * hazard.amp, -half + 2, half - 2);
      hazard.group.rotation.y += dt * 0.7;
      hazard.ring.rotation.z += dt * 0.8;
      if (Math.hypot(player.position.x - hazard.group.position.x, player.position.z - hazard.group.position.z) < 1.45) hitHazard(hazard);
    }
    if (elapsed > 25 && hazards.length === 5) spawnHazard(6, 0.92);
    camera.position.lerp(new THREE.Vector3(player.position.x, 20, player.position.z + 22), 1 - Math.exp(-dt * 3.1));
    camera.lookAt(player.position.x, 0, player.position.z);
    cyanLight.position.x = -12 + Math.sin(elapsed * 0.3) * 3;
    pinkLight.position.z = 10 + Math.cos(elapsed * 0.25) * 3;
    if (timeLeft <= 0 && running) {
      running = false;
      showOverlay('over');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (running) update(dt);
    else for (const shard of shards) shard.rotation.y += dt * 0.4;
    renderer.render(scene, camera);
  }
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(innerWidth, innerHeight);
  });
  updateScore();
  updateLives();
  requestAnimationFrame(frame);
})();
