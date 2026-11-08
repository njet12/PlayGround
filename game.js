import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a9c5c6');
scene.fog = new THREE.Fog('#a9c5c6', 45, 145);
const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 240);
scene.add(new THREE.HemisphereLight('#f0f3df', '#65766a', 2.15));
const sun = new THREE.DirectionalLight('#fff0d6', 3.2);
sun.position.set(-25, 38, -18); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48; sun.shadow.bias = -0.00025;
scene.add(sun);

const mats = {};
const mat = (name, color, roughness = .82, metalness = 0) => (mats[name] = new THREE.MeshStandardMaterial({ color, roughness, metalness }));
mat('concrete', '#b9b8a9'); mat('darkConcrete', '#777f79'); mat('ramp', '#d2cdbd'); mat('edge', '#525f5b'); mat('yellow', '#d8ff3e'); mat('coral', '#f27655'); mat('teal', '#3d7775'); mat('blue', '#547f91'); mat('metal', '#aeb8b4', .32, .78); mat('black', '#20292a'); mat('white', '#f1eadb'); mat('skin', '#bf8160'); mat('shirt', '#e7a342'); mat('pants', '#263943'); mat('shoe', '#f2eee1'); mat('wheel', '#333b39'); mat('leaf', '#55775b'); mat('trunk', '#64574a');
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
function box(parent, name, x, y, z, sx, sy, sz, material, options = {}) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = options.cast ?? true; mesh.receiveShadow = options.receive ?? true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh); return mesh;
}
function cylinder(parent, x, y, z, radiusTop, radiusBottom, height, material, radial = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeRamp(parent, x, z, width, length, height, angle, color = mats.ramp) {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = angle; parent.add(group);
  const rise = new THREE.Shape(); rise.moveTo(-length / 2, 0); rise.lineTo(length / 2, 0); rise.lineTo(length / 2, height); rise.closePath();
  const geo = new THREE.ExtrudeGeometry(rise, { depth: width, bevelEnabled: false }); geo.translate(0, 0, -width / 2);
  const top = new THREE.Mesh(geo, color); top.castShadow = true; top.receiveShadow = true; group.add(top);
  box(group, 'ramp-side', 0, .035, width / 2 + .01, length, .07, .045, mats.edge);
  box(group, 'ramp-side', 0, .035, -width / 2 - .01, length, .07, .045, mats.edge);
  return { group, x, z, width, length, height, angle };
}

// Open-air neighborhood park: worn concrete, ramps, rails, ledges and tree shadows.
box(scene, 'park-floor', 0, -.28, 0, 100, .55, 96, mats.darkConcrete, {cast:false});
box(scene, 'ride-surface', 0, 0, 0, 58, .22, 50, mats.concrete, {cast:false});
// Expansion seams, inset drains and painted park lines.
for (let x = -26; x <= 26; x += 6.5) box(scene, 'concrete-seam', x, .115, 0, .035, .012, 47, new THREE.MeshStandardMaterial({ color: '#888d83', roughness: 1 }), {cast:false});
for (let z = -22; z <= 22; z += 6.5) box(scene, 'concrete-seam', 0, .115, z, 57, .012, .035, new THREE.MeshStandardMaterial({ color: '#888d83', roughness: 1 }), {cast:false});
box(scene, 'park-boundary-back', 0, .14, -25, 58, .15, .16, mats.yellow, {cast:false});
box(scene, 'park-boundary-front', 0, .14, 25, 58, .15, .16, mats.yellow, {cast:false});
// Central raised funbox with shallow approach banks and grindable coping.
box(scene, 'funbox-core', -1, .63, -1.5, 6, 1.05, 7.5, mats.ramp);
box(scene, 'funbox-top', -1, 1.18, -1.5, 6.15, .12, 7.65, mats.ramp);
box(scene, 'funbox-coping', -1, 1.27, -5.3, 6.2, .08, .11, mats.metal);
makeRamp(scene, -1, 5.2, 6, 6, 1.2, Math.PI / 2, mats.ramp);
makeRamp(scene, -1, -8.1, 6, 5, 1.2, -Math.PI / 2, mats.ramp);
// Quarter pipes and a mellow bank at park edges.
makeRamp(scene, -13.1, -1, 8, 8, 3.2, 0, mats.ramp);
makeRamp(scene, 13.1, 1, 8, 8, 3.2, Math.PI, mats.ramp);
makeRamp(scene, -20.6, 0, 5, 9, 2.25, 0, mats.teal);
makeRamp(scene, 20.6, 0, 5, 9, 2.25, Math.PI, mats.coral);
// Rails: coping height for a satisfying pop and grind target.
function rail(x1, z1, x2, z2, y = 1.32, radius = .075, color = mats.metal) {
  const a = new THREE.Vector3(x1, y, z1), b = new THREE.Vector3(x2, y, z2), mid = a.clone().add(b).multiplyScalar(.5);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 10), color);
  mesh.position.copy(mid); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); mesh.castShadow = true; scene.add(mesh);
  for (const [x, z] of [[x1,z1],[x2,z2]]) cylinder(scene, x, y / 2, z, .045, .06, y, mats.edge, 8);
}
rail(-7, -3.4, 5, -3.4, 1.25);
rail(-7, 2.5, 5, 2.5, 1.3);
rail(8.7, -8, 8.7, 8, 1.12, .07, mats.edge);
rail(-9.5, 8, -9.5, 15, 1.25, .075, mats.metal);
// Manual pad and curb ledges.
box(scene, 'manual-pad', 10.1, .5, -12.8, 5.4, .94, 3.1, mats.blue);
box(scene, 'manual-pad-lip', 10.1, 1, -12.8, 5.55, .08, 3.25, mats.metal);
box(scene, 'low-ledge', -10.3, .36, 12.6, 8, .68, 2, mats.coral);
box(scene, 'low-ledge-lip', -10.3, .72, 12.6, 8.1, .07, 2.1, mats.metal);
// Asphalt beyond concrete, simple stylized fences, streetlights and leafy park edge.
box(scene, 'back-path', 0, -.04, -32, 75, .2, 10, mats.black, {cast:false});
box(scene, 'back-curb', 0, .09, -26.6, 70, .2, .35, mats.white);
for (const x of [-29,-22,-15,-8,0,8,16,24,31]) {
  box(scene, 'fence-post', x, 1.2, -28.8, .13, 2.4, .13, mats.edge);
  if (x < 31) box(scene, 'fence-rail', x + 3.5, 1.75, -28.8, 7, .1, .1, mats.edge);
}
for (const [x,z,h] of [[-30,-17,4.7],[29,-18,5.1],[-29,19,4.2],[30,18,4.8],[-23,-31,5.5],[24,-31,4.5]]) {
  cylinder(scene, x, h*.35, z, .13, .22, h*.7, mats.trunk, 8);
  for (let i=0;i<5;i++) { const leaf=cylinder(scene,x+(Math.random()-.5)*2,h*.75+(Math.random()-.5)*1.3,z+(Math.random()-.5)*2,.9,1.3,1.7,mats.leaf,7); leaf.rotation.z=(Math.random()-.5)*.8; }
}
// Graphic park markers, painted deck accents and signage.
for (const [x,z,c] of [[-21,-11,mats.yellow],[22,12,mats.coral]]) {
  box(scene,'paint-mark',x,.13,z,3.8,.025,.18,c,{cast:false});
  box(scene,'paint-mark',x,.13,z, .18,.025,3.8,c,{cast:false});
}
const sign = new THREE.Group(); sign.position.set(-25,0,-8); scene.add(sign);
box(sign,'sign-post',0,2,0,.15,4,.15,mats.edge);
box(sign,'park-sign',0,3.3,0,3.2,1.5,.18,mats.teal);
box(sign,'sign-stripe',0,3.4,.11,2.4,.08,.04,mats.yellow);

