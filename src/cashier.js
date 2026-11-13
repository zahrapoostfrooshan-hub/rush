import './style.css';
import * as THREE from 'three';

const $ = id => document.getElementById(id);
const products = [
  {name:'نان',price:18000,color:0xc98b45,shape:'box'},
  {name:'شیر',price:42000,color:0xe8eee8,shape:'bottle'},
  {name:'آبمیوه',price:35000,color:0xe68a32,shape:'bottle'},
  {name:'ماکارونی',price:29000,color:0xe2bd69,shape:'box'},
  {name:'شکلات',price:25000,color:0x75432e,shape:'box'},
  {name:'سیب',price:12000,color:0xb84638,shape:'ball'},
  {name:'قهوه',price:78000,color:0x684532,shape:'box'},
  {name:'چیپس',price:32000,color:0xe5c44c,shape:'bag'},
  {name:'پنیر',price:51000,color:0xe7d9a1,shape:'box'},
  {name:'آب معدنی',price:15000,color:0x83c9e7,shape:'bottle'}
];
const moneyFmt = n => Math.round(n).toLocaleString('fa-IR')+' تومان';
let scene,camera,renderer,clock,customerGroup,productMeshes=[],basket=[],index=0,scanned=[],total=0,paid=0,changeDue=0,changeGiven=0,drawerCash=500000,scannerFault=null,scanFails=0,phase='scan',paymentType='cash',cashOffered=0,customerNo=1,score=100,waiting=false;

