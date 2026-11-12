import './style.css';
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const state = { money: 1000, income: 0, customers: 0, level: 1, stock: 24, employees: 0, language: 'fa' };
const text = {
  fa: {panel:'مدیریت فروشگاه',subtitle:'داشبورد زنده',money:'موجودی',customers:'مشتری‌ها',level:'فروشگاه',income:'درآمد امروز',stock:'موجودی انبار',empty:'قفسه‌های خالی',restock:'📦 شارژ قفسه‌ها',upgrade:'⬆️ ارتقای فروشگاه',hire:'👷 استخدام کارمند',save:'💾 ذخیره بازی',welcome:'به فروشگاه خوش آمدی، عرفان! برای حرکت از WASD استفاده کن.',noMoney:'موجودی کافی نیست!',restocked:'قفسه‌ها شارژ شدند.',upgraded:'فروشگاه ارتقا پیدا کرد!',hired:'کارمند جدید استخدام شد.',saved:'بازی ذخیره شد.',pause:'بازی متوقف شد',pauseText:'فروشگاه منتظر مدیریت توست.',resume:'ادامه بازی',hint:'حرکت: WASD یا کلیدهای جهت‌دار\nچرخش دوربین: حرکت ماوس'},
  en: {panel:'Store Management',subtitle:'Live dashboard',money:'Balance',customers:'Customers',level:'Store',income:"Today's income",stock:'Warehouse stock',empty:'Empty shelves',restock:'📦 Restock shelves',upgrade:'⬆️ Upgrade store',hire:'👷 Hire employee',save:'💾 Save game',welcome:'Welcome to your store, Erfan! Use WASD to move.',noMoney:'Not enough money!',restocked:'Shelves restocked.',upgraded:'Store upgraded!',hired:'A new employee has been hired.',saved:'Game saved.',pause:'Game paused',pauseText:'Your store is waiting for its manager.',resume:'Resume game',hint:'Move: WASD or arrow keys\nRotate camera: drag mouse'}
};
let scene, camera, renderer, player, clock, customers = [], shelves = [], keys = {};
let yaw = 0, pitch = -0.22, dragging = false, lastX = 0, lastY = 0, paused = false;
let toastTimer;
const t = () => text[state.language];
const format = n => '$' + Math.floor(n).toLocaleString('en-US');