// A little skater built from real meshes: board, trucks, four wheels, body and limbs.
const skater = new THREE.Group(); scene.add(skater);
const board = new THREE.Group(); skater.add(board);
box(board,'deck',0,.23,0,1.18,.13,2.05,mats.coral);
box(board,'deck-grip',0,.305,0,1.08,.025,1.85,mats.black);
for (const z of [-.68,.68]) {
  box(board,'truck',0,.13,z,.55,.09,.16,mats.metal);
  for (const x of [-.43,.43]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.11,12), mats.wheel);
    wheel.rotation.z=Math.PI/2; wheel.position.set(x,.12,z); wheel.castShadow=true; board.add(wheel);
  }
}
const rider = new THREE.Group(); skater.add(rider);
const torso = box(rider,'hoodie',0,1.19,0,.62,.75,.4,mats.shirt); torso.rotation.x=.1;
const head = new THREE.Mesh(new THREE.SphereGeometry(.24,16,12),mats.skin);head.position.set(0,1.79,-.02);head.castShadow=true;rider.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),mats.black);hair.scale.set(1,.48,1);hair.position.set(0,1.94,.015);rider.add(hair);
const legPivots=[];
for (const side of [-1,1]) {
  const leg=new THREE.Group();leg.position.set(side*.18,.88,0);rider.add(leg);legPivots.push(leg);
  box(leg,'leg',0,-.3,0,.24,.64,.27,mats.pants);
  box(leg,'shoe',0,-.63,-.12,.3,.17,.48,mats.shoe);
  const arm=new THREE.Group();arm.position.set(side*.35,1.45,0);rider.add(arm);
  const upper=box(arm,'sleeve',side*.06,-.22,0,.22,.52,.24,mats.shirt);upper.rotation.z=side*-.22;
  const hand=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),mats.skin);hand.position.set(side*-.01,-.5,-.05);arm.add(hand);
}
const shadowDisc=new THREE.Mesh(new THREE.CircleGeometry(.7,24),new THREE.MeshBasicMaterial({color:'#34423e',transparent:true,opacity:.2,depthWrite:false}));shadowDisc.rotation.x=-Math.PI/2;shadowDisc.position.y=.125;scene.add(shadowDisc);
const trailGroup=new THREE.Group();scene.add(trailGroup);

