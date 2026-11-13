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
let customer,customerHead,scanner,scannerBeam,handScanner,handLeft,handRight,productsOnBelt=[];
let order=[],scanned=[],itemIndex=0,total=0,customerNumber=1,score=100;
let phase='pickup',scannerTaken=false,scannerFault=false,failedScans=0,manualDigits='';
let payment='cash',cashOffer=0,cashInput='',changeDue=0,changePaid=0,drawerBalance=650000;
let promptTitle='',promptText='',toastTimer=0,keysDown={},calcDisplay='0',calcAccumulator=null,calcOperator=null,calcFresh=true;

function material(color,roughness=.72,metalness=0){return color && color.isMaterial ? color : new THREE.MeshStandardMaterial({color,roughness,metalness});}
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
function drawMonitor(){
 if(!monitorCtx)return;
 const c=monitorCanvas,x=monitorCtx;x.clearRect(0,0,c.width,c.height);
 const g=x.createLinearGradient(0,0,0,c.height);g.addColorStop(0,'#142f40');g.addColorStop(1,'#071720');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
 x.direction='rtl';x.textAlign='right';x.fillStyle='#83e6c0';x.font='bold 28px Tahoma';x.fillText('ERFAN MARKET  |  صندوق فروش',c.width-28,38);
 x.strokeStyle='#36596a';x.lineWidth=2;x.beginPath();x.moveTo(24,55);x.lineTo(c.width-24,55);x.stroke();
 // invoice area
 x.fillStyle='#9ab5c4';x.font='bold 20px Tahoma';x.fillText('فاکتور کالاها',c.width-300,91);
 x.fillStyle='#9ab5c4';x.font='bold 17px Tahoma';x.fillText('شرح کالا',c.width-30,126);x.textAlign='left';x.fillText('قیمت',c.width-260,126);
 let y=164;
 scanned.slice(-5).forEach(p=>{x.textAlign='right';x.fillStyle='#eef7f6';x.font='19px Tahoma';x.fillText(p.name,c.width-30,y);x.textAlign='left';x.fillStyle='#9be8c8';x.fillText(p.price.toLocaleString('fa-IR'),c.width-260,y);y+=36;});
 if(scanned.length===0){x.textAlign='center';x.fillStyle='#708b9b';x.font='18px Tahoma';x.fillText('منتظر اسکن کالا...',c.width*.68,190);}
 // calculator panel built into the POS display
 const px=28,py=80,pw=315,ph=360;
 x.fillStyle='#1b3543';x.beginPath();x.roundRect(px,py,pw,ph,16);x.fill();
 x.fillStyle='#0a1a24';x.beginPath();x.roundRect(px+14,py+16,pw-28,64,9);x.fill();
 x.direction='ltr';x.textAlign='right';x.fillStyle='#9bf0c7';x.font='bold 27px Tahoma';
 const calcText=phase==='payment'&&payment==='cash'?(cashInput||'0'):phase==='manual'?(manualDigits||'0'):(calcDisplay||'0');
 x.fillText(String(calcText).slice(-18),px+pw-26,py+59);
 const keys=[['7','8','9','÷'],['4','5','6','×'],['1','2','3','−'],['C','0','=','+']];
 const kw=63,kh=55,gap=8;
 keys.forEach((row,ri)=>row.forEach((k,ci)=>{
  const bx=px+15+ci*(kw+gap),by=py+98+ri*(kh+gap);
  x.fillStyle=['÷','×','−','+','='].includes(k)?'#236653':k==='C'?'#8c463f':'#294858';
  x.beginPath();x.roundRect(bx,by,kw,kh,9);x.fill();
  x.fillStyle='#f4fbf8';x.font='bold 22px Arial';x.textAlign='center';x.fillText(k,bx+kw/2,by+35);
 }));
 x.direction='rtl';x.textAlign='right';x.fillStyle='#b9ded0';x.font='bold 20px Tahoma';x.fillText('مبلغ کل',c.width-30,c.height-68);
 x.textAlign='left';x.fillStyle='#8cf0c3';x.font='bold 26px Tahoma';x.fillText(total.toLocaleString('fa-IR')+' تومان',c.width-260,c.height-68);
 x.fillStyle='#183c3c';x.fillRect(c.width-360,c.height-48,330,28);
 x.fillStyle='#9ac8b5';x.font='14px Tahoma';x.textAlign='right';x.fillText(phase==='payment'&&payment==='cash'?'مبلغ دریافتی را وارد کن':'ماشین حساب صندوق',c.width-38,c.height-28);
 monitorTexture.needsUpdate=true;
}
function buildMonitor(){
 monitorCanvas=document.createElement('canvas');monitorCanvas.width=900;monitorCanvas.height=520;monitorCtx=monitorCanvas.getContext('2d');
 monitorTexture=new THREE.CanvasTexture(monitorCanvas);monitorTexture.colorSpace=THREE.SRGBColorSpace;
 const frame=cube(scene,1.65,1.02,.12,0x18252d,-1.05,1.55,.22,.35);
 const screen=mesh(scene,new THREE.PlaneGeometry(1.48,.85),new THREE.MeshBasicMaterial({map:monitorTexture}),-1.05,1.56,.155);
 cube(scene,.13,.32,.16,0x293c45,-1.05,1.0,.27);
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
 sphere(handLeft,.12,0xc78f70,0,-.43,-.02);
 handLeft.position.set(-.48,-.48,-.9);camera.add(handLeft);
 capsule(handRight,.105,.38,0x263e55,0,-.2,0);
 sphere(handRight,.12,0xc78f70,0,-.43,-.02);
 handRight.position.set(.48,-.48,-.9);camera.add(handRight);
 handScanner=new THREE.Group();
 cube(handScanner,.12,.2,.35,0x202d35,0,0,0,.3);
 cube(handScanner,.1,.12,.1,0x2d414b,0,-.13,.08,.3);
 const glass=mesh(handScanner,new THREE.BoxGeometry(.09,.015,.09),new THREE.MeshBasicMaterial({color:0x5fffc6,emissive:0x27bd8b}),0,.105,-.1);
 handScanner.position.set(.48,-.42,-.82);handScanner.visible=false;camera.add(handScanner);
}
function makeCustomer(){
 if(customer)scene.remove(customer);
 customer=new THREE.Group();scene.add(customer);
 const shirt=material([0x486f80,0x9a5948,0x665c8e,0x526c50,0x9b7545][customerNumber%5],.92);
 const skin=material([0xd3a080,0xb97858,0xe0b99a,0x98694e][customerNumber%4],.8);
 const hair=material([0x30251f,0x4c3427,0x211e1c,0x6c4b35][customerNumber%4],.9);
 const pants=material(0x34404b);
 capsule(customer,.34,.55,shirt,0,1.45,-2.4);
 capsule(customer,.095,.48,shirt,-.43,1.48,-2.4);capsule(customer,.095,.48,shirt,.43,1.48,-2.4);
 sphere(customer,.12,skin,-.43,1.19,-2.4);sphere(customer,.12,skin,.43,1.19,-2.4);
 capsule(customer,.105,.48,pants,-.15,.73,-2.4);capsule(customer,.105,.48,pants,.15,.73,-2.4);
 const head=sphere(customer,.255,skin,0,2.12,-2.4,32);customerHead=head;
 // ears, nose, jaw, eyes, eyebrows and mouth
 sphere(customer,.055,skin,-.25,2.12,-2.4);sphere(customer,.055,skin,.25,2.12,-2.4);
 sphere(customer,.045,skin,0,2.06,-2.17,16);
 for(const side of [-1,1]){
  sphere(customer,.028,0x202020,side*.09,2.15,-2.17,12);
  capsule(customer,.025,.07,hair,side*.09,2.205,-2.18);
 }
 const mouth=mesh(customer,new THREE.BoxGeometry(.085,.012,.012),material(0x7d3c3a),0,1.985,-2.17);
 const hairTop=mesh(customer,new THREE.SphereGeometry(.26,24,16,0,Math.PI*2,0,Math.PI*.55),hair,0,2.23,-2.42);
 // hairline and side locks
 capsule(customer,.055,.18,hair,-.22,2.13,-2.43);capsule(customer,.055,.18,hair,.22,2.13,-2.43);
 // Neck
 capsule(customer,.09,.15,skin,0,1.83,-2.4);
 // simple collar and shirt seams
 cube(customer,.26,.07,.05,0xd5d9d3,0,1.78,-2.18,.9);
 customer.position.y=0;
}
function buildStore(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ab4c0);scene.fog=new THREE.Fog(0x9ab4c0,17,34);
 camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,55);camera.position.set(0,1.68,4.2);camera.lookAt(0,1.58,-2.8);
 renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
 scene.add(new THREE.HemisphereLight(0xeaf7ff,0x5a4537,2.15));
 const key=new THREE.DirectionalLight(0xffe5c7,3.2);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
 const fill=new THREE.PointLight(0x9ddcff,35,16);fill.position.set(4,3,-4);scene.add(fill);
 cube(scene,24,.18,30,0xb8b9b1,0,-.1,-5,.95);
 cube(scene,24,5,.25,0xe3e4dd,0,2.45,-13,.95);
 cube(scene,24,.25,30,0xddd8cc,0,5,-5,.95);
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
 for(let x=-5;x<=5;x+=2.5){cube(scene,1.8,.05,.45,0xfff3d9,x,4.75,-4,.4);const lamp=new THREE.PointLight(0xffe6bf,18,10);lamp.position.set(x,4.2,-4);scene.add(lamp);}
 const sign=roundedLabel('ERFAN MARKET');sign.position.set(0,4.05,-12.65);sign.scale.set(3.4,.82,1);scene.add(sign);
 // cashier counter in immediate foreground
 cube(scene,4.9,.85,1.0,0x394c4e,0,.48,.45,.5);
 cube(scene,4.9,.09,1.08,0x202c32,0,.95,.45,.35);
 // conveyor and rubber belt
 cube(scene,2.65,.16,1.35,0x252e32,.85,1.07,-.75,.4);
 cube(scene,2.48,.025,1.19,0x505b5d,.85,1.17,-.75,.65);
 for(let x=-.32;x<=2.02;x+=.22){const roller=mesh(scene,new THREE.CylinderGeometry(.035,.035,1.17,12),material(0x98a5a4,.32,.45),x,1.16,-.75);roller.rotation.x=Math.PI/2;}
 // scanner base and terminal
 cube(scene,.52,.14,.52,0x202b32,2.05,1.1,.15,.3);
 cube(scene,.32,.025,.34,0x6bf0c1,2.05,1.19,.15,.22);
 cube(scene,.55,.18,.5,0x25363e,2.0,1.05,-.05,.4);
 cube(scene,.45,.28,.06,0x152a34,2.0,1.27,-.22,.3);
 const cardScreen=mesh(scene,new THREE.PlaneGeometry(.35,.19),new THREE.MeshBasicMaterial({color:0x5fe0ae}),2,1.28,-.184);
 // cash drawer and note slots
 cube(scene,1.25,.16,.75,0x202b31,-1.9,.96,.85,.35);
 for(let i=0;i<5;i++)cube(scene,.21,.045,.52,0x506067,-2.32+i*.21,1.06,.84,.6);
 buildMonitor();buildScanner();buildHands();makeCustomer();
}
function createProduct(p,i){
 const g=new THREE.Group();let body;
 if(p.shape==='bottle'){
  body=mesh(g,new THREE.CylinderGeometry(.12,.16,.46,20),material(p.color,.3),0,.26,0);
  mesh(g,new THREE.CylinderGeometry(.055,.07,.14,16),material(0xe8e9df,.3),0,.55,0);
  mesh(g,new THREE.CylinderGeometry(.065,.065,.045,16),material(0x2f7a65,.35),0,.65,0);
 }else if(p.shape==='ball'){body=sphere(g,.2,p.color,0,.2,0,24);}
 else if(p.shape==='bag'){body=mesh(g,new THREE.BoxGeometry(.3,.42,.16),material(p.color,.45),0,.22,0);}
 else{body=mesh(g,new THREE.BoxGeometry(.34,.37,.27),material(p.color,.65),0,.19,0);}
 const tag=roundedLabel(p.name+'  |  '+p.price.toLocaleString('fa-IR')+' تومان');tag.position.set(0,.95,0);tag.scale.set(1.28,.32,1);g.add(tag);
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
 order=[];scanned=[];itemIndex=0;total=0;scannerTaken=false;scannerFault=false;failedScans=0;manualDigits='';cashInput='';changeDue=0;changePaid=0;if(handScanner)handScanner.visible=false;if(handLeft)handLeft.visible=true;
 const count=3+Math.floor(Math.random()*3);for(let i=0;i<count;i++)order.push(catalog[Math.floor(Math.random()*catalog.length)]);
 payment=Math.random()<.5?'cash':'card';cashOffer=0;
 if(payment==='cash'){const orderTotal=order.reduce((sum,p)=>sum+p.price,0);const extra=[0,20000,50000,100000,150000][Math.floor(Math.random()*5)];cashOffer=Math.ceil((orderTotal+extra)/10000)*10000;}
 clearBelt();order.forEach(createProduct);
 phase='pickup';setPrompt('۱. بارکدخوان را بردار','برای برداشتن بارکدخوان کلید E را فشار بده.');updateHud();
 $('paymentHint').textContent='روش پرداخت در پایان خرید مشخص می‌شود.';
}
function takeScanner(){
 if(phase!=='pickup')return;scannerTaken=true;handScanner.visible=true;handLeft.visible=false;handRight.visible=true;phase='scan';
 setPrompt('۲. کالا را اسکن کن','بارکدخوان در دست توست. برای اسکن هر کالا کلید F را بزن.');notify('بارکدخوان برداشته شد.');updateHud();
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
function registerProduct(mode){
 const p=order[itemIndex];scanned.push(p);total+=p.price;itemIndex++;scannerFault=false;failedScans=0;manualDigits='';$('attempts').textContent='۰';
 scannerBeam.visible=true;setTimeout(()=>{if(scannerBeam)scannerBeam.visible=false;},180);
 if(mode==='manual')notify('قیمت دستی ثبت شد.');else notify('بیپ! کالا اسکن شد.');
 if(itemIndex<order.length){setPrompt('ادامه اسکن کالاها','محصول بعدی را اسکن کن. کلید F');}
 else startPayment();
 updateHud();
}
function startPayment(){
 phase='payment';scannerBeam.visible=false;
 if(payment==='card'){setPrompt('۴. دریافت کارت','مشتری کارت داده است. کارت را روی کارت‌خوان بکش: کلید C');$('paymentHint').textContent='پرداخت با کارت';}
 else{setPrompt('۴. دریافت پول نقد','مشتری '+money(cashOffer)+' داده است. مبلغ را با اعداد کیبورد وارد کن و Enter بزن.');$('paymentHint').textContent='پرداخت نقدی • مبلغ مشتری: '+money(cashOffer);cashInput='';}
 updateHud();
}
function swipeCard(){if(phase!=='payment'||payment!=='card')return;phase='done';setPrompt('پرداخت موفق','پرداخت کارت انجام شد. برای مشتری بعدی Space را بزن.');notify('پرداخت کارت با موفقیت انجام شد.');updateHud();}
function receiveCash(){if(phase!=='payment'||payment!=='cash')return;const val=Number(cashInput);if(!Number.isFinite(val)||val!==cashOffer){notify('مبلغ واردشده با پولی که مشتری داده مطابقت ندارد. دوباره وارد کن.');cashInput='';return;}drawerBalance+=cashOffer;changeDue=cashOffer-total;changePaid=0;if(changeDue===0){phase='done';setPrompt('پرداخت دقیق انجام شد','نیازی به باقی پول نیست. برای مشتری بعدی Space را بزن.');}else{phase='change';setPrompt('۵. باقی پول را پس بده','مبلغ باقی‌مانده '+money(changeDue)+' است. کلید اسکناس مناسب را انتخاب کن: 1 تا 7');}updateHud();}
const notes=[100000,50000,20000,10000,5000,2000,1000];
function giveNote(key){if(phase!=='change')return;const note=notes[Number(key)-1];if(!note)return;if(changePaid+note>changeDue){notify('این اسکناس از باقی پول بیشتر است.');return;}if(drawerBalance<note){notify('این اسکناس در کشوی صندوق موجود نیست.');return;}changePaid+=note;drawerBalance-=note;if(changePaid===changeDue){phase='done';setPrompt('۶. خرید تکمیل شد','باقی پول درست تحویل داده شد. برای مشتری بعدی Space را بزن.');notify('باقی پول کامل تحویل داده شد.');}else{setPrompt('ادامه تحویل باقی پول','باقی‌مانده: '+money(changeDue-changePaid)+' • اسکناس بعدی را با کلید 1 تا 7 انتخاب کن.');}updateHud();}
function nextCustomer(){if(phase!=='done')return;customerNumber++;makeCustomer();newOrder();notify('مشتری بعدی رسید.');}
function handleNumber(key){
 if(phase==='manual'){if(key==='Backspace'){manualDigits=manualDigits.slice(0,-1);}else if(/^[0-9]$/.test(key)){manualDigits+=key;} $('inputDisplay').textContent=manualDigits||'قیمت را وارد کن';}
 else if(phase==='payment'&&payment==='cash'){if(key==='Backspace'){cashInput=cashInput.slice(0,-1);}else if(/^[0-9]$/.test(key)){cashInput+=key;} $('inputDisplay').textContent=cashInput?Number(cashInput).toLocaleString('fa-IR')+' تومان':'مبلغ نقدی را وارد کن';}
}
function enterKey(){
 if(phase==='manual'){const value=Number(manualDigits);if(value===order[itemIndex].price){registerProduct('manual');}else{score=Math.max(0,score-4);notify('قیمت صحیح نیست. برچسب کالا را بررسی کن.');manualDigits='';$('inputDisplay').textContent='قیمت را دوباره وارد کن';$('score').textContent=score.toLocaleString('fa-IR')+'٪';}}
 else if(phase==='payment'&&payment==='cash')receiveCash();
}
function handleCalculatorKey(k){
 if(k==='C'){calcDisplay='0';calcAccumulator=null;calcOperator=null;calcFresh=true;}
 else if(['+','−','×','÷'].includes(k)){calcAccumulator=Number(calcDisplay)||0;calcOperator=k;calcFresh=true;}
 else if(k==='='){const b=Number(calcDisplay)||0,a=calcAccumulator??b;calcDisplay=String(calcOperator==='+'?a+b:calcOperator==='−'?a-b:calcOperator==='×'?a*b:calcOperator==='÷'?(b?a/b:0):b);calcAccumulator=null;calcOperator=null;calcFresh=true;}
 else if(/^\\d$/.test(k)){calcDisplay=calcFresh||calcDisplay==='0'?k:calcDisplay+k;calcFresh=false;}
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
 if(customer){customer.position.y=Math.sin(t*1.3)*.012;customer.rotation.y=Math.sin(t*.55)*.025;}
 if(handScanner&&handScanner.visible){handScanner.rotation.z=Math.sin(t*2)*.025;}
 renderer.render(scene,camera);
}
function resize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
function start(){
 buildStore();clock=new THREE.Clock();$('world').style.display='none';setupKeyboard();$('drawerCash').textContent=money(drawerBalance);$('inputDisplay').textContent='منتظر دریافت مبلغ';
 $('startScreen').classList.add('hidden');$('game').classList.remove('hidden');newOrder();addEventListener('resize',resize);
}
start();