function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }
function updateUI() {
  $('money').textContent=format(state.money); $('customers').textContent=state.customers.toLocaleString(state.language==='fa'?'fa-IR':'en-US');
  $('level').textContent=state.language==='fa'?`سطح ${state.level}`:`Level ${state.level}`;
  $('income').textContent=format(state.income); $('stock').textContent=state.stock.toLocaleString(state.language==='fa'?'fa-IR':'en-US');
  $('empty').textContent=shelves.filter(s=>s.userData.empty).length.toLocaleString(state.language==='fa'?'fa-IR':'en-US');
  $('panelTitle').textContent=t().panel; $('panelSubtitle').textContent=t().subtitle;
  $('moneyLabel').textContent=t().money; $('customersLabel').textContent=t().customers; $('levelLabel').textContent=t().level;
  $('incomeLabel').textContent=t().income; $('stockLabel').textContent=t().stock; $('emptyLabel').textContent=t().empty;
  $('restockBtn').querySelector('span').textContent=t().restock; $('upgradeBtn').querySelector('span').textContent=t().upgrade;
  $('hireBtn').querySelector('span').textContent=t().hire; $('saveBtn').textContent=t().save;
  $('bottomTip').textContent=t().welcome; $('hint').textContent=t().hint; $('pauseTitle').textContent=t().pause;
  $('pauseText').textContent=t().pauseText; $('resumeBtn').textContent=t().resume;
  document.documentElement.lang=state.language; document.documentElement.dir=state.language==='fa'?'rtl':'ltr';
}
function saveGame() {
  const data={money:state.money,income:state.income,customers:state.customers,level:state.level,stock:state.stock,employees:state.employees,language:state.language};
  localStorage.setItem('shopRush2ErfanSave',JSON.stringify(data)); toast(t().saved);
}
function loadGame() { try { const raw=localStorage.getItem('shopRush2ErfanSave'); if(raw) Object.assign(state,JSON.parse(raw)); } catch(err) { console.warn('Save data could not be read.',err); } }
function box(parent,w,h,d,color,x,y,z, opts={}) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.82}));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function createShelf(x,z) {
  const g=new THREE.Group(); g.position.set(x,0,z); const wood=0x98704f, dark=0x584332;
  for(const y of [.4,1.1,1.8]) box(g,1.9,.11,.58,wood,0,y,0);
  for(const xx of [-.88,.88]) box(g,.12,2,.58,dark,xx,1,0);
  const colors=[0xe6b84f,0x67b9a5,0xd96e63,0x8992d5,0xd2d9e2];
  for(let row=0;row<3;row++) for(let i=0;i<5;i++) box(g,.23,.27,.25,colors[(i+row)%colors.length],-.67+i*.33,.58+row*.7,.02);
  g.userData.empty=false; scene.add(g); shelves.push(g); return g;
}
function createPlant(x,z) { box(scene,.5,.55,.5,0x8b6849,x,.275,z); const leaf=new THREE.Mesh(new THREE.SphereGeometry(.57,9,8),new THREE.MeshStandardMaterial({color:0x478b63})); leaf.position.set(x,.9,z); leaf.castShadow=true; scene.add(leaf); }
function createPlayer() {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.78,4,8),new THREE.MeshStandardMaterial({color:0x287d75})); body.position.y=.83; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.26,12,10),new THREE.MeshStandardMaterial({color:0xe0b18d})); head.position.y=1.48; head.castShadow=true; g.add(head);
  g.position.set(0,0,7); scene.add(g); return g;
}
function createWorld() {
  scene=new THREE.Scene(); scene.background=new THREE.Color(0x9ab6c5); scene.fog=new THREE.Fog(0x9ab6c5,24,58);
  camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,100);
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene.add(new THREE.HemisphereLight(0xe7f5ff,0x68745c,1.9));
  const sun=new THREE.DirectionalLight(0xfff0d7,2.1); sun.position.set(-7,13,8); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(34,28),new THREE.MeshStandardMaterial({color:0xc6c9c4,roughness:.95})); floor.rotation.x=-Math.PI/2; floor.position.y=-.07; floor.receiveShadow=true; scene.add(floor);
  // Store perimeter, with a wide opening at the front as the entrance.
  box(scene,24,3,.35,0xe5e9e7,0,1.5,-10); box(scene,.35,3,20,0xe5e9e7,-12,1.5,0); box(scene,.35,3,20,0xe5e9e7,12,1.5,0);
  box(scene,8,3,.35,0xe5e9e7,-8,1.5,10); box(scene,8,3,.35,0xe5e9e7,8,1.5,10);
  // A separate warehouse room on the back-right side, with a doorway in its front wall.
  box(scene,7,.18,7,0x9baeb0,7,0,-5);
  box(scene,7,2.8,.28,0xb9c8c8,7,1.4,-8.5); box(scene,.28,2.8,7,0xb9c8c8,3.5,1.4,-5);
  box(scene,.28,2.8,7,0xb9c8c8,10.5,1.4,-5); box(scene,2.4,2.8,.28,0xb9c8c8,4.7,1.4,-1.5); box(scene,2.4,2.8,.28,0xb9c8c8,9.3,1.4,-1.5);
  // Warehouse storage crates.
  for(let i=0;i<3;i++){box(scene,1.15,1.05,1.05,0x8c7258,5+i*2,.53,-6.8);box(scene,1.15,1.05,1.05,0x9a805f,5+i*2,.53,-4.9);}
  // Checkout counter and shelves.
  box(scene,2.8,1,.8,0x426c69,-7,.5,6); box(scene,.65,.24,.5,0x263d42,-7,1.12,6);
  createShelf(-7,-2); createShelf(-3,-2); createShelf(1,-2); createShelf(-7,2);
  // Entrance pillars and path.
  box(scene,.22,3,.25,0x334d58,-4.1,1.5,10); box(scene,.22,3,.25,0x334d58,4.1,1.5,10); box(scene,12,.1,5,0xb5b8aa,0,-.01,13);
  for(const [x,z] of [[-10,8],[10,8],[-10,-8],[10,-8]]) createPlant(x,z);
  player=createPlayer(); spawnCustomer(); spawnCustomer();
}
function makeCustomer() {
  const g=new THREE.Group(), colors=[0x9c78b5,0xd17b5e,0x5e8fb8,0xc49a4d];
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.62,3,7),new THREE.MeshStandardMaterial({color:colors[Math.floor(Math.random()*colors.length)]})); body.position.y=.66; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshStandardMaterial({color:0xe0b18d})); head.position.y=1.22; g.add(head); return g;
}
function spawnCustomer() {
  if(customers.length>=5) return;
  const g=makeCustomer(); g.position.set((Math.random()-.5)*3,0,9.2);
  g.userData.phase='toShelf'; g.userData.target=new THREE.Vector3([-7,-3,1][Math.floor(Math.random()*3)],0,-2); g.userData.wait=0;
  scene.add(g); customers.push(g);
}
function finishCustomer(c) {
  state.customers++; state.money+=35; state.income+=35; if(state.stock>0) state.stock--;
  else { const shelf=shelves[Math.floor(Math.random()*shelves.length)]; if(shelf) shelf.userData.empty=true; }
  const idx=customers.indexOf(c); if(idx>=0) customers.splice(idx,1); scene.remove(c); updateUI();
}
function updateCustomers(dt) {
  for(const c of [...customers]) {
    const dir=c.userData.target.clone().sub(c.position); dir.y=0;
    if(dir.length()>.24) { dir.normalize(); c.position.addScaledVector(dir,dt*.9); c.rotation.y=Math.atan2(dir.x,dir.z); }
    else {
      c.userData.wait+=dt;
      if(c.userData.wait>1.6) {
        c.userData.wait=0;
        if(c.userData.phase==='toShelf') { c.userData.phase='toCheckout'; c.userData.target.set(-7,0,6); }
        else if(c.userData.phase==='toCheckout') { c.userData.phase='exit'; c.userData.target.set(0,0,12); }
        else finishCustomer(c);
      }
    }
  }
}
function restock() { if(state.money<100){toast(t().noMoney);return;} state.money-=100;state.stock+=20;shelves.forEach(s=>s.userData.empty=false);toast(t().restocked);updateUI(); }
function upgrade() { const cost=500*state.level;if(state.money<cost){toast(t().noMoney);return;}state.money-=cost;state.level++;state.stock+=10;createShelf(5,state.level%2?4:1);toast(t().upgraded);updateUI(); }
function hire() { if(state.money<300){toast(t().noMoney);return;}state.money-=300;state.employees++;toast(t().hired);updateUI(); }
function togglePause(force) { paused=typeof force==='boolean'?force:!paused; $('pause').classList.toggle('hidden',!paused); }
function setupControls() {
  addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Escape')togglePause();});
  addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  const canvas=$('world');
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.002,-.8,.15);lastX=e.clientX;lastY=e.clientY;});
  $('restockBtn').onclick=restock;$('upgradeBtn').onclick=upgrade;$('hireBtn').onclick=hire;$('saveBtn').onclick=saveGame;
  $('langBtn').onclick=()=>{state.language=state.language==='fa'?'en':'fa';updateUI();};$('pauseBtn').onclick=()=>togglePause();$('resumeBtn').onclick=()=>togglePause(false);
  addEventListener('beforeunload',()=>{const data={money:state.money,income:state.income,customers:state.customers,level:state.level,stock:state.stock,employees:state.employees,language:state.language};localStorage.setItem('shopRush2ErfanSave',JSON.stringify(data));});
}
function animate() {
  requestAnimationFrame(animate); const dt=Math.min(clock.getDelta(),.05); if(paused){renderer.render(scene,camera);return;}
  const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)), right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)), move=new THREE.Vector3();
  if(keys.w||keys.arrowup)move.add(forward);if(keys.s||keys.arrowdown)move.sub(forward);if(keys.d||keys.arrowright)move.add(right);if(keys.a||keys.arrowleft)move.sub(right);
  if(move.lengthSq()>0){move.normalize().multiplyScalar(5*dt);player.position.add(move);player.position.x=THREE.MathUtils.clamp(player.position.x,-10.8,10.8);player.position.z=THREE.MathUtils.clamp(player.position.z,-8.8,14.2);player.rotation.y=Math.atan2(move.x,move.z);}
  const offset=new THREE.Vector3(Math.sin(yaw)*8,4.8,Math.cos(yaw)*8);camera.position.lerp(player.position.clone().add(offset),.09);camera.lookAt(player.position.clone().add(new THREE.Vector3(-Math.sin(yaw)*2,1.05+pitch*2,-Math.cos(yaw)*2)));
  updateCustomers(dt); spawnClock+=dt;if(spawnClock>8&&customers.length<5){spawnClock=0;spawnCustomer();}
  renderer.render(scene,camera);
}
let spawnClock=0;
function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function start(){loadGame();createWorld();setupControls();clock=new THREE.Clock();updateUI();animate();addEventListener('resize',resize);setTimeout(()=>{$('intro').classList.add('hidden');$('game').classList.remove('hidden');resize();},3200);}
start();