function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2400);}
function labelSprite(text){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#102333';ctx.beginPath();ctx.roundRect(8,8,496,112,20);ctx.fill();ctx.strokeStyle='#75e1bb';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 42px Tahoma';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);const tex=new THREE.CanvasTexture(canvas);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));s.scale.set(1.25,.31,1);return s;}
function mat(color,roughness=.72,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,w,h,d,color,x,y,z,material=null){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material||mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function buildScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9db9c4);scene.fog=new THREE.Fog(0x9db9c4,14,32);
 camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,70);camera.position.set(0,1.72,5.2);camera.lookAt(0,1.35,-3);
 renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 scene.add(new THREE.HemisphereLight(0xeaf7ff,0x5b5147,2));const sun=new THREE.DirectionalLight(0xffe5c5,2.4);sun.position.set(-5,9,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
 const floor=box(scene,24,.2,28,0xc6cbc5,0,-.12,-4);floor.receiveShadow=true;
 box(scene,24,5,.3,0xe8ece7,0,2.4,-13);
 for(let x=-10;x<=10;x+=5){const win=new THREE.Mesh(new THREE.PlaneGeometry(3.7,1.9),new THREE.MeshPhysicalMaterial({color:0x8bc8df,transparent:true,opacity:.45,roughness:.2}));win.position.set(x,2.9,-12.82);scene.add(win);box(scene,3.8,.07,.08,0x82999a,x,3.9,-12.7);box(scene,3.8,.07,.08,0x82999a,x,1.9,-12.7);}
 const sign=labelSprite('ERFAN MARKET');sign.position.set(0,4.3,-12.55);sign.scale.set(3.2,.8,1);scene.add(sign);
 // Checkout counter and conveyor belt
 box(scene,4.8,1.05,1.35,0x31545a,0,.55,-.2);
 box(scene,4.5,.12,1.22,0x26343b,0,1.12,-.18);
 box(scene,2.15,.045,1.02,0x65777a,-1.12,1.205,-.18);
 for(let x=-2.1;x<=2.1;x+=.35){const roller=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.05,10),mat(0x9ba8aa,.32,.55));roller.rotation.x=Math.PI/2;roller.position.set(x,1.17,-.18);scene.add(roller);}
 // Scanner bed and glowing scan window
 box(scene,.66,.16,.54,0x202d35,1.35,1.22,-.15);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(.48,.018,.35),new THREE.MeshStandardMaterial({color:0x5af0bf,emissive:0x1cae83,emissiveIntensity:1.8}));glass.position.set(1.35,1.31,-.15);scene.add(glass);
 // POS monitor, stand, keyboard
 box(scene,.13,.5,.13,0x34444a,-1.55,1.42,-.72);
 box(scene,1.75,1.12,.12,0x172832,-1.55,2.03,-.72);
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.58,.91),new THREE.MeshBasicMaterial({color:0x102c3a}));screen.position.set(-1.55,2.03,-.645);scene.add(screen);
 box(scene,1.35,.07,.5,0x263a43,-1.55,1.24,-.2);
 for(let i=0;i<3;i++)box(scene,.28,.018,.035,0x8da5a8,-1.98+i*.42,1.29,-.1);
 // Card terminal on customer side
 box(scene,.58,.22,.7,0x26343d,2.05,1.28,-.2);
 box(scene,.43,.31,.045,0x152a36,2.05,1.49,-.32);
 const terminalScreen=new THREE.Mesh(new THREE.PlaneGeometry(.34,.22),new THREE.MeshBasicMaterial({color:0x68dfb3}));terminalScreen.position.set(2.05,1.5,-.294);scene.add(terminalScreen);
 // Cash drawer with visible compartments
 box(scene,1.45,.16,.85,0x202c34,-1.5,.92,.55);
 for(let i=0;i<4;i++)box(scene,.29,.06,.48,0x53636a,-2.02+i*.35,1.035,.55);
 // Room ceiling lights
 for(const x of [-5,0,5]){box(scene,2.1,.06,.45,0xfff2d5,x,4.65,-3);const l=new THREE.PointLight(0xffe9c9,18,12);l.position.set(x,4.2,-3);scene.add(l);}
 // Customer waiting position
 customerGroup=new THREE.Group();scene.add(customerGroup);makeCustomer();
}
function makeCustomer(){
 customerGroup.clear();const shirt=mat([0x4b91a0,0xb66c52,0x7c6ab1,0x527d59,0xd1a24e][customerNo%5]);const skin=mat(0xd9a783);const pants=mat(0x344151);const hair=mat(0x332921);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.68,5,10),shirt);torso.position.set(0,1.45,-3.3);customerGroup.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.27,16,12),skin);head.position.set(0,2.12,-3.3);customerGroup.add(head);
 const haircap=new THREE.Mesh(new THREE.SphereGeometry(.28,14,9,0,Math.PI*2,0,Math.PI*.6),hair);haircap.position.set(0,2.2,-3.34);customerGroup.add(haircap);
 for(const x of [-.09,.09]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),mat(0x202020));eye.position.set(x,2.14,-3.04);customerGroup.add(eye);}
 const leg=new THREE.Mesh(new THREE.BoxGeometry(.2,.72,.22),pants);leg.position.set(-.15,.72,-3.3);customerGroup.add(leg);const leg2=leg.clone();leg2.position.x=.15;customerGroup.add(leg2);
}
function clearProducts(){productMeshes.forEach(m=>scene.remove(m));productMeshes=[];}
function createProductMesh(p,i){
 const g=new THREE.Group();let m;
 if(p.shape==='bottle'){m=new THREE.Mesh(new THREE.CylinderGeometry(.14,.17,.55,14),mat(p.color,.3));m.position.y=.34;const neck=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.15,12),mat(0xe6e8df));neck.position.y=.69;g.add(neck);}
 else if(p.shape==='ball'){m=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),mat(p.color,.38));m.position.y=.24;}
 else if(p.shape==='bag'){m=new THREE.Mesh(new THREE.BoxGeometry(.35,.52,.18),mat(p.color,.5));m.position.y=.27;}
 else{m=new THREE.Mesh(new THREE.BoxGeometry(.38,.42,.3),mat(p.color,.6));m.position.y=.22;}
 m.castShadow=true;g.add(m);const tag=labelSprite(moneyFmt(p.price));tag.position.set(0,.98,0);tag.scale.set(1.1,.28,1);g.add(tag);
 const name=labelSprite(p.name);name.position.set(0,1.27,0);name.scale.set(.95,.23,1);g.add(name);
 g.position.set(-1.85+(i%4)*.63,1.25,-.2);g.rotation.y=(i%2)*.25;scene.add(g);productMeshes.push(g);
}
function makeOrder(){
 basket=[];scanned=[];index=0;total=0;paid=0;changeDue=0;changeGiven=0;scanFails=0;scannerFault=null;
 const count=2+Math.floor(Math.random()*4);for(let i=0;i<count;i++)basket.push(products[Math.floor(Math.random()*products.length)]);
 paymentType=Math.random()<.57?'cash':'card';clearProducts();basket.forEach(createProductMesh);
 $('customerLabel').textContent='مشتری شماره '+customerNo;$('paymentType').textContent=paymentType==='cash'?'پرداخت نقدی':'پرداخت با کارت';
 $('scanStatus').textContent='آماده اسکن';$('scanStatus').className='status good';$('scannerAttempts').textContent='۰';$('manualPanel').classList.add('hidden');$('paymentPanel').classList.add('hidden');$('cashPanel').classList.add('hidden');$('finishBtn').classList.add('hidden');
 phase='scan';waiting=false;renderOrder();toast('مشتری جدید رسید. کالاها را یکی‌یکی اسکن کن.');
}
function renderOrder(){
 $('itemsLeft').textContent=Math.max(0,basket.length-index).toLocaleString('fa-IR');
 $('posItems').innerHTML=scanned.map(p=>'<div class="pos-row"><span>'+p.name+'</span><b>'+moneyFmt(p.price)+'</b></div>').join('')||'<div class="pos-empty">هنوز کالایی اسکن نشده</div>';
 $('posTotal').textContent=moneyFmt(total);$('currentProduct').textContent=basket[index]?basket[index].name+' | '+moneyFmt(basket[index].price):'همه کالاها اسکن شدند';
 $('manualPrice').value='';
}
function scanAttempt(){
 if(phase!=='scan'||waiting)return;
 if(index>=basket.length){beginPayment();return;}
 const product=basket[index];
 if(!scannerFault&&Math.random()<.16){scannerFault=Math.random()<.62?'battery':'connection';scanFails=0;}
 if(scannerFault){
  scanFails++;$('scannerAttempts').textContent=scanFails.toLocaleString('fa-IR');
  if(scanFails<3){$('scanStatus').textContent=scannerFault==='battery'?'شارژ بارکدخوان کم است! دوباره تلاش کن':'خطای اتصال بارکدخوان! دوباره تلاش کن';$('scanStatus').className='status warn';toast('اسکن انجام نشد. دوباره کلید اسکن را فشار بده.');return;}
  $('scanStatus').textContent='اسکن ناموفق؛ قیمت را دستی وارد کن';$('scanStatus').className='status bad';$('manualPanel').classList.remove('hidden');$('manualPrice').focus();toast('قیمت روی برچسب محصول را در کامپیوتر وارد کن.');return;
 }
 addScanned(product,'scan');}
