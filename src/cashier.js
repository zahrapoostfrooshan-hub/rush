import './style.css';
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const money = n => Math.round(n).toLocaleString('fa-IR') + ' تومان';
const catalog = [
 {name:'نان تست',price:38000,color:0xc78c4d,shape:'box'},
 {name:'شیر کم‌چرب',price:46000,color:0xe9eee8,shape:'bottle'},
 {name:'آب پرتقال',price:59000,color:0xe98a27,shape:'bottle'},
 {name:'ماکارونی',price:42000,color:0xe0b85c,shape:'box'},
 {name:'شکلات تلخ',price:67000,color:0x68412d,shape:'box'},
 {name:'سیب قرمز',price:18000,color:0xb83d32,shape:'ball'},
 {name:'قهوه',price:128000,color:0x684632,shape:'box'},
 {name:'چیپس',price:49000,color:0xe3c345,shape:'bag'},
 {name:'پنیر',price:76000,color:0xe6d9a0,shape:'box'},
 {name:'آب معدنی',price:22000,color:0x80c7e6,shape:'bottle'},
 {name:'بیسکویت',price:53000,color:0xb98a53,shape:'box'}
];

let scene,camera,renderer,clock,monitorTexture,monitorCanvas,monitorCtx;
let customer,customerHead,customerArmLeft,customerArmRight,scanner,scannerBeam,handScanner,handLeft,handRight,productsOnBelt=[],beltRollers=[],cashDrawer,cardProp,cashProp;
let actionBusy=false,cardStage='idle',pinDigits='',cardDisplay,handLaser;
let order=[],scanned=[],itemIndex=0,total=0,customerNumber=1,score=100;
let phase='pickup',scannerTaken=false,scannerFault=false,failedScans=0,manualDigits='';
let payment='cash',cashOffer=0,cashInput='',changeDue=0,changePaid=0,drawerBalance=650000;
let promptTitle='',promptText='',toastTimer=0,keysDown={},calcDisplay='0',calcAccumulator=null,calcOperator=null,calcFresh=true;

function material(color,roughness=.72,metalness=0){return color && color.isMaterial ? color : new THREE.MeshStandardMaterial({color,roughness,metalness});}

function makePackageTexture(title,base,accent){
 const cv=document.createElement('canvas');cv.width=512;cv.height=512;const g=cv.getContext('2d');
 const grad=g.createLinearGradient(0,0,512,512);grad.addColorStop(0,base);grad.addColorStop(1,'#17252d');g.fillStyle=grad;g.fillRect(0,0,512,512);
 g.fillStyle=accent;g.beginPath();g.moveTo(0,340);g.lineTo(512,245);g.lineTo(512,512);g.lineTo(0,512);g.fill();
 g.fillStyle='rgba(255,255,255,.14)';g.fillRect(28,26,456,7);
 g.fillStyle='#fff';g.font='bold 46px Tahoma';g.textAlign='center';g.fillText(title,256,180);
 g.font='bold 18px Arial';g.fillText('ERFAN MARKET  •  PREMIUM',256,220);
 g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(256,370,76,0,Math.PI*2);g.fill();
 g.fillStyle=accent;g.font='bold 34px Tahoma';g.fillText(title.slice(0,8),256,382);
 g.fillStyle='#fff';g.font='16px Arial';g.fillText('FRESH  •  QUALITY  •  DAILY',256,478);
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
}
function detailedMaterial(title,color,accent,rough=.38){
 return new THREE.MeshStandardMaterial({map:makePackageTexture(title,color,accent),roughness:rough,metalness:.02});
}
function addFloorDetails(){
 const grout=material(0x858e8b,.92);
 for(let x=-11;x<=11;x+=1.5)cube(scene,.012,.006,26,0x8e9996,x,-.005,-5,.95);
 for(let z=-17;z<=6;z+=1.5)cube(scene,23,.006,.012,0x8e9996,0,-.005,z,.95);
 const gloss=new THREE.Mesh(new THREE.PlaneGeometry(24,26),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.22,metalness:.03,clearcoat:.5,clearcoatRoughness:.2}));
 gloss.rotation.x=-Math.PI/2;gloss.position.set(0,.002,-5);scene.add(gloss);
}
function addShelfStock(x,z,row){
 const colors=[['#d54f35','#f1c45b'],['#397d99','#e6d8a7'],['#71934b','#e9d8a0'],['#9a5c9d','#e4b95b'],['#d08a38','#f5e6c4']];
 for(let level=0;level<4;level++){
  for(let n=0;n<7;n++){
   const [base,accent]=colors[(n+level+row)%colors.length];
   const w=.19+(n%3)*.025,h=.25+(n%2)*.045;
   const pkg=cube(scene,w,h,.19,0xffffff,x-.48+n*.16,level*.57+.47,z-.13,.4);
   pkg.material=detailedMaterial(['SNACKS','FRESH','DAILY','CHOCO','FOOD'][(n+level)%5],base,accent,.48);
   const band=cube(scene,w*.85,.025,.012,0xf1e8d0,pkg.position.x,pkg.position.y-.035,z-.025,.65);
  }
 }
}
function addCeilingFixtures(){
 for(let x=-7.5;x<=7.5;x+=3){
  for(let z=-3;z>=-12;z-=4){
   const panel=mesh(scene,new THREE.BoxGeometry(2.1,.055,.72),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xd8efff,emissiveIntensity:1.4,roughness:.25}),x,4.82,z);
   const glow=new THREE.PointLight(0xfff1d9,26,8,1.7);glow.position.set(x,4.5,z);scene.add(glow);
  }
 }
}
function addCounterDetails(){
 // brushed stainless edges and inset conveyor rails
 const steel=material(0x9aa9aa,.24,.72),dark=material(0x18252a,.32,.55);
 for(const x of [-.52,2.22]){
  const rail=cube(scene,.07,.12,1.45,0x9aa9aa,x,1.22,-.75,.22);rail.material=steel;
 }
 cube(scene,2.58,.035,.035,0xb8c5c4,.85,1.22,-1.43,.2);
 cube(scene,2.58,.035,.035,0x718181,.85,1.22,-.07,.3);
 for(let i=0;i<8;i++){
  const slat=cube(scene,.012,.008,1.1,0x879392,-.35+i*.34,1.187,-.75,.45);
 }
 // card reader with tactile buttons
 for(let r=0;r<3;r++)for(let col=0;col<3;col++){
  const key=cube(scene,.055,.018,.055,[0x9aa8ad,0x3e6570,0x9aa8ad][(r+col)%3],1.86+col*.12,1.39,-.19+r*.08,.32);
 }
}

