import './style.css';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id);
const state={money:1000,income:0,customers:0,level:1,stock:42,employees:0,language:'fa',sales:0,reputation:72,quality:'high'};
const words={
fa:{panel:'مدیریت فروشگاه',subtitle:'داشبورد زنده',money:'موجودی',customers:'مشتری‌های امروز',level:'مرحله',income:'درآمد امروز',stock:'موجودی انبار',empty:'قفسه‌های خالی',restock:'📦 شارژ قفسه‌ها',upgrade:'⬆️ مرحله بعد',hire:'👷 استخدام کارمند',save:'💾 ذخیره بازی',welcome:'به فروشگاه خوش آمدی، عرفان! فروشگاهت را گسترش بده.',noMoney:'موجودی کافی نیست!',restocked:'قفسه‌ها شارژ شدند.',upgraded:'مرحله جدید باز شد!',hired:'کارمند جدید استخدام شد.',saved:'بازی ذخیره شد.',pause:'بازی متوقف شد',pauseText:'فروشگاه منتظر مدیریت توست.',resume:'ادامه بازی',hint:'حرکت: WASD | چرخش دوربین: کشیدن ماوس',quality:'کیفیت گرافیک',settings:'تنظیمات گرافیک',goal:'هدف مرحله',reputation:'اعتبار',goalDone:'هدف مرحله تکمیل شد!'},
en:{panel:'Store management',subtitle:'Live dashboard',money:'Balance',customers:'Today customers',level:'Stage',income:"Today's income",stock:'Warehouse stock',empty:'Empty shelves',restock:'📦 Restock shelves',upgrade:'⬆️ Next stage',hire:'👷 Hire employee',save:'💾 Save game',welcome:'Welcome, Erfan! Grow your store.',noMoney:'Not enough money!',restocked:'Shelves restocked.',upgraded:'New stage unlocked!',hired:'Employee hired.',saved:'Game saved.',pause:'Game paused',pauseText:'Your store is waiting.',resume:'Resume',hint:'Move: WASD | Rotate: drag mouse',quality:'Graphics quality',settings:'Graphics settings',goal:'Stage goal',reputation:'Reputation',goalDone:'Stage goal completed!'}
};
const t=()=>words[state.language],fmt=n=>'$'+Math.floor(n).toLocaleString('en-US'),goal=()=>8+(state.level-1)*7;
const products=[['نان',8,0xd8a45d],['شیر',12,0xe7eee8],['آبمیوه',18,0xe58b45],['تنقلات',15,0xd9c05e],['قهوه',25,0x79523d],['میوه',10,0x79ae69],['شکلات',20,0x96614b],['ماکارونی',14,0xe6c77d]];
let scene,camera,renderer,composer,player,clock,customers=[],shelves=[],keys={},yaw=0,pitch=-.18,dragging=false,lastX=0,lastY=0,paused=false,spawnClock=0,toastTimer;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const material=(c,r=.75)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2200);}
function updateUI(){
 $('money').textContent=fmt(state.money);$('customers').textContent=state.customers.toLocaleString(state.language==='fa'?'fa-IR':'en-US');
 $('level').textContent=(state.language==='fa'?'مرحله ':'Stage ')+state.level;$('income').textContent=fmt(state.income);$('stock').textContent=state.stock;
 $('empty').textContent=shelves.filter(s=>s.userData.empty).length;
 $('panelTitle').textContent=t().panel;$('panelSubtitle').textContent=t().subtitle;
 ['moneyLabel','customersLabel','levelLabel','incomeLabel','stockLabel','emptyLabel'].forEach((id,i)=>$(id).textContent=[t().money,t().customers,t().level,t().income,t().stock,t().empty][i]);
 $('restockBtn').querySelector('span').textContent=t().restock;$('upgradeBtn').querySelector('span').textContent=t().upgrade;$('hireBtn').querySelector('span').textContent=t().hire;$('saveBtn').textContent=t().save;
 $('bottomTip').textContent=t().welcome;$('hint').textContent=t().hint;$('pauseTitle').textContent=t().pause;$('pauseText').textContent=t().pauseText;$('resumeBtn').textContent=t().resume;
 $('qualityLabel').textContent=t().quality;$('settingsTitle').textContent=t().settings;$('goalLabel').textContent=t().goal;$('reputationLabel').textContent=t().reputation;
 $('goalValue').textContent=state.sales+'/'+goal();$('reputationValue').textContent=Math.round(state.reputation)+'%';$('goalFill').style.width=Math.min(100,state.sales/goal()*100)+'%';$('qualitySelect').value=state.quality;
 document.documentElement.lang=state.language;document.documentElement.dir=state.language==='fa'?'rtl':'ltr';
}
function saveGame(){localStorage.setItem('shopRush2ErfanSave',JSON.stringify(state));toast(t().saved);}
function loadGame(){try{const d=localStorage.getItem('shopRush2ErfanSave');if(d)Object.assign(state,JSON.parse(d));}catch(e){console.warn(e);}}
function box(p,w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
function spriteLabel(text){
 const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');x.fillStyle='#193342';x.beginPath();x.roundRect(5,5,246,86,14);x.fill();x.strokeStyle='#f4d58d';x.lineWidth=4;x.stroke();x.fillStyle='#fff4d2';x.font='bold 38px Tahoma';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,49);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(.9,.34,1);return s;
}
function shelf(x,z,i){
 const g=new THREE.Group();g.position.set(x,0,z);
 for(const y of [.38,1.05,1.72]){box(g,2.05,.12,.72,0x76543c,0,y,0);box(g,2.05,.035,.75,0xc89b69,0,y+.08,0);}
 for(const xx of [-.96,.96])box(g,.13,2,.72,0x344b50,xx,1,0);
 for(let row=0;row<3;row++){const pr=products[(i*2+row)%products.length];for(let j=0;j<5;j++)box(g,.25,.3,.25,products[(i+row+j)%products.length][2],-.78+j*.38,.57+row*.67,.03);
 const tag=spriteLabel('$'+pr[1]);tag.position.set(.68,.58+row*.67,.43);tag.scale.set(.68,.27,1);g.add(tag);}
 const sign=spriteLabel('AISLE '+(i+1));sign.position.set(0,2.2,0);g.add(sign);
 g.userData={empty:false,productIndex:(i*2)%products.length};scene.add(g);shelves.push(g);
}
function character(shirt){
 const g=new THREE.Group(),skin=material(pick([0xf0c9a5,0xdca77f,0x9b694e,0xf3d8bc])),shirtM=material(shirt||pick([0x3b91a1,0x9a6cbd,0xd16d58,0x527d58,0xd1a24e,0x496a9a])),pants=material(pick([0x303b51,0x454c55,0x344b43])),hair=material(pick([0x282522,0x4a3024,0x9a7042]));
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.48,5,10),shirtM);torso.position.y=1.02;torso.castShadow=true;g.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.205,16,12),skin);head.position.y=1.62;g.add(head);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.215,14,9,0,Math.PI*2,0,Math.PI*.58),hair);cap.position.set(0,1.69,-.015);g.add(cap);
 for(const ex of [-.075,.075]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.023,8,6),material(0x252a30));eye.position.set(ex,1.635,.185);g.add(eye);}
 const limbs=[];
 for(const side of [-1,1]){
 const arm=new THREE.Group();arm.position.set(side*.29,1.22,0);const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.3,4,7),shirtM);sleeve.position.y=-.17;arm.add(sleeve);const hand=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),skin);hand.position.y=-.38;arm.add(hand);g.add(arm);limbs.push(arm);
 const leg=new THREE.Group();leg.position.set(side*.12,.58,0);const thigh=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.32,4,7),pants);thigh.position.y=-.16;leg.add(thigh);const shoe=new THREE.Mesh(new THREE.BoxGeometry(.16,.1,.28),material(0x252a31));shoe.position.set(0,-.36,.07);leg.add(shoe);g.add(leg);limbs.push(leg);}
 const bag=new THREE.Mesh(new THREE.BoxGeometry(.22,.25,.1),material(0x70513e));bag.position.set(.25,.93,-.12);g.add(bag);g.userData={limbs,walk:0};return g;
}
function plant(x,z){const pot=new THREE.Mesh(new THREE.CylinderGeometry(.27,.34,.55,12),material(0x9b6549));pot.position.set(x,.28,z);scene.add(pot);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,9,7),material(0x43865d));leaf.scale.set(.65,1.8,.55);leaf.position.set(x+Math.cos(i*Math.PI/3)*.18,.85,z+Math.sin(i*Math.PI/3)*.18);scene.add(leaf);}}
function postFX(){
 try{composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.32,.55,.82);composer.addPass(bloom);composer.addPass(new OutputPass());}catch(e){composer=null;console.warn(e);}quality();
}
function quality(){const d=state.quality==='high'?Math.min(devicePixelRatio,1.7):state.quality==='medium'?Math.min(devicePixelRatio,1.25):1;renderer.setPixelRatio(d);renderer.shadowMap.enabled=state.quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setSize(innerWidth,innerHeight);if(composer){composer.setPixelRatio(d);composer.setSize(innerWidth,innerHeight);const b=composer.passes.find(p=>p instanceof UnrealBloomPass);if(b)b.strength=state.quality==='high'?.32:state.quality==='medium'?.15:0;}}
function createWorld(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9bbbc7);scene.fog=new THREE.Fog(0x9bbbc7,28,65);camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,100);
 renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;
 scene.add(new THREE.HemisphereLight(0xe8f7ff,0x665747,1.65));const sun=new THREE.DirectionalLight(0xffe2b5,3);sun.position.set(-9,16,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);const fill=new THREE.DirectionalLight(0xa6d9ff,1);fill.position.set(10,8,-8);scene.add(fill);
 box(scene,26,.22,25,0xc6c9c0,0,-.18,1);for(let x=-12;x<=12;x+=2)box(scene,.018,.008,24,0xaeb8b4,x,-.06,1);for(let z=-10;z<=14;z+=2)box(scene,24,.008,.018,0xaeb8b4,0,-.06,z);
 box(scene,24,3,.4,0xe9eee9,0,1.5,-10);box(scene,.4,3,20,0xe9eee9,-12,1.5,0);box(scene,.4,3,20,0xe9eee9,12,1.5,0);box(scene,8,3,.4,0xe9eee9,-8,1.5,10);box(scene,8,3,.4,0xe9eee9,8,1.5,10);
 for(let x=-9;x<=9;x+=6){box(scene,.14,.18,19,0x9baeb0,x,2.9,0);const lamp=new THREE.Mesh(new THREE.BoxGeometry(3.2,.06,.55),new THREE.MeshBasicMaterial({color:0xfff1ce}));lamp.position.set(x,2.78,-1);scene.add(lamp);const l=new THREE.PointLight(0xffe8c7,22,10);l.position.set(x,2.45,-1);scene.add(l);}
 box(scene,7,.16,7,0x9baeb0,7,0,-5);box(scene,7,2.8,.3,0xb8c8c7,7,1.4,-8.5);box(scene,.3,2.8,7,0xb8c8c7,3.5,1.4,-5);box(scene,.3,2.8,7,0xb8c8c7,10.5,1.4,-5);
 for(let i=0;i<3;i++)box(scene,1.1,1,1,0x967553,5+i*2,.5,-6.8);
 box(scene,3,.95,.9,0x315f5d,-7,.48,6);box(scene,.8,.18,.62,0x253d43,-7,1.05,6);box(scene,.45,.3,.04,0x8fffe1,-7,1.35,6.42);
 shelves=[];shelf(-7,-2,0);shelf(-3,-2,1);shelf(1,-2,2);shelf(-7,2,3);box(scene,.22,3,.25,0x334d58,-4.1,1.5,10);box(scene,.22,3,.25,0x334d58,4.1,1.5,10);
 for(const p of [[-10,8],[10,8],[-10,-8],[10,-8]])plant(p[0],p[1]);
 player=character(0x168f7b);player.position.set(0,0,7);scene.add(player);customers=[];postFX();spawnCustomer();spawnCustomer();
}
function spawnCustomer(){
 if(customers.length>=7)return;const c=character();c.position.set(rnd(-2,2),0,9.2);scene.add(c);
 const pr=pick(products);c.userData.ai={phase:'enter',target:new THREE.Vector3(rnd(-2,2),0,3),wait:0,budget:rnd(24,95),preferred:pr[0],patience:rnd(12,20),chosen:null,bought:false,spent:0,speed:rnd(.85,1.2)};customers.push(c);
}
function nearestShelf(c){const a=shelves.filter(s=>!s.userData.empty);return a.sort((x,y)=>x.position.distanceToSquared(c.position)-y.position.distanceToSquared(c.position))[0]||null;}
function walk(c,dt){const a=c.userData.ai,d=a.target.clone().sub(c.position);d.y=0;if(d.length()>.22){d.normalize();c.position.addScaledVector(d,dt*a.speed);c.rotation.y=Math.atan2(d.x,d.z);c.userData.walk+=dt*9;c.userData.limbs.forEach((l,i)=>l.rotation.x=Math.sin(c.userData.walk+(i%2)*Math.PI)*.4);return false;}c.userData.limbs.forEach(l=>l.rotation.x*=.7);return true;}
function selectItem(c,s){const a=c.userData.ai,p=products[s.userData.productIndex];if(a.budget<p[1]){a.phase='exit';a.target.set(0,0,12);return;}if(state.stock<=0){s.userData.empty=true;a.phase='browse';a.chosen=nearestShelf(c);if(a.chosen)a.target.set(a.chosen.position.x,0,a.chosen.position.z+1);else{a.phase='exit';a.target.set(0,0,12);}state.reputation=Math.max(10,state.reputation-1);return;}a.spent=p[1];a.bought=true;state.stock--;a.phase='queue';a.target.set(-7,0,5.2);a.wait=0;}
function removeCustomer(c){const a=c.userData.ai;if(a.bought){state.customers++;state.sales++;state.money+=a.spent;state.income+=a.spent;state.reputation=Math.min(100,state.reputation+.4);}else state.reputation=Math.max(10,state.reputation-.5);scene.remove(c);customers.splice(customers.indexOf(c),1);updateUI();if(state.sales>=goal()&&state.level<8)toast(t().goalDone);}
function updateCustomers(dt){
 for(const c of [...customers]){const a=c.userData.ai;a.patience-=dt;if(a.patience<=0&&a.phase!=='exit'){a.phase='exit';a.target.set(0,0,12);state.reputation=Math.max(10,state.reputation-1);}
 if(!walk(c,dt))continue;a.wait+=dt;if(a.wait<(.5/(1+state.employees*.2)))continue;
 if(a.phase==='enter'){a.phase='browse';a.chosen=nearestShelf(c);if(a.chosen)a.target.set(a.chosen.position.x,0,a.chosen.position.z+1);else{a.phase='exit';a.target.set(0,0,12);}}
 else if(a.phase==='browse'){if(a.chosen&&a.chosen.userData.empty){const replacement=nearestShelf(c);if(replacement&&replacement!==a.chosen){a.chosen=replacement;a.target.set(replacement.position.x,0,replacement.position.z+1);a.wait=0;continue;}a.phase='exit';a.target.set(0,0,12);}else if(!a.chosen){a.phase='exit';a.target.set(0,0,12);}else{const p=products[a.chosen.userData.productIndex];if(p[0]===a.preferred||Math.random()>.35)selectItem(c,a.chosen);else{const next=shelves.find(s=>s!==a.chosen&&!s.userData.empty);if(next){a.chosen=next;a.target.set(next.position.x,0,next.position.z+1);a.wait=0;}else selectItem(c,a.chosen);}}}
 else if(a.phase==='queue'){a.phase='pay';a.target.set(-7,0,6.8);a.wait=0;}
 else if(a.phase==='pay'){a.phase='exit';a.target.set(0,0,12);a.wait=0;}
 else if(a.phase==='exit')removeCustomer(c);a.wait=0;
 }
}
function restock(){if(state.money<100){toast(t().noMoney);return;}state.money-=100;state.stock+=35;shelves.forEach(s=>s.userData.empty=false);updateUI();toast(t().restocked);}
function upgrade(){const cost=450*state.level;if(state.money<cost){toast(t().noMoney);return;}if(state.level>=8){toast('Maximum stage reached!');return;}state.money-=cost;state.level++;state.stock+=12;if(state.level%2===0)shelf(5,3,state.level);updateUI();toast(t().upgraded);}
function hire(){if(state.money<300){toast(t().noMoney);return;}state.money-=300;state.employees++;state.reputation=Math.min(100,state.reputation+2);updateUI();toast(t().hired);}
function setupControls(){
 addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Escape')togglePause();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
 const cv=$('world');cv.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointerup',()=>dragging=false);cv.addEventListener('pointercancel',()=>dragging=false);
 cv.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.002,-.7,.12);lastX=e.clientX;lastY=e.clientY;});
 $('restockBtn').onclick=restock;$('upgradeBtn').onclick=upgrade;$('hireBtn').onclick=hire;$('saveBtn').onclick=saveGame;$('langBtn').onclick=()=>{state.language=state.language==='fa'?'en':'fa';updateUI();};
 $('pauseBtn').onclick=()=>togglePause();$('resumeBtn').onclick=()=>togglePause(false);$('settingsBtn').onclick=()=>$('graphicsSettings').classList.toggle('hidden');
 $('qualitySelect').onchange=e=>{state.quality=e.target.value;quality();updateUI();toast('Graphics quality updated');};addEventListener('beforeunload',saveGame);
}
function togglePause(v){paused=typeof v==='boolean'?v:!paused;$('pause').classList.toggle('hidden',!paused);}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!paused){const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),m=new THREE.Vector3();if(keys.w||keys.arrowup)m.add(f);if(keys.s||keys.arrowdown)m.sub(f);if(keys.d||keys.arrowright)m.add(r);if(keys.a||keys.arrowleft)m.sub(r);if(m.lengthSq()){m.normalize().multiplyScalar(4.7*dt);player.position.add(m);player.position.x=THREE.MathUtils.clamp(player.position.x,-10.8,10.8);player.position.z=THREE.MathUtils.clamp(player.position.z,-8.8,14.2);player.rotation.y=Math.atan2(m.x,m.z);player.userData.walk+=dt*9;player.userData.limbs.forEach((l,i)=>l.rotation.x=Math.sin(player.userData.walk+(i%2)*Math.PI)*.4);}const off=new THREE.Vector3(Math.sin(yaw)*8,5.2,Math.cos(yaw)*8);camera.position.lerp(player.position.clone().add(off),.085);camera.lookAt(player.position.clone().add(new THREE.Vector3(-Math.sin(yaw)*2,1.1+pitch*2,-Math.cos(yaw)*2)));updateCustomers(dt);spawnClock+=dt;if(spawnClock>5.5&&customers.length<7){spawnClock=0;spawnCustomer();}}
 if(composer)composer.render();else renderer.render(scene,camera);}
function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(composer)composer.setSize(innerWidth,innerHeight);}
function start(){loadGame();createWorld();setupControls();clock=new THREE.Clock();updateUI();animate();addEventListener('resize',resize);setTimeout(()=>{$('intro').classList.add('hidden');$('game').classList.remove('hidden');resize();},2700);}
start();