function addScanned(product,method){
 scanned.push(product);total+=product.price;index++;scannerFault=null;scanFails=0;
 $('scanStatus').textContent=method==='manual'?'قیمت دستی ثبت شد':'اسکن موفق';$('scanStatus').className='status good';$('scannerAttempts').textContent='۰';$('manualPanel').classList.add('hidden');renderOrder();
 if(index>=basket.length){$('scanStatus').textContent='همه کالاها ثبت شدند';beginPayment();}
}
function manualEntry(){
 if(phase!=='scan'||index>=basket.length)return;
 const entered=Number($('manualPrice').value);const product=basket[index];
 if(!Number.isFinite(entered)||entered<=0){toast('قیمت معتبر وارد کن.');return;}
 if(entered!==product.price){score=Math.max(0,score-3);$('score').textContent=score.toLocaleString('fa-IR')+'٪';toast('قیمت اشتباه است. برچسب را دوباره بررسی کن.');return;}
 addScanned(product,'manual');
}
function beginPayment(){
 phase='payment';$('manualPanel').classList.add('hidden');$('paymentPanel').classList.remove('hidden');
 $('paymentAmount').textContent=moneyFmt(total);$('paymentType').textContent=paymentType==='cash'?'پرداخت نقدی':'پرداخت با کارت';
 if(paymentType==='card'){$('cashPanel').classList.add('hidden');$('cardPayBtn').classList.remove('hidden');$('cashPayBtn').classList.add('hidden');}
 else{$('cashPanel').classList.remove('hidden');$('cardPayBtn').classList.add('hidden');$('cashPayBtn').classList.remove('hidden');$('cashReceived').value='';}
}
function cardPayment(){if(phase!=='payment'||paymentType!=='card')return;paid=total;toast('پرداخت کارت با موفقیت انجام شد.');finishSale();}
function cashPayment(){
 if(phase!=='payment'||paymentType!=='cash')return;const amount=Number($('cashReceived').value);
 if(!Number.isFinite(amount)||amount<total){toast('مبلغ دریافتی کافی نیست.');return;}
 paid=amount;drawerCash+=paid;changeDue=paid-total;changeGiven=0;$('changeDue').textContent=moneyFmt(changeDue);$('cashPanel').classList.add('hidden');if(changeDue===0){updateChangeUI();finishSale();return;}$('changePanel').classList.remove('hidden');$('changeButtons').innerHTML='';
 [100000,50000,20000,10000,5000,2000,1000].forEach(v=>{const b=document.createElement('button');b.className='cash-note';b.textContent=moneyFmt(v);b.onclick=()=>giveChange(v);$('changeButtons').appendChild(b);});
 updateChangeUI();phase='change';}