// HUD and responsive renderer sizing.
const $ = s => document.querySelector(s);
const scoreEl=$('#score'), bestEl=$('#best'), timerEl=$('#timer'), timerFill=$('#timer-fill'), comboEl=$('#combo');
const trickName=$('#trick-name'), airState=$('#air-state'), trickPoints=$('#trick-points'), speedEl=$('#speed');
const centerMessage=$('#center-message'), runEnd=$('#run-end'), toast=$('#toast');
const bestKey='ridetheline-best'; let bestScore=Number(localStorage.getItem(bestKey)||0);
bestEl.textContent=String(bestScore).padStart(6,'0');
const speedBars=[];for(let i=0;i<12;i++){const e=document.createElement('i');$('#speed-bars').append(e);speedBars.push(e)}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();

// Trick-run gameplay: momentum, airtime, trick inputs, landing multipliers, wipeouts and timer.
const state={running:false,ended:false,time:120,score:0,combo:0,comboName:'',speed:0,air:0,airMax:0,spin:0,flip:0,grab:0,groundY:0,trickLabel:'PUSH TO ROLL',freshTrick:false,wipeout:0,toastTime:0,elapsed:0,trackTime:0};
const keys=new Set();let audioCtx=null,soundOn=true;
const trickNames={j:['KICKFLIP','HEELFLIP','VARIAL FLIP'],k:['POP SHUVIT','360 SHUVIT','BIGSPIN'],l:['GRAB','INDY GRAB','STIFFY GRAB']};
function updateScore(){scoreEl.textContent=String(Math.floor(state.score)).padStart(6,'0');comboEl.textContent=state.combo?`${state.combo}X ${state.comboName}`:'NO COMBO';}
function popToast(){toast.classList.add('show');state.toastTime=1.1;}
function beep(freq=360,duration=.08,type='sine',volume=.035){if(!soundOn)return;try{audioCtx ||= new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=volume;g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}}
function setTrick(label,points=0){state.trickLabel=label;state.freshTrick=true;trickName.textContent=label;trickPoints.textContent=points?`+${points}`:'+0';}
function startRun(){state.running=true;state.ended=false;state.time=120;state.score=0;state.combo=0;state.speed=0;state.air=0;state.elapsed=0;state.trackTime=0;state.trickLabel='PUSH TO ROLL';state.freshTrick=false;state.wipeout=0;state.score=0;state.comboName='';scoreEl.textContent='000000';timerEl.textContent='2:00';timerFill.style.width='100%';runEnd.classList.add('hidden');centerMessage.classList.add('hidden');skater.position.set(0,.14,9);skater.rotation.set(0,0,0);skater.visible=true;}
function finishRun(){state.running=false;state.ended=true;$('#final-score').textContent=String(Math.floor(state.score)).padStart(6,'0');runEnd.classList.remove('hidden');if(state.score>bestScore){bestScore=Math.floor(state.score);localStorage.setItem(bestKey,bestScore);bestEl.textContent=String(bestScore).padStart(6,'0');}beep(540,.3,'triangle');}
function doTrick(key){if(!state.running)return;if(key===' '){if(state.air<.06){state.speed=Math.max(state.speed,9);state.air=0;state.airMax=0;state.groundY=skater.position.y;state.combo=0;state.comboName='';state.flip=0;state.spin=0;state.grab=0;state.freshTrick=false;setTrick('OLLIE',0);beep(250,.06,'triangle');}return;}
 if(key==='j'||key==='k'||key==='l'){if(state.air>.04){if(key==='j'){state.flip+=1;setTrick(trickNames.j[Math.min(Math.floor(state.flip/2),2)]);beep(500+state.flip*35,.06,'square');}if(key==='k'){state.spin+=Math.PI/2;setTrick(trickNames.k[Math.min(Math.floor(Math.abs(state.spin)/(Math.PI*2)),2)]);beep(380,.06,'triangle');}if(key==='l'){state.grab+=1;setTrick(trickNames.l[Math.min(state.grab-1,2)]);beep(660,.1,'sine');}}else{if(key==='j')setTrick('KICKFLIP READY');if(key==='k')setTrick('SHUVIT READY');if(key==='l')setTrick('GRAB READY');}}
}
function inputDown(key){if(!keys.has(key)){keys.add(key);if([' ','j','k','l'].includes(key))doTrick(key);}}
function inputUp(key){keys.delete(key);}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(key==='enter'&&!state.running){if(state.ended)startRun();else startRun();return;}const mapped=({arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'})[key]||key;inputDown(mapped);});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();inputUp(({arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'})[key]||key);});
for(const btn of document.querySelectorAll('[data-key]')){const k=btn.dataset.key;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);inputDown(k);});btn.addEventListener('pointerup',e=>{e.preventDefault();inputUp(k)});btn.addEventListener('pointercancel',()=>inputUp(k));btn.addEventListener('contextmenu',e=>e.preventDefault());}
$('#start-btn').addEventListener('click',startRun);$('#again-btn').addEventListener('click',startRun);
$('#sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('#sound-btn').querySelector('span:last-child').textContent=soundOn?'SOUND ON':'SOUND OFF';if(soundOn)beep();});

// Fixed-scene collision cues: quarter pipes offer real pop; ramps/obstacles shape your line.
const rampZones=[{x:-13.1,z:-1,w:8,l:8,h:3.2},{x:13.1,z:1,w:8,l:8,h:3.2},{x:-20.6,z:0,w:5,l:9,h:2.25},{x:20.6,z:0,w:5,l:9,h:2.25}];
function groundHeight(x,z){let y=.14;for(const r of rampZones){if(Math.abs(x-r.x)<r.w/2 && Math.abs(z-r.z)<r.l/2){const edge=(z-r.z)/(r.l/2);const ramp=Math.max(0,1-Math.abs(edge))*r.h;y=Math.max(y,.14+ramp);}}return y;}
function skid(x,z,color){const g=new THREE.Mesh(new THREE.BoxGeometry(.035,.015,.35),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.42}));g.position.set(x,.14,z);g.rotation.y=skater.rotation.y;trailGroup.add(g);if(trailGroup.children.length>38)trailGroup.remove(trailGroup.children[0]);}
function land(){const rotationCount=Math.abs(state.spin)/(Math.PI*2), tricks=state.flip+state.grab+rotationCount*2;const name=state.trickLabel==='OLLIE'?(state.airMax>.45?'OLLIE':'MANUAL'):(state.trickLabel==='PUSH TO ROLL'?'MANUAL':state.trickLabel);const base=Math.max(100,Math.round(100+tricks*180+state.airMax*75));const multiplier=Math.max(1,state.combo+1);const earned=base*multiplier;state.score+=earned;state.combo=Math.min(state.combo+1,9);state.comboName=name;setTrick(name,earned);airState.textContent='CLEAN LANDING';updateScore();beep(540+state.combo*55,.09,'triangle');skid(skater.position.x,skater.position.z,'#282d2a');}
function wipeout(){state.combo=0;state.comboName='';state.speed*=.42;state.wipeout=.75;state.air=0;state.flip=state.spin=state.grab=0;setTrick('WIPEOUT',0);popToast();beep(90,.25,'sawtooth',.06);skater.rotation.z=1.2;updateScore();}