function mesh(parent,geometry,mat,x,y,z){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cube(parent,w,h,d,color,x,y,z,rough=.65){return mesh(parent,new THREE.BoxGeometry(w,h,d),material(color,rough),x,y,z);}
function sphere(parent,r,color,x,y,z,detail=24){return mesh(parent,new THREE.SphereGeometry(r,detail,detail),material(color),x,y,z);}
function capsule(parent,r,len,color,x,y,z){return mesh(parent,new THREE.CapsuleGeometry(r,len,8,16),material(color),x,y,z);}
function roundedLabel(text,color='#102b35'){
 const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
 x.fillStyle=color;x.beginPath();x.roundRect(5,5,502,118,20);x.fill();
 x.strokeStyle='#b8f3dd';x.lineWidth=4;x.stroke();
 x.fillStyle='#fff';x.font='bold 42px Tahoma';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,65);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));s.scale.set(1.3,.32,1);return s;
}
function setPrompt(title,text){promptTitle=title;promptText=text;$('guideTitle').textContent=title;$('guideText').textContent=text;let k='E';if(title.includes('اسکن'))k='F';if(title.includes('کارت'))k='C';if(title.includes('نقد'))k='0-9';if(title.includes('دستی'))k='0-9 + Enter';if(title.includes('باقی پول'))k='1 تا 7';if(title.includes('تکمیل'))k='Space';$('guideKey').textContent=k;}
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100);}
function easeInOut(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function tweenObject(obj,target,duration=420){return new Promise(resolve=>{const start=performance.now(),from={x:obj.position.x,y:obj.position.y,z:obj.position.z,rx:obj.rotation.x,ry:obj.rotation.y,rz:obj.rotation.z},to={x:target.x??from.x,y:target.y??from.y,z:target.z??from.z,rx:target.rx??from.rx,ry:target.ry??from.ry,rz:target.rz??from.rz};const tick=now=>{const t=Math.min(1,(now-start)/duration),e=easeInOut(t);obj.position.set(from.x+(to.x-from.x)*e,from.y+(to.y-from.y)*e,from.z+(to.z-from.z)*e);obj.rotation.set(from.rx+(to.rx-from.rx)*e,from.ry+(to.ry-from.ry)*e,from.rz+(to.rz-from.rz)*e);if(t<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});}
function makeCard(){const g=new THREE.Group();cube(g,.34,.012,.22,0xe7e5d8,0,0,0,.3);cube(g,.075,.008,.055,0xb5a46b,-.105,.01,-.055,.4);for(let i=0;i<4;i++)cube(g,.012,.003,.11,0x263d4c,.055+i*.025,.009,.025,.4);return g;}
function makeCashBundle(){const g=new THREE.Group();for(let i=0;i<4;i++){const b=cube(g,.28,.012,.13,[0x77a884,0x9abd91][i%2],0,i*.014,0,.8);b.rotation.y=(i-1.5)*.025;}cube(g,.035,.055,.14,0xe7d8a1,.02,.035,0,.8);return g;}
async function reachHand(hand){const rest={x:hand.position.x,y:hand.position.y,z:hand.position.z,rx:hand.rotation.x,ry:hand.rotation.y,rz:hand.rotation.z};await tweenObject(hand,{x:.22,y:-.25,z:-.58,rx:-.55,ry:.12,rz:.22},260);await tweenObject(hand,rest,260);}
function drawMonitor(){
 if(!monitorCtx)return;
 const c=monitorCanvas,x=monitorCtx;x.clearRect(0,0,c.width,c.height);
 const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#142f40');g.addColorStop(1,'#071720');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.direction='rtl';x.textAlign='right';x.fillStyle='#83e6c0';x.font='bold 28px Tahoma';x.fillText('ERFAN MARKET  |  صندوق فروش',c.width-28,38);
 x.fillStyle='#7f9dab';x.font='16px Tahoma';x.fillText('صندوق شماره ۰۱  •  سیستم فروش فعال',c.width-28,65);
 x.strokeStyle='#36596a';x.lineWidth=2;x.beginPath();x.moveTo(24,78);x.lineTo(c.width-24,78);x.stroke();
 // Full live receipt, including products that have not been scanned yet.
 x.fillStyle='#9ab5c4';x.font='bold 21px Tahoma';x.fillText('فاکتور جاری',c.width-28,111);
 x.fillStyle='#9ab5c4';x.font='bold 16px Tahoma';x.fillText('نام کالا',c.width-30,145);
 x.textAlign='left';x.fillText('قیمت',c.width-280,145);x.fillText('وضعیت',c.width-125,145);
 const visible=order.slice(0,8);let y=181;
 visible.forEach((p,i)=>{
  const done=i<scanned.length;
  if(i%2===0){x.fillStyle='rgba(110,160,180,.09)';x.fillRect(22,y-24,c.width-44,34);}
  x.direction='rtl';x.textAlign='right';x.fillStyle=done?'#eef7f6':'#c2d1d8';x.font='18px Tahoma';x.fillText(p.name,c.width-30,y);
  x.direction='ltr';x.textAlign='left';x.fillStyle='#9be8c8';x.fillText(p.price.toLocaleString('fa-IR'),c.width-280,y);
  x.direction='rtl';x.textAlign='right';x.fillStyle=done?'#7ef0b8':'#e7c77d';x.font='15px Tahoma';x.fillText(done?'ثبت شد':i===itemIndex?'در انتظار اسکن':'در صف',c.width-30,y);
  y+=36;
 });
 if(order.length===0){x.textAlign='center';x.fillStyle='#708b9b';x.font='18px Tahoma';x.fillText('در انتظار سفارش مشتری...',c.width*.68,205);}
 // Calculator is drawn as part of the physical monitor, not as an overlay.
 const px=28,py=96,pw=315,ph=350;
 x.direction='rtl';x.fillStyle='#1b3543';x.beginPath();x.roundRect(px,py,pw,ph,16);x.fill();
 x.fillStyle='#0a1a24';x.beginPath();x.roundRect(px+14,py+16,pw-28,64,9);x.fill();
 x.direction='ltr';x.textAlign='right';x.fillStyle='#9bf0c7';x.font='bold 27px Tahoma';x.fillText(String(calcDisplay||'0').slice(-18),px+pw-26,py+59);
 const keys=[['7','8','9','÷'],['4','5','6','×'],['1','2','3','−'],['C','0','=','+']],kw=63,kh=51,gap=8;
 keys.forEach((row,ri)=>row.forEach((k,ci)=>{const bx=px+15+ci*(kw+gap),by=py+94+ri*(kh+gap);x.fillStyle=['÷','×','−','+','='].includes(k)?'#236653':k==='C'?'#8c463f':'#294858';x.beginPath();x.roundRect(bx,by,kw,kh,9);x.fill();x.fillStyle='#f4fbf8';x.font='bold 22px Arial';x.textAlign='center';x.fillText(k,bx+kw/2,by+33);}));
 x.direction='rtl';x.textAlign='right';x.fillStyle='#b9ded0';x.font='bold 18px Tahoma';x.fillText('مبلغ کل',c.width-30,c.height-67);
 x.direction='ltr';x.textAlign='left';x.fillStyle='#8cf0c3';x.font='bold 25px Tahoma';x.fillText(total.toLocaleString('fa-IR')+' تومان',c.width-260,c.height-67);
 x.fillStyle='#183c3c';x.fillRect(c.width-360,c.height-48,330,28);
 x.direction='rtl';x.textAlign='right';x.fillStyle='#9ac8b5';x.font='14px Tahoma';x.fillText(phase==='payment'&&payment==='cash'?'نقد دریافتی: '+(cashInput||'۰'):phase==='manual'?'قیمت دستی: '+(manualDigits||'۰'):phase==='payment'&&payment==='card'?'وضعیت کارت: '+(cardStage==='pin'?'ورود رمز':cardStage==='swipe'?'کشیدن کارت':'دریافت کارت'):'ماشین حساب صندوق',c.width-38,c.height-28);
 monitorTexture.needsUpdate=true;
}
function buildMonitor(){
 monitorCanvas=document.createElement('canvas');monitorCanvas.width=900;monitorCanvas.height=520;monitorCtx=monitorCanvas.getContext('2d');
 monitorTexture=new THREE.CanvasTexture(monitorCanvas);monitorTexture.colorSpace=THREE.SRGBColorSpace;
 const frame=cube(scene,1.75,1.12,.16,0x111b22,-1.05,1.55,.22,.28);
 const bezel=cube(scene,1.66,1.03,.025,0x344650,-1.05,1.56,.315,.25);
 const screen=mesh(scene,new THREE.PlaneGeometry(1.48,.85),new THREE.MeshBasicMaterial({map:monitorTexture, toneMapped:false}),-1.05,1.56,.337);
 cube(scene,.13,.32,.16,0x293c45,-1.05,1.0,.27);
 const neck=cube(scene,.42,.08,.28,0x56666a,-1.05,1.01,.35,.3);
 const base=cube(scene,.82,.055,.45,0x26343a,-1.05,.83,.42,.25);
 cube(scene,1.1,.07,.52,0x253941,-1.05,.82,.4);
 for(let r=0;r<3;r++)for(let col=0;col<9;col++)cube(scene,.075,.018,.055,0x71858b,-1.45+col*.1,.87+r*.01,.25+r*.07,.5);
 drawMonitor();
}
function buildScanner(){
 const g=new THREE.Group();
 cube(g,.13,.22,.45,0x202d35,0,0,0,.35);
 cube(g,.11,.22,.12,0x293e48,0,-.15,.1,.3);
 const lens=mesh(g,new THREE.BoxGeometry(.1,.018,.12),new THREE.MeshBasicMaterial({color:0x5cf4c3,emissive:0x2bb98a}),0,.11,-.12);
 g.position.set(.8,1.02,.45);g.rotation.x=-.2;scene.add(g);scanner=g;
 const beam=new THREE.Mesh(new THREE.PlaneGeometry(.45,.018),new THREE.MeshBasicMaterial({color:0x68ffd0,transparent:true,opacity:.85,side:THREE.DoubleSide}));beam.position.set(.8,1.12,-.25);beam.visible=false;scene.add(beam);scannerBeam=beam;
}
function buildHands(){
 const skin=material(0xc78f70,.82),sleeve=material(0x263e55,.88);
 handLeft=new THREE.Group();handRight=new THREE.Group();
 capsule(handLeft,.105,.38,0x263e55,0,-.2,0);
 sphere(handLeft,.12,0xc78f70,0,-.43,-.02);\n for(let f=0;f<4;f++){const finger=capsule(handLeft,.025,.09,0xc78f70,-.075+f*.05,-.49,.075);finger.rotation.x=-.25;}\n const leftThumb=capsule(handLeft,.03,.09,0xc78f70,-.13,-.43,.02);leftThumb.rotation.z=-.7;
 handLeft.position.set(-.48,-.48,-.9);camera.add(handLeft);
 capsule(handRight,.105,.38,0x263e55,0,-.2,0);
 sphere(handRight,.12,0xc78f70,0,-.43,-.02);\n for(let f=0;f<4;f++){const finger=capsule(handRight,.025,.09,0xc78f70,-.075+f*.05,-.49,.075);finger.rotation.x=-.25;}\n const rightThumb=capsule(handRight,.03,.09,0xc78f70,-.13,-.43,.02);rightThumb.rotation.z=-.7;
 handRight.position.set(.48,-.48,-.9);camera.add(handRight);
 handScanner=new THREE.Group();
 cube(handScanner,.12,.2,.35,0x202d35,0,0,0,.3);
 cube(handScanner,.1,.12,.1,0x2d414b,0,-.13,.08,.3);
 const glass=mesh(handScanner,new THREE.BoxGeometry(.09,.015,.09),new THREE.MeshBasicMaterial({color:0x5fffc6,emissive:0x27bd8b}),0,.105,-.1);
 handScanner.position.set(.58,-.82,-.62);handScanner.rotation.set(-.35,.15,-.35);handScanner.visible=false;camera.add(handScanner);\n const laser=new THREE.Mesh(new THREE.PlaneGeometry(.28,.012),new THREE.MeshBasicMaterial({color:0x5dffc7,transparent:true,opacity:.9,side:THREE.DoubleSide}));laser.position.set(0,.12,-.28);laser.visible=false;handScanner.add(laser);handLaser=laser;
}
function makeCustomer(){
 if(customer)scene.remove(customer);
 customer=new THREE.Group();scene.add(customer);
 const shirtColors=[0x496d7b,0x925c4b,0x625b83,0x526c50,0x927248];
 const skinColors=[0xd9a184,0xb97858,0xe5bea0,0x98694e];
 const hairColors=[0x30251f,0x4c3427,0x211e1c,0x6c4b35];
 const shirt=new THREE.MeshStandardMaterial({color:shirtColors[customerNumber%5],roughness:.82});
 const skin=new THREE.MeshStandardMaterial({color:skinColors[customerNumber%4],roughness:.88});
 const hair=new THREE.MeshStandardMaterial({color:hairColors[customerNumber%4],roughness:.92});
 const pants=material(0x303d49,.9),shoe=material(0x1d252b,.5);
 // torso, jacket seams and neck
 const torso=capsule(customer,.34,.55,shirt,0,1.43,-2.4);
 const collar=mesh(customer,new THREE.ConeGeometry(.16,.18,4),material(0xe4e7df),0,1.77,-2.17);collar.rotation.y=Math.PI/4;
 cube(customer,.012,.48,.012,0x263e48,-.16,1.42,-2.055,.9);
 // shoulder and articulated arms, facing the cashier
 customerArmLeft=new THREE.Group();customerArmRight=new THREE.Group();
 customerArmLeft.position.set(-.34,1.67,-2.4);customerArmRight.position.set(.34,1.67,-2.4);
 capsule(customerArmLeft,.105,.42,shirt,0,-.25,0);
 sphere(customerArmLeft,.105,skin,0,-.52,.04);
 capsule(customerArmRight,.105,.42,shirt,0,-.25,0);
 sphere(customerArmRight,.105,skin,0,-.52,.04);
 customer.add(customerArmLeft,customerArmRight);
 // trousers, knees and shoes
 for(const side of [-1,1]){
  capsule(customer,.105,.48,pants,side*.15,.72,-2.4);
  sphere(customer,.11,shoe,side*.15,.37,-2.29);
  cube(customer,.035,.035,.025,0x66727a,side*.15,.73,-2.285,.9);
 }
 // neck and shaped head
 capsule(customer,.09,.16,skin,0,1.83,-2.4);
 sphere(customer,.255,skin,0,2.12,-2.4,32);
 // ears with inner ear shading
 for(const side of [-1,1]){
  sphere(customer,.061,skin,side*.245,2.12,-2.39,20);
  sphere(customer,.026,0x98644f,side*.27,2.12,-2.345,16);
  // eye whites, irises and pupils
  sphere(customer,.055,0xf2eee6,side*.09,2.16,-2.174,20);
  sphere(customer,.027,0x66503b,side*.09,2.16,-2.124,16);
  sphere(customer,.013,0x151a1b,side*.09,2.16,-2.099,12);
  sphere(customer,.008,0xffffff,side*.08,2.177,-2.086,8);
  const brow=capsule(customer,.018,.09,hair,side*.09,2.225,-2.19);
  brow.rotation.z=side*.08;
 }
 // nose bridge and nostrils
 const nose=mesh(customer,new THREE.SphereGeometry(.045,16,12),skin,0,2.075,-2.155);nose.scale.set(.72,1.2,.8);
 sphere(customer,.012,0x80513f,-.018,2.045,-2.17,10);sphere(customer,.012,0x80513f,.018,2.045,-2.17,10);
 // lips and chin
 capsule(customer,.014,.065,material(0x8e514d),0,1.985,-2.165);
 sphere(customer,.075,skin,0,1.94,-2.34,18);
 // hair cap, fringe and sideburns
 const cap=mesh(customer,new THREE.SphereGeometry(.263,32,20,0,Math.PI*2,0,Math.PI*.56),hair,0,2.23,-2.415);
 for(let i=0;i<5;i++){
  const lock=sphere(customer,.055,hair,-.18+i*.09,2.31+Math.sin(i*.7)*.015,-2.205,14);
  lock.scale.set(1.25,.7,.75);
 }
 capsule(customer,.052,.2,hair,-.235,2.13,-2.42);
 capsule(customer,.052,.2,hair,.235,2.13,-2.42);
 // subtle clothing details
 for(let side of [-1,1]){
  const seam=cube(customer,.012,.35,.012,0x9aa9a3,side*.25,1.42,-2.07,.9);
  seam.material.transparent=true;seam.material.opacity=.3;
 }
 customer.position.y=0;
}
function buildStore(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ab4c0);scene.fog=new THREE.Fog(0x9ab4c0,17,34);
 camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,55);camera.position.set(0,1.68,4.2);camera.lookAt(0,1.58,-2.8);
 renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 scene.add(new THREE.HemisphereLight(0xeaf7ff,0x5a4537,2.15));
 const key=new THREE.DirectionalLight(0xffe5c7,3.6);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.bias=-.00025;scene.add(key);
 const fill=new THREE.PointLight(0x9ddcff,35,16);fill.position.set(4,3,-4);scene.add(fill);
 cube(scene,24,.18,30,0xb8b9b1,0,-.1,-5,.95);
 cube(scene,24,5,.25,0xe3e4dd,0,2.45,-13,.95);
 cube(scene,24,.25,30,0xddd8cc,0,5,-5,.95);
 addFloorDetails();
 // distant aisles and stocked shelves
 for(const side of [-1,1]){
  for(let row=0;row<2;row++){
   const z=-5-row*3.2,x=side*5.2;
   cube(scene,1.15,2.6,.55,0x344b50,x,1.3,z,.8);
   for(let level=0;level<4;level++){
    cube(scene,1.2,.045,.62,0x9caa9e,x,level*.57+.28,z+.02,.8);
    for(let n=0;n<4;n++){
     const colors=[0xc16a45,0xd9bd68,0x78a7a0,0x7d8fb4,0xb1b6a4];
     cube(scene,.18,.28,.22,colors[(n+level+row)%colors.length],x-.42+n*.28,level*.57+.45,z-.02,.65);
    }
   }
  }
 }
 // windows and ceiling lights
 for(let x=-8;x<=8;x+=4){const pane=mesh(scene,new THREE.PlaneGeometry(3.1,2.0),new THREE.MeshPhysicalMaterial({color:0x8cc9df,transparent:true,opacity:.42,roughness:.25}),x,3.0,-12.84);cube(scene,3.2,.05,.08,0x7b9296,x,4.03,-12.75);}
 addCeilingFixtures();
 const sign=roundedLabel('ERFAN MARKET');sign.position.set(0,4.05,-12.65);sign.scale.set(3.4,.82,1);scene.add(sign);
 // cashier counter in immediate foreground
 cube(scene,4.9,.85,1.0,0x394c4e,0,.48,.45,.5);
 cube(scene,4.9,.09,1.08,0x202c32,0,.95,.45,.35);
 // conveyor and rubber belt
 cube(scene,2.65,.16,1.35,0x252e32,.85,1.07,-.75,.4);
 cube(scene,2.48,.025,1.19,0x505b5d,.85,1.17,-.75,.65);
 beltRollers=[];for(let x=-.32;x<=2.02;x+=.22){const roller=mesh(scene,new THREE.CylinderGeometry(.035,.035,1.17,16),material(0x98a5a4,.32,.45),x,1.16,-.75);roller.rotation.x=Math.PI/2;beltRollers.push(roller);}
 // scanner base and terminal
 cube(scene,.52,.14,.52,0x202b32,2.05,1.1,.15,.3);
 cube(scene,.32,.025,.34,0x6bf0c1,2.05,1.19,.15,.22);
 cube(scene,.55,.18,.5,0x25363e,2.0,1.05,-.05,.4);
 cube(scene,.45,.28,.06,0x152a34,2.0,1.27,-.22,.3);
 cardDisplay=mesh(scene,new THREE.PlaneGeometry(.35,.19),new THREE.MeshBasicMaterial({color:0x5fe0ae}),2,1.28,-.184);
 // cash drawer and note slots
 cashDrawer=new THREE.Group();cashDrawer.position.set(-1.9,.96,.85);scene.add(cashDrawer);
 cube(cashDrawer,1.25,.16,.75,0x202b31,0,0,0,.35);cube(cashDrawer,1.18,.045,.68,0x111b20,0,.095,0,.45);
 for(let i=0;i<5;i++){const bill=cube(cashDrawer,.19,.012,.46,[0x6a9b78,0x8caa83,0x547c68][i%3],-.43+i*.215,.125,0,.85);bill.rotation.y=(i%2)*.035;}
 addCounterDetails();buildMonitor();buildScanner();buildHands();makeCustomer();
}
function createProduct(p,i){
 const g=new THREE.Group();let body;
 const palette={
  'نان تست':['#c58b4e','#f4d8a1'],'شیر کم‌چرب':['#dce9ee','#5593b7'],'آب پرتقال':['#e98a27','#f8d35c'],
  'ماکارونی':['#d7a64e','#f5e7b9'],'شکلات تلخ':['#49312c','#c69b6a'],'سیب قرمز':['#9f2929','#e9b36c'],
  'قهوه':['#493329','#cba46b'],'چیپس':['#d2aa35','#e8e0a0'],'پنیر':['#e5d8a0','#b99042'],'آب معدنی':['#76b9d8','#e4f5f8'],'بیسکویت':['#a97748','#e9d1a0']
 };
 const [base,accent]=palette[p.name]||['#698b85','#d7d9bd'];
 const pack=detailedMaterial(p.name,base,accent,.4);
 const side=material(p.color,.42);
 if(p.shape==='bottle'){
  const bodyGeo=new THREE.CylinderGeometry(.13,.17,.5,32,1);
  body=mesh(g,bodyGeo,pack,0,.29,0);
  const shoulder=mesh(g,new THREE.CylinderGeometry(.07,.13,.12,32),side,0,.6,0);
  mesh(g,new THREE.CylinderGeometry(.055,.055,.13,24),material(0xf0eee4,.32),0,.72,0);
  mesh(g,new THREE.CylinderGeometry(.063,.063,.045,24),material(0x2e8b68,.28),0,.81,0);
  const wrap=mesh(g,new THREE.CylinderGeometry(.132,.132,.22,32,1,true),new THREE.MeshStandardMaterial({map:makePackageTexture(p.name,base,accent),roughness:.48,side:THREE.DoubleSide}),0,.31,0);
 }else if(p.shape==='ball'){
  body=sphere(g,.205,p.color,0,.21,0,32);
  const shine=sphere(g,.055,0xffffff,-.07,.31,.13,12);shine.material.transparent=true;shine.material.opacity=.2;
 }else if(p.shape==='bag'){
  body=mesh(g,new THREE.BoxGeometry(.34,.48,.18),pack,0,.25,0);
  body.rotation.z=-.035;
  const top=cube(g,.33,.045,.19,0xf2e7bd,0,.5,0,.42);
 }else{
  body=mesh(g,new THREE.BoxGeometry(.37,.39,.29),pack,0,.22,0);
  const top=mesh(g,new THREE.BoxGeometry(.35,.018,.27),material(0xf0e5cb,.5),0,.42,0);
  const seam=cube(g,.012,.34,.012,0xf3e7c8,.187,.22,.15,.65);
 }
 // small barcode strip and shelf-ready edge details
 const barcode=cube(g,.075,.095,.009,0xf5f3e8,.08,.16,.151,.9);
 for(let k=0;k<6;k++)cube(g,.004,.06,.002,0x252525,.052+k*.01,.16,.157,.9);
 const tag=roundedLabel(p.name+'  |  '+p.price.toLocaleString('fa-IR')+' تومان');
 tag.position.set(0,1.02,0);tag.scale.set(1.34,.34,1);g.add(tag);
 g.position.set(-.2+(i%3)*.78,1.2,-.65-(i%2)*.04);g.rotation.y=(i%2)*.18;scene.add(g);productsOnBelt.push(g);
}
function clearBelt(){productsOnBelt.forEach(p=>scene.remove(p));productsOnBelt=[];}
function updateHud(){
 $('customerNo').textContent=customerNumber.toLocaleString('fa-IR');
 $('score').textContent=score.toLocaleString('fa-IR')+'٪';
 $('hudItems').innerHTML=order.map((p,i)=>'<div class="hud-row '+(i<itemIndex?'done':'')+'"><span>'+p.name+'</span><b>'+money(p.price)+'</b></div>').join('');
 $('hudTotal').textContent=money(total);
 $('hudScanned').textContent=itemIndex.toLocaleString('fa-IR')+' / '+order.length.toLocaleString('fa-IR');
 $('monitorState').textContent=phase==='scan'?'در حال ثبت کالا':phase==='payment'?'در انتظار پرداخت':phase==='change'?'تحویل باقی پول':phase==='done'?'خرید تکمیل شد':'آماده شروع';
 drawMonitor();
}
function newOrder(){
 order=[];scanned=[];itemIndex=0;total=0;scannerTaken=false;scannerFault=false;failedScans=0;manualDigits='';cashInput='';changeDue=0;changePaid=0;if(handScanner){handScanner.visible=false;handScanner.position.set(.58,-.82,-.62);handScanner.rotation.set(-.35,.15,-.35);}if(handLeft)handLeft.visible=true;if(handRight)handRight.visible=true;actionBusy=false;cardStage='idle';pinDigits='';if(cashDrawer)cashDrawer.position.z=.85;
 const count=3+Math.floor(Math.random()*3);for(let i=0;i<count;i++)order.push(catalog[Math.floor(Math.random()*catalog.length)]);
 payment=Math.random()<.5?'cash':'card';cashOffer=0;
 if(payment==='cash'){const orderTotal=order.reduce((sum,p)=>sum+p.price,0);const extra=[0,20000,50000,100000,150000][Math.floor(Math.random()*5)];cashOffer=Math.ceil((orderTotal+extra)/10000)*10000;}
 clearBelt();order.forEach(createProduct);
 phase='pickup';setPrompt('۱. بارکدخوان را بردار','برای برداشتن بارکدخوان کلید E را فشار بده.');updateHud();
 $('paymentHint').textContent='روش پرداخت در پایان خرید مشخص می‌شود.';
}
async function takeScanner(){
 if(phase!=='pickup'||actionBusy)return;actionBusy=true;handRight.visible=true;handScanner.visible=true;handScanner.position.set(.58,-.82,-.62);handScanner.rotation.set(-.35,.15,-.35);
 await tweenObject(handScanner,{x:.48,y:-.42,z:-.82,rx:-.15,ry:0,rz:0},520);await tweenObject(handRight,{x:.42,y:-.42,z:-.86,rx:-.2,ry:0,rz:-.12},360);
 scannerTaken=true;phase='scan';actionBusy=false;setPrompt('۲. کالا را اسکن کن','بارکدخوان برداشته شد. با F آن را به سمت هر کالا بگیر و اسکن کن.');notify('بارکدخوان برداشته شد.');updateHud();
}
function scan(){
 if(phase!=='scan')return;
 if(itemIndex>=order.length){startPayment();return;}
 if(!scannerTaken){setPrompt('بارکدخوان را بردار','کلید E را بزن تا بارکدخوان را برداری.');return;}
 if(scannerFault){
  failedScans++;$('attempts').textContent=failedScans.toLocaleString('fa-IR');
  if(failedScans>=3){phase='manual';manualDigits='';setPrompt('۳. ورود دستی قیمت','اسکنر سه بار خطا داد. قیمت روی برچسب را با اعداد کیبورد وارد کن و Enter بزن.');notify('قیمت محصول را از روی برچسب بخوان و دستی وارد کن.');}
  else{setPrompt('خطای بارکدخوان','دوباره F را بزن. تلاش '+failedScans.toLocaleString('fa-IR')+' از ۳');notify('اسکن ناموفق بود. دوباره تلاش کن.');}
  return;
 }
 if(Math.random()<.16){scannerFault=true;failedScans=1;$('attempts').textContent='۱';setPrompt(Math.random()<.5?'شارژ بارکدخوان کم است':'اتصال بارکدخوان قطع شده','تلاش ناموفق ۱ از ۳. دوباره F را بزن؛ بعد از سه تلاش ورود دستی فعال می‌شود.');notify('بارکدخوان این بار اسکن نکرد.');return;}
 registerProduct('scan');
}
async function registerProduct(mode){
 if(actionBusy)return;actionBusy=true;const p=order[itemIndex],target=productsOnBelt[itemIndex];
 if(mode==='scan'&&handScanner){await tweenObject(handScanner,{x:.18,y:-.25,z:-.68,rx:-.8,ry:-.28,rz:-.12},220);scannerBeam.visible=true;if(target){target.scale.setScalar(1.08);await tweenObject(handScanner,{x:.48,y:-.42,z:-.82,rx:-.15,ry:0,rz:0},260);target.scale.setScalar(1);}else await tweenObject(handScanner,{x:.48,y:-.42,z:-.82},260);scannerBeam.visible=false;}
 scanned.push(p);total+=p.price;itemIndex++;scannerFault=false;failedScans=0;manualDigits='';$('attempts').textContent='۰';
 if(mode==='manual')notify('قیمت دستی ثبت شد.');else notify('بیپ! کالا اسکن شد.');
 actionBusy=false;if(itemIndex<order.length){setPrompt('ادامه اسکن کالاها','بارکدخوان را به سمت محصول بعدی بگیر و F را بزن.');}else startPayment();updateHud();
}
function startPayment(){
 phase='payment';scannerBeam.visible=false;
 if(payment==='card'){cardStage='take';pinDigits='';cardProp=makeCard();cardProp.position.set(.34,1.18,-2.35);scene.add(cardProp);setPrompt('۴. دریافت کارت','مشتری کارت را جلو می‌آورد. کلید C را بزن تا کارت را بگیری.');$('paymentHint').textContent='پرداخت با کارت';}
 else{setPrompt('۴. دریافت پول نقد','مشتری '+money(cashOffer)+' داده است. مبلغ را با اعداد کیبورد وارد کن و Enter بزن.');$('paymentHint').textContent='پرداخت نقدی • مبلغ مشتری: '+money(cashOffer);cashInput='';}
 updateHud();drawMonitor();
}
async function swipeCard(){
 if(phase!=='payment'||payment!=='card'||actionBusy)return;actionBusy=true;
 if(cardStage==='take'){const rest={x:handRight.position.x,y:handRight.position.y,z:handRight.position.z,rx:handRight.rotation.x,ry:handRight.rotation.y,rz:handRight.rotation.z};const armRest={rx:customerArmRight.rotation.x,ry:customerArmRight.rotation.y,rz:customerArmRight.rotation.z};await tweenObject(customerArmRight,{rx:-.72,ry:.08,rz:-.12},360);await tweenObject(handRight,{x:.22,y:-.25,z:-.58,rx:-.55,ry:.12,rz:.22},260);await tweenObject(cardProp,{x:.42,y:1.34,z:-.82},520);await tweenObject(handRight,rest,260);await tweenObject(customerArmRight,armRest,300);cardStage='swipe';setPrompt('۵. کشیدن کارت','کارت را روی شیار کارت‌خوان بکش. دوباره C را بزن.');notify('کارت دریافت شد.');}
 else if(cardStage==='swipe'){await tweenObject(cardProp,{x:1.92,y:1.38,z:-.05},360);await tweenObject(cardProp,{x:1.62,y:1.38,z:-.05},430);await tweenObject(cardProp,{x:1.3,y:1.38,z:-.05},350);scene.remove(cardProp);cardProp=null;cardStage='pin';pinDigits='';setPrompt('۶. واردکردن رمز کارت','رمز آزمایشی ۴ رقمی را با کیبورد وارد کن و Enter بزن.');notify('کارت خوانده شد. رمز کارت را وارد کن.');}
 actionBusy=false;drawMonitor();updateHud();
}
async function receiveCash(){
 if(phase!=='payment'||payment!=='cash'||actionBusy)return;const val=Number(cashInput);if(!Number.isFinite(val)||val!==cashOffer){notify('مبلغ واردشده با پولی که مشتری داده مطابقت ندارد. دوباره وارد کن.');cashInput='';return;}
 actionBusy=true;cashProp=makeCashBundle();cashProp.position.set(.35,1.22,-2.35);scene.add(cashProp);await reachHand(handRight);await tweenObject(cashProp,{x:-1.9,y:1.2,z:.85},600);scene.remove(cashProp);cashProp=null;await tweenObject(cashDrawer,{z:1.42},300);drawerBalance+=cashOffer;changeDue=cashOffer-total;changePaid=0;await tweenObject(cashDrawer,{z:.85},260);actionBusy=false;
 if(changeDue===0){phase='done';setPrompt('پرداخت دقیق انجام شد','نیازی به باقی پول نیست. برای مشتری بعدی Space را بزن.');}else{phase='change';setPrompt('۵. باقی پول را پس بده','مبلغ باقی‌مانده '+money(changeDue)+' است. کلید اسکناس مناسب را انتخاب کن: 1 تا 7');}updateHud();
}
const notes=[100000,50000,20000,10000,5000,2000,1000];
async function giveNote(key){
 if(phase!=='change'||actionBusy)return;const note=notes[Number(key)-1];if(!note)return;if(changePaid+note>changeDue){notify('این اسکناس از باقی پول بیشتر است.');return;}if(drawerBalance<note){notify('این اسکناس در کشوی صندوق موجود نیست.');return;}
 actionBusy=true;await tweenObject(cashDrawer,{z:1.42},240);const bill=makeCashBundle();bill.scale.set(.55,.55,.55);bill.position.set(-1.9,1.2,1.35);scene.add(bill);await reachHand(handLeft);await tweenObject(bill,{x:.35,y:1.2,z:-2.1},520);scene.remove(bill);await tweenObject(cashDrawer,{z:.85},240);changePaid+=note;drawerBalance-=note;actionBusy=false;
 if(changePaid===changeDue){phase='done';setPrompt('۶. خرید تکمیل شد','باقی پول درست تحویل داده شد. برای مشتری بعدی Space را بزن.');notify('باقی پول کامل تحویل داده شد.');}else{setPrompt('ادامه تحویل باقی پول','باقی‌مانده: '+money(changeDue-changePaid)+' • اسکناس بعدی را با کلید 1 تا 7 انتخاب کن.');}updateHud();
}
function nextCustomer(){if(phase!=='done')return;customerNumber++;makeCustomer();newOrder();notify('مشتری بعدی رسید.');}
function handleNumber(key){
 if(phase==='manual'){if(key==='Backspace'){manualDigits=manualDigits.slice(0,-1);}else if(/^[0-9]$/.test(key)){manualDigits+=key;} $('inputDisplay').textContent=manualDigits||'قیمت را وارد کن';}
 else if(phase==='payment'&&payment==='cash'){if(key==='Backspace'){cashInput=cashInput.slice(0,-1);}else if(/^[0-9]$/.test(key)){cashInput+=key;} $('inputDisplay').textContent=cashInput?Number(cashInput).toLocaleString('fa-IR')+' تومان':'مبلغ نقدی را وارد کن';}
 else if(phase==='payment'&&payment==='card'&&cardStage==='pin'){if(key==='Backspace'){pinDigits=pinDigits.slice(0,-1);}else if(/^[0-9]$/.test(key)&&pinDigits.length<4){pinDigits+=key;}drawMonitor();$('inputDisplay').textContent='رمز: '+('•'.repeat(pinDigits.length));}
}
function enterKey(){
 if(phase==='manual'){const value=Number(manualDigits);if(value===order[itemIndex].price){registerProduct('manual');}else{score=Math.max(0,score-4);notify('قیمت صحیح نیست. برچسب کالا را بررسی کن.');manualDigits='';$('inputDisplay').textContent='قیمت را دوباره وارد کن';$('score').textContent=score.toLocaleString('fa-IR')+'٪';}}
 else if(phase==='payment'&&payment==='cash')receiveCash();
 else if(phase==='payment'&&payment==='card'&&cardStage==='pin'){if(pinDigits.length===4){cardStage='approved';phase='done';setPrompt('پرداخت موفق','رمز تأیید شد. برای مشتری بعدی Space را بزن.');notify('پرداخت کارت با موفقیت انجام شد.');drawMonitor();updateHud();}else notify('رمز باید ۴ رقم باشد.');}
}
function handleCalculatorKey(k){
 if(k==='C'){calcDisplay='0';calcAccumulator=null;calcOperator=null;calcFresh=true;}
 else if(['+','−','×','÷'].includes(k)){calcAccumulator=Number(calcDisplay)||0;calcOperator=k;calcFresh=true;}
 else if(k==='='){const b=Number(calcDisplay)||0,a=calcAccumulator??b;calcDisplay=String(calcOperator==='+'?a+b:calcOperator==='−'?a-b:calcOperator==='×'?a*b:calcOperator==='÷'?(b?a/b:0):b);calcAccumulator=null;calcOperator=null;calcFresh=true;}
 else if(/^\d$/.test(k)){calcDisplay=calcFresh||calcDisplay==='0'?k:calcDisplay+k;calcFresh=false;}
 drawMonitor();
}
function setupKeyboard(){
 window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(key==='e'){e.preventDefault();takeScanner();}
  else if(key==='f'){e.preventDefault();scan();}
  else if(key==='c'){e.preventDefault();swipeCard();}
  else if(e.code==='Space'){e.preventDefault();nextCustomer();}
  else if(e.key==='Enter'){e.preventDefault();enterKey();}
  else if(e.key==='Backspace'){e.preventDefault();handleNumber('Backspace');handleCalculatorKey('C');}
  else if(/^[0-9]$/.test(e.key)){e.preventDefault();if(phase==='change')giveNote(e.key);else {handleNumber(e.key);handleCalculatorKey(e.key);}}
  else if(['+','-','*','/','='].includes(e.key)){e.preventDefault();handleCalculatorKey(({'+':'+','-':'−','*':'×','/':'÷','=':'='})[e.key]);}
 });
 window.addEventListener('blur',()=>{keysDown={};});
 document.body.tabIndex=0;document.body.focus();
}
function animate(){
 requestAnimationFrame(animate);const t=clock.getElapsedTime();
 if(customer){customer.position.y=Math.sin(t*1.3)*.008;customer.rotation.y=Math.sin(t*.55)*.035;if(customerArmLeft)customerArmLeft.rotation.x=Math.sin(t*.9)*.12;if(customerArmRight)customerArmRight.rotation.x=.18+Math.sin(t*.7+1)*.08;}
 if(handScanner&&handScanner.visible){handScanner.rotation.z=Math.sin(t*2)*.025;}
 renderer.render(scene,camera);
}
function resize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function start(){
 buildStore();clock=new THREE.Clock();$('world').style.display='block';setupKeyboard();$('drawerCash').textContent=money(drawerBalance);$('inputDisplay').textContent='ماشین حساب آماده است';
 $('startScreen').classList.add('hidden');$('game').classList.remove('hidden');newOrder();animate();addEventListener('resize',resize);
}
start();
