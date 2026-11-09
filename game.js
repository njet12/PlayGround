(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const hint = document.getElementById('hint');
  const TAU = Math.PI * 2;
  const keys = new Set();
  const held = { left: false, right: false, parry: false };
  let W = 1280, H = 720, dpr = 1, last = 0, clock = 0;
  let camera = 0, worldWidth = 3400, shake = 0, hitFlash = 0;
  let snow = [];
  let gameState = 'playing';
  let roundMessage = '';
  let roundTimer = 0;
  let player, enemy;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  function makeFighter(name, title, x, side) {
    return {
      name, title, x, y: 0, side, face: side, health: 100, maxHealth: 100,
      vx: 0, action: 'idle', actionTime: 0, cooldown: 0, stun: 0,
      parryTime: 0, dashTime: 0, invuln: 0, attackHit: false,
      walk: 0, flash: 0, blockHit: 0, alive: true
    };
  }

  function resetRound() {
    worldWidth = Math.max(2600, W * 2.7);
    const center = worldWidth * .5;
    const openingGap = clamp(W * .42, 150, 500);
    player = makeFighter('KENJIRO', 'THE CRIMSON BLADE', center - openingGap * .5, 1);
    enemy = makeFighter('KAGETORA', 'THE IRON WARLORD', center + openingGap * .5, -1);
    gameState = 'playing'; roundMessage = ''; roundTimer = 0;
    camera = clamp(center - W * .5, 0, worldWidth - W);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(320, r.width); H = Math.max(320, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    worldWidth = Math.max(2600, W * 2.7);
    if (!player) resetRound();
    if (!snow.length) {
      snow = Array.from({ length: Math.floor(clamp(W * H / 7000, 45, 130)) }, () => ({
        x: rand(0, W), y: rand(0, H), r: rand(.7, 2.3), speed: rand(18, 68), drift: rand(-20, 20), alpha: rand(.18, .72)
      }));
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function action(f, kind) {
    if (gameState !== 'playing' || !f.alive) return;
    if (kind === 'parry') {
      if (f.action === 'attack' || f.action === 'dash' || f.stun > 0) return;
      f.action = 'parry'; f.actionTime = .42; f.parryTime = .33; return;
    }
    if (kind === 'dash') {
      if (f.cooldown > 0 || f.stun > 0 || f.action === 'attack') return;
      f.action = 'dash'; f.actionTime = .27; f.dashTime = .27; f.invuln = .24;
      f.cooldown = .88; f.vx = f.face * 730; return;
    }
    if (kind === 'slash') {
      if (f.cooldown > 0 || f.stun > 0 || f.action === 'attack') return;
      f.action = 'attack'; f.actionTime = .42; f.attackHit = false; f.cooldown = .43; f.vx = 0;
    }
  }

  function setHeld(button, down) {
    const kind = button.dataset.action;
    button.classList.toggle('is-held', down);
    if (kind === 'left' || kind === 'right') held[kind] = down;
    else if (kind === 'parry') {
      held.parry = down;
      if (down) action(player, 'parry');
    } else if (down) action(player, kind);
    hint.classList.add('is-off');
  }
  document.querySelectorAll('.tbtn').forEach(button => {
    button.addEventListener('pointerdown', e => {
      e.preventDefault();
      // Synthetic pointer events used by tests (and some embedded webviews) do not
      // have an active pointer to capture. Capture real pointers when supported,
      // but never let capture failure prevent the control from activating.
      try { if (e.isTrusted) button.setPointerCapture?.(e.pointerId); } catch (_) {}
      setHeld(button, true);
    });
    const release = e => { e.preventDefault(); setHeld(button, false); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => setHeld(button, false));
  });

  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (['arrowleft','arrowright',' ','arrowup'].includes(key)) e.preventDefault();
    keys.add(key); hint.classList.add('is-off');
    if (key === 'j' || key === ' ') action(player, 'slash');
    if (key === 'k' || key === 'arrowup') action(player, 'parry');
    if (key === 'l' || key === 'shift') action(player, 'dash');
    if (key === 'r' && gameState !== 'playing') resetRound();
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); held.left = held.right = held.parry = false; });

  function getMove() {
    const left = held.left || keys.has('a') || keys.has('arrowleft');
    const right = held.right || keys.has('d') || keys.has('arrowright');
    return (right ? 1 : 0) - (left ? 1 : 0);
  }

  function updateFighter(f, dt, opponent, isPlayer) {
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.stun = Math.max(0, f.stun - dt);
    f.invuln = Math.max(0, f.invuln - dt);
    f.flash = Math.max(0, f.flash - dt);
    f.blockHit = Math.max(0, f.blockHit - dt);
    f.parryTime = Math.max(0, f.parryTime - dt);
    if (f.actionTime > 0) f.actionTime -= dt;
    if (f.actionTime <= 0 && ['attack','parry','dash','hurt'].includes(f.action)) f.action = 'idle';
    f.face = opponent.x >= f.x ? 1 : -1;

    let move = 0;
    if (isPlayer) move = getMove();
    else if (gameState === 'playing' && f.stun <= 0) {
      const gap = Math.abs(opponent.x - f.x);
      if (gap > W * .19) move = f.x < opponent.x ? 1 : -1;
      if (gap < W * .105 && Math.random() < dt * 1.25) {
        if (opponent.action === 'attack' && Math.random() < .62) action(f, 'parry');
        else if (Math.random() < .58) action(f, 'slash');
        else if (Math.random() < .38) action(f, 'dash');
      }
      if (gap > W * .32 && Math.random() < dt * .12) action(f, 'dash');
    }

    if (f.stun > 0) move = 0;
    if (f.action === 'attack' || f.action === 'parry') move = 0;
    const speed = f.action === 'dash' ? 1 : 1;
    const targetV = move * 285 * speed;
    if (f.action !== 'dash') f.vx = lerp(f.vx, targetV, 1 - Math.exp(-13 * dt));
    f.x += f.vx * dt;
    if (f.action !== 'dash') f.vx *= Math.exp(-7 * dt);
    f.x = clamp(f.x, 100, worldWidth - 100);
    if (Math.abs(f.vx) > 24) f.walk += dt * Math.min(12, Math.abs(f.vx) / 24);

    if (f.action === 'attack' && !f.attackHit && f.actionTime < .26 && f.actionTime > .10) {
      const distance = Math.abs(opponent.x - f.x);
      if (distance < W * .13) {
        f.attackHit = true;
        if (opponent.parryTime > 0) {
          f.stun = .66; f.action = 'hurt'; f.actionTime = .42; f.vx = -f.face * 125;
          opponent.blockHit = .24; shake = 7; hitFlash = .14;
        } else if (opponent.invuln <= 0) {
          opponent.health = Math.max(0, opponent.health - 13);
          opponent.stun = .29; opponent.action = 'hurt'; opponent.actionTime = .28;
          opponent.vx = f.face * 220; opponent.flash = .16; shake = 10; hitFlash = .17;
          if (opponent.health <= 0) endRound(isPlayer ? 'VICTORY' : 'DEFEAT');
        }
      }
    }
  }

  function endRound(message) {
    gameState = 'over'; roundMessage = message; roundTimer = 0;
  }

  function update(dt) {
    clock += dt;
    shake = Math.max(0, shake - dt * 35);
    hitFlash = Math.max(0, hitFlash - dt);
    if (gameState === 'playing') {
      updateFighter(player, dt, enemy, true);
      updateFighter(enemy, dt, player, false);
      const separation = enemy.x - player.x;
      if (Math.abs(separation) < 70) {
        const push = (70 - Math.abs(separation)) * .5;
        player.x -= Math.sign(separation) * push;
        enemy.x += Math.sign(separation) * push;
      }
      const center = (player.x + enemy.x) * .5;
      const target = clamp(center - W * .5, 0, worldWidth - W);
      camera = lerp(camera, target, 1 - Math.exp(-2.2 * dt));
    } else {
      roundTimer += dt;
      camera = lerp(camera, clamp((player.x + enemy.x) * .5 - W * .5, 0, worldWidth - W), 1 - Math.exp(-1.3 * dt));
      if (roundTimer > 2.8) roundMessage = roundMessage;
    }
    for (const flake of snow) {
      flake.x += (flake.drift - 8) * dt;
      flake.y += flake.speed * dt;
      if (flake.y > H + 5) { flake.y = -5; flake.x = rand(0, W); }
      if (flake.x < -5) flake.x = W + 5;
    }
  }

  function path(points, fill, stroke, width = 1) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawMountain(x, y, width, height, color, cap) {
    path([[x-width/2,y],[x-width*.27,y-height*.58],[x-width*.12,y-height*.43],[x,y-height],[x+width*.15,y-height*.45],[x+width*.32,y-height*.63],[x+width/2,y]], color);
    path([[x-width*.08,y-height*.68],[x,y-height],[x+width*.08,y-height*.67],[x+width*.025,y-height*.72],[x,y-height*.65],[x-width*.03,y-height*.73]], cap);
  }

  function drawPagoda(x, y, scale, tone) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(7,13,22,.58)';
    ctx.fillRect(-28, -78, 56, 78); ctx.fillRect(-20, -111, 40, 35); ctx.fillRect(-12, -136, 24, 27);
    for (const [cy, ww] of [[-80,78],[-115,61],[-142,44]]) {
      path([[-ww*.57,cy+6],[0,cy-5],[ww*.57,cy+6],[ww*.44,cy+12],[-ww*.44,cy+12]], tone);
      ctx.fillStyle = 'rgba(218,231,242,.24)'; ctx.fillRect(-ww*.4,cy+9,ww*.8,2);
    }
    ctx.fillStyle = tone; ctx.fillRect(-3,-157,6,16); ctx.restore();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#101b2c'); sky.addColorStop(.48, '#334660'); sky.addColorStop(1, '#8799a8');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);
    const glow = ctx.createRadialGradient(W*.5,H*.33,8,W*.5,H*.4,W*.65);
    glow.addColorStop(0,'rgba(217,229,238,.18)'); glow.addColorStop(1,'rgba(217,229,238,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    // Distant snowy ranges drift gently against the arena to create parallax.
    const parallax = camera * .12;
    for (let i=0;i<6;i++) {
      const x = ((i*W*.27 - parallax) % (W*1.35)) - W*.12;
      drawMountain(x,H*.61, W*.36, H*(.20 + (i%3)*.035), ['#52647a','#607288','#718398'][i%3], '#c8d3dd');
    }
    const skylineY = H*.62;
    for (let i=0;i<12;i++) {
      const x = ((i*W*.13 - camera*.25) % (W*1.4)) - 20;
      drawPagoda(x, skylineY + (i%2)*12, .48 + (i%3)*.11, i%2 ? '#202d3f' : '#27364a');
    }
    // Wind-swept snow on distant ridge.
    ctx.fillStyle='#c9d4df'; ctx.globalAlpha=.6;
    ctx.beginPath(); ctx.moveTo(0,H*.64);
    for(let x=0;x<=W;x+=40) ctx.lineTo(x,H*.62+Math.sin(x*.012+clock*.18)*5);
    ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();ctx.globalAlpha=1;
    drawRoof();
  }

  function drawRoof() {
    const ground = H * .795;
    const wood = ctx.createLinearGradient(0,ground,0,H);
    wood.addColorStop(0,'#2c3540'); wood.addColorStop(.15,'#1c2632'); wood.addColorStop(1,'#111a25');
    ctx.fillStyle=wood;ctx.fillRect(0,ground,W,H-ground);
    // Long roof ridge and eaves sell the scrolling rooftop perspective.
    ctx.fillStyle='#192330';ctx.fillRect(0,ground-14,W,20);
    ctx.fillStyle='#b9c9d6';ctx.fillRect(0,ground-17,W,4);
    ctx.fillStyle='rgba(236,245,251,.9)';ctx.fillRect(0,ground-21,W,4);
    for(let i=0;i<5;i++) {
      const x=((i*W*.27-camera*.8)%(W*1.35))-W*.12;
      ctx.fillStyle='#202b38';ctx.fillRect(x,ground+22,Math.max(14,W*.012),H*.21);
      ctx.fillStyle='rgba(147,170,189,.16)';ctx.fillRect(x+5,ground+24,2,H*.19);
    }
    ctx.strokeStyle='rgba(203,220,232,.12)';ctx.lineWidth=1;
    for(let i=0;i<12;i++){
      const x=((i*W*.12-camera*.95)%(W*1.5))-W*.1;
      ctx.beginPath();ctx.moveTo(x,ground+4);ctx.lineTo(x+W*.025,H);ctx.stroke();
    }
    // Windblown snow seams.
    ctx.strokeStyle='rgba(235,244,249,.42)';ctx.lineWidth=2;
    for(let i=0;i<9;i++){
      const x=((i*W*.16-camera*.72)%(W*1.4))-W*.1;
      ctx.beginPath();ctx.moveTo(x,ground+18+i%3*7);ctx.quadraticCurveTo(x+W*.04,ground+16+i%3*7,x+W*.08,ground+21+i%3*7);ctx.stroke();
    }
    const haze=ctx.createLinearGradient(0,ground-26,0,ground+34);
    haze.addColorStop(0,'rgba(239,247,252,.65)');haze.addColorStop(1,'rgba(239,247,252,0)');
    ctx.fillStyle=haze;ctx.fillRect(0,ground-25,W,60);
    // Soft contact shadow plane.
    const shadow=ctx.createLinearGradient(0,ground-3,0,ground+15);
    shadow.addColorStop(0,'rgba(4,8,14,.32)');shadow.addColorStop(1,'rgba(4,8,14,0)');
    ctx.fillStyle=shadow;ctx.fillRect(0,ground-3,W,20);
  }

  function drawSword(f, s, attack) {
    const face = f.face;
    const t = f.action === 'attack' ? clamp((.42-f.actionTime)/.42,0,1) : 0;
    ctx.save();
    let angle = -.72;
    if (attack) angle = lerp(-1.85, .75, clamp(t*1.6,0,1));
    if (f.action === 'parry') angle = -.12;
    if (f.action === 'dash') angle = -.5;
    ctx.translate(22,-97);ctx.rotate(angle);
    ctx.lineCap='round';
    ctx.strokeStyle='#c8d7e5';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-82);ctx.stroke();
    ctx.strokeStyle='#f0f5f8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-1,-6);ctx.lineTo(-1,-78);ctx.stroke();
    ctx.strokeStyle='#b47e45';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,2);ctx.lineTo(0,18);ctx.stroke();
    ctx.strokeStyle='#e2c47c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();
    ctx.restore();
    if (attack && f.actionTime < .31 && f.actionTime > .11) {
      const alpha=clamp(1-Math.abs(f.actionTime-.21)*5,0,.8);
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#e5f4ff';ctx.lineWidth=4;
      ctx.shadowColor='#9dd9ff';ctx.shadowBlur=15;
      ctx.beginPath();ctx.arc(20,-110,79,-1.05,.68);ctx.stroke();ctx.restore();
    }
  }

  function drawFighter(f, isPlayer) {
    const ground=H*.795;
    const s=clamp(H/720,.56,1.14);
    const bob=Math.sin(f.walk*2)*2.5;
    const hurt=f.action==='hurt';
    ctx.save();ctx.translate(f.x-camera,ground+bob*s);ctx.scale(s*f.face,s);
    if (f.invuln>0 && Math.floor(clock*24)%2===0) ctx.globalAlpha=.55;
    // cast shadow
    ctx.save();ctx.scale(1,.24);const sh=ctx.createRadialGradient(0,0,4,0,0,56);
    sh.addColorStop(0,'rgba(4,7,12,.54)');sh.addColorStop(1,'rgba(4,7,12,0)');ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(0,0,58,21,0,0,TAU);ctx.fill();ctx.restore();
    const accent=isPlayer?'#c3293d':'#111923';
    const bright=isPlayer?'#ed4050':'#303c4b';
    const dark=isPlayer?'#591a29':'#070d15';
    const cloth=isPlayer?'#281923':'#111820';
    const metal=isPlayer?'#822538':'#202b39';
    const legSwing=f.action==='idle'?Math.sin(f.walk)*8:0;
    // trailing cloth and shoulder sash
    ctx.fillStyle=cloth;
    path([[-8,-102],[-35,-93],[-47,-43],[-17,-57],[1,-83]],cloth);
    ctx.fillStyle=accent;path([[-23,-84],[-40,-52],[-30,-47],[-12,-76]],accent);
    // legs, shin armor and sandals
    ctx.save();ctx.translate(-9,0);ctx.rotate(legSwing*.012);path([[-9,-56],[10,-56],[11,-24],[6,-8],[-12,-8],[-15,-19]],dark);
    path([[-15,-26],[8,-28],[10,-11],[-12,-10]],metal);
    ctx.fillStyle=bright;ctx.fillRect(-13,-25,19,3);ctx.restore();
    ctx.save();ctx.translate(14,0);ctx.rotate(-legSwing*.012);path([[-8,-57],[11,-55],[15,-21],[10,-7],[-9,-7],[-12,-22]],dark);
    path([[-12,-28],[11,-27],[12,-11],[-10,-10]],metal);ctx.fillStyle=bright;ctx.fillRect(-11,-25,19,3);ctx.restore();
    ctx.fillStyle='#131923';
    path([[-17,-9],[9,-9],[13,-3],[9,0],[-20,0],[-23,-4]],'#111923');
    path([[1,-8],[27,-8],[31,-3],[26,0],[-1,0],[-3,-4]],'#111923');
    ctx.strokeStyle='rgba(220,228,234,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-2);ctx.lineTo(9,-2);ctx.moveTo(2,-2);ctx.lineTo(26,-2);ctx.stroke();
    // torso silhouette and layered cuirass
    path([[-19,-112],[17,-112],[27,-97],[20,-59],[10,-49],[-17,-52],[-27,-66],[-27,-96]],dark);
    path([[-21,-105],[17,-107],[24,-95],[16,-67],[-15,-65],[-24,-78]],metal);
    path([[-19,-103],[1,-107],[4,-72],[-15,-69],[-23,-81]],accent);
    path([[3,-105],[18,-103],[22,-94],[15,-70],[3,-72]],isPlayer?'#7b2031':'#253344');
    // lames and chest plate
    for(let i=0;i<3;i++){
      ctx.strokeStyle=isPlayer?'rgba(246,128,127,.56)':'rgba(156,177,197,.45)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-18,-98+i*8);ctx.lineTo(17,-98+i*8);ctx.stroke();
    }
    path([[-8,-98],[3,-100],[9,-87],[2,-78],[-7,-81]],isPlayer?'#edc16e':'#c3cad0');
    // belt
    ctx.fillStyle=isPlayer?'#451521':'#090f17';ctx.fillRect(-19,-67,36,7);
    ctx.fillStyle=isPlayer?'#dbb45f':'#a2aab2';ctx.fillRect(-3,-68,8,9);
    // arms and shoulder guards
    path([[-22,-104],[-34,-101],[-41,-84],[-31,-76],[-20,-91]],dark);
    path([[-35,-101],[-23,-104],[-19,-93],[-30,-87],[-40,-91]],accent);
    path([[18,-104],[30,-100],[34,-82],[25,-74],[16,-90]],dark);
    path([[17,-105],[31,-101],[36,-91],[27,-86],[18,-92]],metal);
    ctx.fillStyle=isPlayer?'#e7d4be':'#c3c6c5';ctx.beginPath();ctx.arc(28,-81,6,0,TAU);ctx.fill();
    drawSword(f,s,f.action==='attack');
    // neck and helmet
    ctx.fillStyle='#c58e76';ctx.fillRect(-8,-121,17,14);
    ctx.fillStyle=isPlayer?'#bd886f':'#b99783';ctx.beginPath();ctx.ellipse(0,-134,19,22,0,0,TAU);ctx.fill();
    ctx.fillStyle=isPlayer?'#231a20':'#131920';ctx.fillRect(4,-140,14,6);
    ctx.fillStyle='#0a1119';ctx.fillRect(-16,-137,34,8);
    // kabuto helmet dome and crest
    ctx.fillStyle=isPlayer?'#731c2d':'#111924';
    ctx.beginPath();ctx.moveTo(-22,-139);ctx.quadraticCurveTo(-17,-164,0,-166);ctx.quadraticCurveTo(20,-161,22,-139);ctx.closePath();ctx.fill();
    ctx.strokeStyle=isPlayer?'#e2af62':'#6d7885';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-22,-140);ctx.quadraticCurveTo(0,-148,22,-140);ctx.stroke();
    // horned silhouette gives the warlord a distinct boss profile.
    if(!isPlayer){
      path([[-14,-157],[-29,-177],[-22,-151],[-7,-155]],'#222d3a');
      path([[14,-157],[29,-177],[22,-151],[7,-155]],'#222d3a');
      ctx.strokeStyle='#bd9a57';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-1,-162);ctx.lineTo(0,-178);ctx.lineTo(5,-163);ctx.stroke();
    } else {
      path([[-3,-164],[1,-184],[10,-168],[6,-161]],'#d4ae69');
    }
    // eye and face accent
    ctx.fillStyle='#15141a';ctx.fillRect(6,-135,8,2);
    ctx.fillStyle=isPlayer?'#f0d7b2':'#c4cbd0';ctx.fillRect(9,-136,3,2);
    if(f.flash>0){ctx.globalAlpha=Math.min(1,f.flash*7);ctx.fillStyle='#fff';ctx.fillRect(-33,-170,68,170);}
    if(f.blockHit>0){ctx.globalAlpha=.8;ctx.strokeStyle='#bfe7ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(23,-102,50,-1.1,.65);ctx.stroke();}
    ctx.restore();
  }

  function roundedRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
  }

  function drawHealthPanel(x,y,w,f,isPlayer) {
    const accent=isPlayer?'#d9384c':'#a7b0ba';
    const left=isPlayer;
    ctx.save();
    // Quiet, separated nameplate and bar prevent any text collisions.
    roundedRect(x,y,w,66,8,'rgba(8,15,25,.72)','rgba(208,224,237,.18)');
    ctx.fillStyle=accent;
    if(left)ctx.fillRect(x,y,3,66);else ctx.fillRect(x+w-3,y,3,66);
    ctx.textAlign=left?'left':'right';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#f0f4f7';ctx.font=`700 ${clamp(W*.018,14,19)}px Trebuchet MS, system-ui, sans-serif`;
    ctx.fillText(f.name,x+(left?16:w-16),y+23);
    ctx.fillStyle='rgba(190,207,222,.67)';ctx.font=`600 ${clamp(W*.009,9,11)}px Trebuchet MS, system-ui, sans-serif`;
    ctx.fillText(f.title,x+(left?16:w-16),y+39);
    const barX=x+14,barY=y+48,barW=w-28,barH=8;
    roundedRect(barX,barY,barW,barH,4,'rgba(2,7,13,.85)');
    const fillW=barW*clamp(f.health/f.maxHealth,0,1);
    if(fillW>0){
      const g=ctx.createLinearGradient(barX,0,barX+barW,0);
      if(isPlayer){g.addColorStop(0,'#a91e36');g.addColorStop(1,'#ff5962');}
      else {g.addColorStop(0,'#74808d');g.addColorStop(1,'#c7cdd3');}
      roundedRect(left?barX:barX+barW-fillW,barY,fillW,barH,4,g);
    }
    ctx.restore();
  }

  function drawHUD() {
    const margin=clamp(W*.035,16,46),gap=clamp(W*.09,36,110);
    const panelW=Math.min((W-gap-margin*2)/2,390);
    const y=clamp(H*.045,15,35);
    drawHealthPanel(margin,y,panelW,player,true);
    drawHealthPanel(W-margin-panelW,y,panelW,enemy,false);
    // A restrained match marker lives in its own strip, clear of the health panels.
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(231,239,246,.55)';ctx.font=`700 ${clamp(W*.009,9,12)}px Trebuchet MS,system-ui,sans-serif`;
    const marker='WINTER  •  FIRST TO FALL';
    const panelGap=W-2*(margin+panelW);
    if(ctx.measureText(marker).width < panelGap-16) ctx.fillText(marker,W/2,y+26);
    ctx.fillStyle='rgba(233,196,106,.78)';ctx.font='12px Georgia,serif';ctx.fillText('✦',W/2,y+(panelGap>100?48:30));
    if(gameState==='over'){
      ctx.fillStyle='rgba(5,10,17,.4)';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(9,17,28,.9)';roundedRect(W/2-160,H*.34,320,126,12,'rgba(9,17,28,.92)','rgba(223,235,244,.22)');
      ctx.fillStyle=roundMessage==='VICTORY'?'#f0c46e':'#d9e3ed';
      ctx.font=`700 ${clamp(W*.032,24,38)}px Georgia,serif`;ctx.fillText(roundMessage,W/2,H*.34+49);
      ctx.fillStyle='rgba(210,223,234,.72)';ctx.font=`500 ${clamp(W*.012,11,14)}px Trebuchet MS,system-ui,sans-serif`;
      ctx.fillText('PRESS R TO FIGHT AGAIN',W/2,H*.34+85);
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    drawBackground();
    // World characters move beneath a steady, carefully spaced HUD.
    ctx.save();
    if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake*.45,shake*.45));
    drawFighter(player,true);drawFighter(enemy,false);
    ctx.restore();
    // Foreground flurries add depth without obscuring the fighters or UI.
    for(const flake of snow){
      ctx.globalAlpha=flake.alpha;ctx.fillStyle='#edf5fb';ctx.beginPath();ctx.arc(flake.x,flake.y,flake.r,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    if(hitFlash>0){ctx.fillStyle=`rgba(211,231,247,${hitFlash*.26})`;ctx.fillRect(0,0,W,H);}
    drawHUD();
  }

  function frame(now) {
    const dt=Math.min(.034,Math.max(0,(now-last)/1000||0));last=now;
    update(dt);render();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