// Camera follows the rider with a mild cinematic lean, preserving the whole bowl in frame.
const camTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3();
function update(dt){state.elapsed+=dt;
 if(state.running){state.time=Math.max(0,state.time-dt);if(state.time===0)finishRun();
   let accel=0;if(keys.has('w'))accel=15;else if(keys.has('s'))accel=-17;state.speed+=accel*dt;state.speed*=Math.pow(keys.has('s')?.992:.987,dt*60);state.speed=THREE.MathUtils.clamp(state.speed,0,24);
   const turn=(keys.has('a')?1:0)-(keys.has('d')?1:0);skater.rotation.y+=turn*dt*(1.55+state.speed*.09);
   const forward=new THREE.Vector3(Math.sin(skater.rotation.y),0,Math.cos(skater.rotation.y));skater.position.x+=forward.x*state.speed*dt;skater.position.z-=forward.z*state.speed*dt;
   skater.position.x=THREE.MathUtils.clamp(skater.position.x,-25.5,25.5);skater.position.z=THREE.MathUtils.clamp(skater.position.z,-22.5,22.5);
   const ground=groundHeight(skater.position.x,skater.position.z);const previousAir=state.air;
   if(state.air>0){state.air=Math.max(0,state.air-dt);state.airMax=Math.max(state.airMax,state.air);skater.position.y=Math.max(ground,skater.position.y-7.2*dt);board.rotation.x=state.flip*Math.PI*2*(1-state.air/.72);board.rotation.y=state.spin*(1-state.air/.72);rider.rotation.z=state.spin*.18;airState.textContent='IN THE AIR';}
   else{skater.position.y=ground;board.rotation.x=0;board.rotation.y=0;rider.rotation.z=0;}
   // Ollie triggers a compact, responsive arc; ramps create a bonus pop.
   if(state.freshTrick&&state.trickLabel==='OLLIE'&&state.air===0){const bonus=ground>.5?.14:0;state.air=.66+Math.min(state.speed/24,.3)+bonus;state.airMax=state.air;skater.position.y+=.04;state.freshTrick=false;airState.textContent='IN THE AIR';}
   if(previousAir>0&&state.air===0){const landedAt=groundHeight(skater.position.x,skater.position.z);skater.position.y=landedAt;if(state.airMax>.16)land();state.airMax=0;}
   if(state.speed>8&&Math.random()<dt*2)skid(skater.position.x,skater.position.z,'#373d38');
   if(state.wipeout>0){state.wipeout-=dt;if(state.wipeout<=0)skater.rotation.z=0;}
   const totalSeconds=Math.ceil(state.time);timerEl.textContent=`${Math.floor(totalSeconds/60)}:${String(totalSeconds%60).padStart(2,'0')}`;timerFill.style.width=`${state.time/120*100}%`;
   speedEl.textContent=String(Math.round(state.speed*4.2)).padStart(2,'0');speedBars.forEach((b,i)=>b.classList.toggle('on',i<Math.round(state.speed/24*12)));
   if(state.toastTime>0){state.toastTime-=dt;if(state.toastTime<=0)toast.classList.remove('show');}
 }else{state.speed=Math.max(0,state.speed-dt*2);speedEl.textContent=String(Math.round(state.speed*4.2)).padStart(2,'0');}
 const ground=groundHeight(skater.position.x,skater.position.z);shadowDisc.position.set(skater.position.x,.132,skater.position.z);shadowDisc.scale.setScalar(1+Math.max(0,skater.position.y-ground)*.2);shadowDisc.material.opacity=Math.max(.07,.22-(skater.position.y-ground)*.1);
 board.position.y=Math.sin(state.elapsed*13)*.018*(state.speed/24)+(state.air>0?Math.sin((.72-state.air)*28)*.03:0);if(state.running&&state.air===0){rider.rotation.x=THREE.MathUtils.lerp(rider.rotation.x,keys.has('w')?-.12:.03,dt*5);legPivots.forEach((p,i)=>p.rotation.x=Math.sin(state.elapsed*8+i*Math.PI)*.06*(state.speed/20));}
 camTarget.set(skater.position.x,1.8+skater.position.y*.25,skater.position.z);desiredCamera.set(skater.position.x-Math.sin(skater.rotation.y)*1.2,9.3+Math.max(0,state.speed-14)*.07,skater.position.z+15.3);camera.position.lerp(desiredCamera,1-Math.pow(.001,dt));camera.lookAt(camTarget.x,camTarget.y-.4,camTarget.z-1.6);
}
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);update(dt);renderer.render(scene,camera);}animate();