function giveChange(value){
 if(phase!=='change')return;if(changeGiven+value>changeDue){toast('این اسکناس از باقی‌مانده بیشتر است.');return;}
 if(drawerCash<value){toast('این مقدار پول در صندوق موجود نیست.');return;}
 changeGiven+=value;drawerCash-=value;updateChangeUI();if(changeGiven===changeDue){$('changePanel').classList.add('hidden');toast('باقی پول درست تحویل داده شد.');finishSale();}
}
function updateChangeUI(){$('changeGiven').textContent=moneyFmt(changeGiven);$('changeRemaining').textContent=moneyFmt(changeDue-changeGiven);$('drawerBalance').textContent=moneyFmt(drawerCash);}
function finishSale(){
 phase='done';$('paymentPanel').classList.add('hidden');$('changePanel').classList.add('hidden');$('finishBtn').classList.remove('hidden');$('scanStatus').textContent='خرید تکمیل شد';$('scanStatus').className='status good';
 $('drawerBalance').textContent=moneyFmt(drawerCash);toast('خرید مشتری تکمیل شد. برای مشتری بعدی آماده شو.');
}
function nextCustomer(){customerNo++;makeCustomer();makeOrder();$('finishBtn').classList.add('hidden');}
function setupUI(){
 $('scanBtn').onclick=scanAttempt;$('manualSubmit').onclick=manualEntry;$('manualPrice').addEventListener('keydown',e=>{if(e.key==='Enter')manualEntry();});
 $('cardPayBtn').onclick=cardPayment;$('cashPayBtn').onclick=cashPayment;$('finishBtn').onclick=nextCustomer;
 $('helpBtn').onclick=()=>toast('اسکن: کلید E یا دکمه اسکن | ورود دستی: قیمت روی برچسب را وارد کن');
 addEventListener('keydown',e=>{if(e.key.toLowerCase()==='e'||e.code==='Space'){e.preventDefault();scanAttempt();}if(e.key==='Escape')toast('برای ادامه کار از دکمه‌های صندوق استفاده کن.');});
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(customerGroup)customerGroup.rotation.y=Math.sin(performance.now()*.0005)*.025;renderer.render(scene,camera);}
function resize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function start(){buildScene();setupUI();clock=new THREE.Clock();$('drawerBalance').textContent=moneyFmt(drawerCash);$('score').textContent=score.toLocaleString('fa-IR')+'٪';makeOrder();animate();addEventListener('resize',resize);$('intro').classList.add('hidden');$('game').classList.remove('hidden');}
start();
