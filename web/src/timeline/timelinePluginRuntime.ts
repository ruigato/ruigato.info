/**
 * Runtime gerado a partir de `plugin/timeline-threejs.raw.js` (plugin WordPress).
 * pickPoint / updateThreshold / pointer: alinhados ao .js; regenerar: `node scripts/patch-timeline-plugin.mjs`
 */
// @ts-nocheck — código gerado a partir do JS do plugin; tipagem manual seria frágil.
import type { TimelinePluginData } from "./timelinePluginTypes"

type ThreeNamespace = typeof import("three") & {
  OrbitControls: typeof import("three/examples/jsm/controls/OrbitControls.js").OrbitControls
  Line2: typeof import("three/examples/jsm/lines/Line2.js").Line2
  LineGeometry: typeof import("three/examples/jsm/lines/LineGeometry.js").LineGeometry
  LineMaterial: typeof import("three/examples/jsm/lines/LineMaterial.js").LineMaterial
}

export function runTimelinePluginRuntime(
  THREE: ThreeNamespace,
  timelineData: TimelinePluginData,
  container: HTMLElement,
): () => void {
// —————————————————————————————————————————————
  // 1) CONFIGURATION
  // —————————————————————————————————————————————
  const CONFIG = {
    BREAKPOINT:         768,
    MARGIN:             { top:20, right:60, bottom:20, left:20 },
    DOT_SIZE:           8,
    HOVER_GROW:         0.2,
    HOVER_SHRINK:       1.0,
    PALETTE: [
      'rgb(128,0,128)','rgb(164,36,91)','rgb(200,73,55)','rgb(237,109,18)',
      'rgb(237,146,18)','rgb(200,182,55)','rgb(164,219,92)','rgb(128,255,128)',
      'rgb(92,219,164)','rgb(55,182,200)','rgb(18,146,237)','rgb(18,110,237)',
      'rgb(55,73,200)','rgb(92,36,164)'
    ],
    MAX_PARTICLES:      1000,
    PARTICLES_PER_SPAWN:100,
    PARTICLE_SPEED:     { min:10, max:100 },
    SPEED_MULT:         0.5,
    TURBULENCE:         300,
    WIND_STRENGTH:      20,
    FADE_OPACITY:       0.2
  };
  const currentUtcYear = new Date().getUTCFullYear();
  const NAV_MIN_TS = Date.UTC(1990,0,1,0,0,0,0);
  const NAV_MAX_TS = Date.UTC(currentUtcYear,11,31,23,59,59,999);

  // —————————————————————————————————————————————
  // 2) GLOBAL STATE
  // —————————————————————————————————————————————
  let width, height, W, H, yMid, xMid;
  let ORIENTATION, M;
  let scene, camera, renderer, controls, raycaster, clock;
  let axisCanvas, ctx2d, tooltip;
  let categoryLabel;
  let TOTAL_SPAN   = 0;
  let currentSpan  = 0;
  let dataMinTs    = NAV_MIN_TS;
  let dataMaxTs    = NAV_MAX_TS;
  let BASE_LINEWIDTH = 2;
  let toggledCategory = null;
  let sidePanZones = [];
  let activeSidePanZone = null;
  let activeSidePanPointerId = null;
  let activeSidePanX = 0;
  let activeSidePanY = 0;
  const arcLines   = [];
  const arcLinesByCat = {};
  const pointSystems   = [];
  const categoryState  = {};
  const toggles        = {};
  const hoverAnims     = [];
  const particlesData  = [];
  let particleSystem, highlightTexture;
  const tmpV = new THREE.Vector3();
  let tMin, tMax;
  let prevHitId    = null;
  let prevTipId    = null;
  let prevHoverMesh= null;
  let staticTooltip= false;
  let showMonths   = false;
  let baselineLine = null;
  let lastTouchTapTs = 0;
  let lastTouchTapX = 0;
  let lastTouchTapY = 0;

  // —————————————————————————————————————————————
  // 3) HOST STYLING (embedded in SPA) — preenche o .timeline-canvas-host (flex); header no fluxo do Layout
  // —————————————————————————————————————————————
  if (!container || !timelineData || Object.keys(timelineData).length === 0) {
    return () => {}
  }
  Object.assign(container.style, {
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: "0",
    maxHeight: "none",
    margin: "0",
    padding: "0",
    overflow: "hidden",
    zIndex: "1",
    background:
      "linear-gradient(to bottom, #333333 0%, #2a2a2a 22%, #1a1a1a 50%, #2a2a2a 78%, #333333 100%)",
  })

  // 4) BOOTSTRAP (init/animate chamados no final da função exportada)
  let rafId = 0

  function init(){
    setDimensions(); initScene(); initRenderer(); initCameraAndControls();
    initAxesCanvas(); initSidePanZones(); initToggles(); initCategoryLabel(); initDataStructures();
    attachEventHandlers(); drawAxes2D();
  }

  // —————————————————————————————————————————————
  // 5) ORIENTATION & SIZING
  // —————————————————————————————————————————————
  function setDimensions(){
    width=container.clientWidth; height=container.clientHeight;
    if(window.innerWidth<CONFIG.BREAKPOINT){ ORIENTATION='vertical'; M={top:0,right:20,bottom:0,left:0}; }
    else { ORIENTATION='horizontal'; M={...CONFIG.MARGIN}; }
    W=width-M.left-M.right; H=height-M.top-M.bottom;
    yMid=M.top+H/2; xMid=width/2;
  }
  function xScale(ts){ return ORIENTATION==='vertical'?xMid:M.left+((ts-tMin)/(tMax-tMin))*W; }
  function yScale(ts){ return ORIENTATION==='vertical'?M.top+((ts-tMin)/(tMax-tMin))*H:yMid; }
  function worldToScreen(x,y){ tmpV.set(x,y,0).project(camera);return{x:(tmpV.x+1)/2*width,y:(1-tmpV.y)/2*height}; }

  // —————————————————————————————————————————————
  // CATEGORY HIGHLIGHT
  // —————————————————————————————————————————————
  function highlightCategory(cat){
    Object.keys(arcLinesByCat).forEach(otherCat=>{
      const isActive = otherCat===cat;
      arcLinesByCat[otherCat].forEach(l2=>{
        l2.material.linewidth=isActive?BASE_LINEWIDTH*2:BASE_LINEWIDTH;
        l2.material.opacity=isActive?1:CONFIG.FADE_OPACITY;
        l2.material.needsUpdate=true;
      });
    });
  }
  function clearCategoryHighlight(){
    Object.values(arcLinesByCat).flat().forEach(l2=>{
      l2.material.linewidth=BASE_LINEWIDTH;
      l2.material.opacity=1;
      l2.material.needsUpdate=true;
    });
    hideCategoryLabel(); toggledCategory=null;
  }

  // —————————————————————————————————————————————
  // 6) SCENE & CLOCK
  // —————————————————————————————————————————————
  function initScene(){ scene=new THREE.Scene(); clock=new THREE.Clock(); raycaster=new THREE.Raycaster(); raycaster.params.Line   = { threshold: 0 };
raycaster.params.Line2  = { threshold: 0 };
raycaster.params.Points = { threshold: 0 };}

  // —————————————————————————————————————————————
  // 7) RENDERER
  // —————————————————————————————————————————————
  function initRenderer(){
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,premultipliedAlpha:true});
    renderer.setClearColor(0x000000,0);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width,height);
    Object.assign(renderer.domElement.style,{
      position:'absolute',top:0,left:0,zIndex:1,touchAction:'none',
      background:'transparent',
    });
    container.appendChild(renderer.domElement);
  }

  // —————————————————————————————————————————————
  // 8) CAMERA & CONTROLS
  // —————————————————————————————————————————————
  function initCameraAndControls(){
    camera=new THREE.OrthographicCamera(0,width,height,0,-1000,1000);
    controls=new THREE.OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true; controls.enableRotate=false;
    controls.enableZoom=true; controls.enablePan=true; controls.screenSpacePanning=true;
    controls.zoomSpeed=1.2; controls.keyPanSpeed=7.0; controls.minZoom=camera.zoom;
    if(ORIENTATION==='vertical'){ controls.touches.ONE=THREE.TOUCH.ROTATE; controls.touches.TWO=THREE.TOUCH.DOLLY_PAN; }
    else { controls.touches.ONE=THREE.TOUCH.PAN; controls.touches.TWO=THREE.TOUCH.DOLLY_PAN; }
    controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
    scene.add(camera); recenterCamera();
  }
  function recenterCamera(){ camera.position.set(0,0,camera.position.z); controls.target.set(0,0,0); controls.update(); }
  function getVisibleWorldRange(){
    if(ORIENTATION==='horizontal'){
      const min=new THREE.Vector3(-1,0,0).unproject(camera).x;
      const max=new THREE.Vector3(1,0,0).unproject(camera).x;
      return { min, max, center:(min+max)/2 };
    }
    let min=new THREE.Vector3(0,-1,0).unproject(camera).y;
    let max=new THREE.Vector3(0,1,0).unproject(camera).y;
    if(min>max){ const tmp=min; min=max; max=tmp; }
    return { min, max, center:(min+max)/2 };
  }
  function centerCameraOnWorld(worldCenter){
    const { center } = getVisibleWorldRange();
    const delta = worldCenter - center;
    if(ORIENTATION==='horizontal'){
      camera.position.x += delta;
      controls.target.x += delta;
    } else {
      camera.position.y += delta;
      controls.target.y += delta;
    }
  }
  function clampCameraToTimelineBounds(){
    if(!camera||!controls) return;
    if(ORIENTATION==='horizontal'){
      const minWorld=M.left;
      const maxWorld=M.left+W;
      let visibleMin=new THREE.Vector3(-1,0,0).unproject(camera).x;
      let visibleMax=new THREE.Vector3(1,0,0).unproject(camera).x;
      const visibleSpan=visibleMax-visibleMin;
      const allowedSpan=maxWorld-minWorld;
      if(visibleSpan>=allowedSpan){
        const allowedCenter=(minWorld+maxWorld)/2;
        const visibleCenter=(visibleMin+visibleMax)/2;
        const shift=allowedCenter-visibleCenter;
        if(shift!==0){
          camera.position.x+=shift;
          controls.target.x+=shift;
        }
        return;
      }
      let shift=0;
      if(visibleMin<minWorld) shift=minWorld-visibleMin;
      else if(visibleMax>maxWorld) shift=maxWorld-visibleMax;
      if(shift!==0){
        camera.position.x+=shift;
        controls.target.x+=shift;
      }
    } else {
      const minWorld=M.top;
      const maxWorld=M.top+H;
      let visibleMin=new THREE.Vector3(0,-1,0).unproject(camera).y;
      let visibleMax=new THREE.Vector3(0,1,0).unproject(camera).y;
      if(visibleMin>visibleMax){ const tmp=visibleMin; visibleMin=visibleMax; visibleMax=tmp; }
      const visibleSpan=visibleMax-visibleMin;
      const allowedSpan=maxWorld-minWorld;
      if(visibleSpan>=allowedSpan){
        const allowedCenter=(minWorld+maxWorld)/2;
        const visibleCenter=(visibleMin+visibleMax)/2;
        const shift=allowedCenter-visibleCenter;
        if(shift!==0){
          camera.position.y+=shift;
          controls.target.y+=shift;
        }
        return;
      }
      let shift=0;
      if(visibleMin<minWorld) shift=minWorld-visibleMin;
      else if(visibleMax>maxWorld) shift=maxWorld-visibleMax;
      if(shift!==0){
        camera.position.y+=shift;
        controls.target.y+=shift;
      }
    }
  }
  function zoomToFill(){
    if(!camera||!controls) return;
    const dataSpan = Math.max(1, dataMaxTs - dataMinTs);
    const padding = Math.max(180 * 24 * 60 * 60 * 1000, dataSpan * 0.08);
    const desiredMin = Math.max(NAV_MIN_TS, dataMinTs - padding);
    const desiredMax = Math.min(NAV_MAX_TS, dataMaxTs + padding);
    const desiredSpan = Math.max(1, desiredMax - desiredMin);
    camera.zoom = Math.max(controls.minZoom || 1, TOTAL_SPAN / desiredSpan);
    camera.updateProjectionMatrix();
    const centerTs = desiredMin + desiredSpan / 2;
    const worldCenter = ORIENTATION==='horizontal' ? xScale(centerTs) : yScale(centerTs);
    centerCameraOnWorld(worldCenter);
    clampCameraToTimelineBounds();
    controls.update();
  }

  // —————————————————————————————————————————————
  // 9) AXIS CANVAS
  // —————————————————————————————————————————————
  function initAxesCanvas(){
    if(axisCanvas) axisCanvas.remove();
    axisCanvas=document.createElement('canvas');
    const dpr=window.devicePixelRatio||1;
    axisCanvas.width=width*dpr; axisCanvas.height=height*dpr;
    axisCanvas.style.cssText=`position:absolute;top:0;left:0;pointer-events:none;z-index:2;background:transparent;width:${width}px;height:${height}px;`;
    container.appendChild(axisCanvas);
    ctx2d=axisCanvas.getContext('2d'); ctx2d.scale(dpr,dpr);
    ctx2d.textAlign='center'; ctx2d.textBaseline='top'; ctx2d.font='10px Helvetica,Arial,sans-serif';
    ctx2d.fillStyle='#999'; ctx2d.strokeStyle='#999';
  }

  // Zonas laterais livres em mobile: permitem pan com um dedo sem roubar taps no eixo central.
  function initSidePanZones(){
    sidePanZones.forEach(zone=>zone.remove());
    sidePanZones = [];
    activeSidePanZone = null;
    activeSidePanPointerId = null;

    if(ORIENTATION!=='vertical') return;

    const gutter = Math.max(56, Math.min(96, Math.round(width * 0.2)));
    const bottomClearance = 76;

    ['left','right'].forEach(side=>{
      const zone=document.createElement('div');
      Object.assign(zone.style,{
        position:'absolute',
        top:'0',
        bottom:`${bottomClearance}px`,
        [side]:'0',
        width:`${gutter}px`,
        zIndex:'3',
        background:'transparent',
        touchAction:'none',
      });
      zone.dataset.panZone = side;
      zone.addEventListener('pointerdown',handleSidePanStart);
      zone.addEventListener('pointermove',handleSidePanMove);
      zone.addEventListener('pointerup',finishSidePanGesture);
      zone.addEventListener('pointercancel',finishSidePanGesture);
      container.appendChild(zone);
      sidePanZones.push(zone);
    });
  }

  function panCameraByPixels(dx,dy){
    const invZoom = 1 / (camera.zoom || 1);
    const worldDx = dx * invZoom;
    const worldDy = dy * invZoom;
    camera.position.x -= worldDx;
    camera.position.y += worldDy;
    controls.target.x -= worldDx;
    controls.target.y += worldDy;
    clampCameraToTimelineBounds();
    controls.update();
  }

  function handleSidePanStart(e){
    if(e.pointerType==='mouse') return;
    if(e.isPrimary===false) return;
    activeSidePanZone = e.currentTarget;
    activeSidePanPointerId = e.pointerId;
    activeSidePanX = e.clientX;
    activeSidePanY = e.clientY;
    if(activeSidePanZone.setPointerCapture){
      activeSidePanZone.setPointerCapture(e.pointerId);
    }
    if(!staticTooltip){
      if(prevHoverMesh){
        scene.remove(prevHoverMesh);
        prevHoverMesh = null;
      }
      prevHitId = prevTipId = null;
      hideTooltip();
      if(!lockedArcCat){
        clearCategoryHighlight();
        hideCategoryLabel();
      }
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function handleSidePanMove(e){
    if(activeSidePanPointerId!==e.pointerId) return;
    const dx = e.clientX - activeSidePanX;
    const dy = e.clientY - activeSidePanY;
    activeSidePanX = e.clientX;
    activeSidePanY = e.clientY;
    if(dx===0 && dy===0) return;
    panCameraByPixels(dx,dy);
    e.preventDefault();
    e.stopPropagation();
  }

  function finishSidePanGesture(e){
    if(activeSidePanPointerId!==e.pointerId) return;
    const zone = activeSidePanZone;
    if(zone && zone.hasPointerCapture && zone.hasPointerCapture(e.pointerId)){
      zone.releasePointerCapture(e.pointerId);
    }
    activeSidePanZone = null;
    activeSidePanPointerId = null;
    e.preventDefault();
    e.stopPropagation();
  }

  // —————————————————————————————————————————————
  // 10) TOGGLES
  // —————————————————————————————————————————————
  function initToggles(){
    const cats=Object.keys(timelineData);
    const wrapper=document.createElement('div');
    Object.assign(wrapper.style,{position:'absolute',bottom:'8px',left:'0',right:'0',display:'flex',flexWrap:'wrap',gap:'8px',padding:'8px 4px',justifyContent:'left',alignItems:'left',fontFamily:'Helvetica,Arial,sans-serif',textTransform:'uppercase',background:'rgba(0,0,0,0.3)',boxSizing:'border-box',zIndex:'200'});
    container.appendChild(wrapper);
    const items=[];
    cats.forEach(cat=>{
      categoryState[cat]=true;
      arcLinesByCat[cat]=[];
      const color=CONFIG.PALETTE[cats.indexOf(cat)%CONFIG.PALETTE.length];
      const cb=document.createElement('div');
      Object.assign(cb.style,{width:'12px',height:'12px',border:`1px solid ${color}`,background:color,cursor:'pointer',flexShrink:'0'});
      const lbl=document.createElement('span'); lbl.textContent=timelineData[cat].name;
      Object.assign(lbl.style,{color,margin:'0 4px',fontSize:'12px',whiteSpace:'nowrap'});
      const box=document.createElement('div'); Object.assign(box.style,{display:'flex',alignItems:'center',marginBottom:'4px',cursor:'pointer'});
      box.append(cb,lbl); wrapper.appendChild(box);
      items.push({el:box,defaultDisplay:box.style.display});
      const toggleCategory=()=>{
        categoryState[cat]=!categoryState[cat]; cb.style.background=categoryState[cat]?color:'transparent';
        pointSystems.find(s=>s.cat===cat).group.visible=categoryState[cat]; hideTooltip();
      };
      cb.addEventListener('click',e=>{ e.stopPropagation(); toggleCategory(); });
      lbl.addEventListener('click',e=>{ e.stopPropagation(); toggleCategory(); });
      box.addEventListener('click',toggleCategory);
      toggles[cat]=cb;
    });
    ['Show All','Hide All'].forEach((txt,i)=>{
      const btn=document.createElement('button'); btn.textContent=txt;
      Object.assign(btn.style,{margin:'0 4px',padding:'4px 8px',cursor:'pointer',border:'none',borderRadius:'0px',background:'#111',color:'#fff',fontSize:'12px'});
      btn.addEventListener('click',()=>{
        const on=i===0;
        Object.keys(timelineData).forEach(cat=>{
          categoryState[cat]=on;
          toggles[cat].style.background=on?CONFIG.PALETTE[Object.keys(timelineData).indexOf(cat)%CONFIG.PALETTE.length]:'transparent';
          pointSystems.find(s=>s.cat===cat).group.visible=on;
        }); hideTooltip();
      }); wrapper.appendChild(btn); items.push({el:btn,defaultDisplay:''});
    });
    let filtersVisible=true;
    const filtersBtn=document.createElement('button');
    function updateFiltersBtnLabel(){ filtersBtn.textContent=filtersVisible?'HIDE FILTERS':'SHOW FILTERS'; }
    Object.assign(filtersBtn.style,{margin:'0 4px',padding:'4px 8px',cursor:'pointer',border:'none',borderRadius:'0px',background:'#444',color:'#fff',fontSize:'12px'});
    filtersBtn.addEventListener('click',()=>{
      filtersVisible=!filtersVisible; items.forEach(item=>item.el.style.display=filtersVisible?item.defaultDisplay:'none'); updateFiltersBtnLabel();
    }); wrapper.appendChild(filtersBtn);
    items.forEach(item=>{ item.el.style.display=filtersVisible?item.defaultDisplay:'none'; }); updateFiltersBtnLabel();
  }

  // —————————————————————————————————————————————
  // CATEGORY LABEL
  // —————————————————————————————————————————————
  function initCategoryLabel(){
    if(categoryLabel) categoryLabel.remove();
    categoryLabel=document.createElement('div');
    categoryLabel.id='webgl-category-label';
    Object.assign(categoryLabel.style,{
      position:'fixed',
      right:'24px',
      padding:'6px 10px',
      fontSize:'13px',
      fontFamily:'Helvetica,Arial,sans-serif',
      color:'#fff',
      textTransform:'uppercase',
      letterSpacing:'0.06em',
      pointerEvents:'none',
      display:'none',
      zIndex:'1050',
      maxWidth:'min(50vw, 420px)',
      textAlign:'right',
      textShadow:'0 1px 2px rgba(0,0,0,0.85)',
    });
    document.body.appendChild(categoryLabel);
  }

  function syncCategoryLabelPlacement(){
    if(!categoryLabel) return;
    const mast=document.getElementById('masthead');
    const gap=10;
    const top=mast?Math.round(mast.getBoundingClientRect().bottom)+gap:56;
    categoryLabel.style.top=`${top}px`;
  }

  function showCategoryLabel(slug){
    const entry=timelineData[slug];
    const label=entry?.name?.trim()
      ? entry.name
      : slug.replace(/-/g,' ').split(' ').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
    categoryLabel.textContent=label;
    syncCategoryLabelPlacement();
    categoryLabel.style.display='block';
  }

  function hideCategoryLabel(){ categoryLabel.style.display='none'; }

  // —————————————————————————————————————————————
  // 11) BUILD TIMELINE & PARTICLES
  // —————————————————————————————————————————————
  function initDataStructures(){
    const allTs=Object.values(timelineData).flatMap(cat=>cat.posts.map(p=>new Date(p.date).getTime())).filter(t=>!isNaN(t));
    tMin=NAV_MIN_TS;
    tMax=NAV_MAX_TS;
    const boundedTs=allTs.filter(ts=>ts>=NAV_MIN_TS&&ts<=NAV_MAX_TS);
    dataMinTs=boundedTs.length?Math.min(...boundedTs):NAV_MIN_TS;
    dataMaxTs=boundedTs.length?Math.max(...boundedTs):NAV_MAX_TS;
    TOTAL_SPAN=tMax-tMin; arcLines.length=0;
    pointSystems.forEach(s=>scene.remove(s.group)); pointSystems.length=0;
    if(particleSystem) scene.remove(particleSystem);
    if(baselineLine) scene.remove(baselineLine);
    setupParticleSystem(); prepareHighlightTexture();
    const baselinePts=ORIENTATION==='horizontal'?[new THREE.Vector3(M.left,yMid,0),new THREE.Vector3(M.left+W,yMid,0)]:[new THREE.Vector3(xMid,M.top,0),new THREE.Vector3(xMid,M.top+H,0)];
    baselineLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(baselinePts),new THREE.LineBasicMaterial({color:0x444444})); scene.add(baselineLine);

    Object.keys(timelineData).forEach(cat=>arcLinesByCat[cat]=[]);
    Object.keys(timelineData).forEach((cat,ci)=>{
      const color=new THREE.Color(CONFIG.PALETTE[ci%CONFIG.PALETTE.length]);
      const group=new THREE.Group(); scene.add(group);
      const posts=timelineData[cat].posts.map(p=>({ts:new Date(p.date).getTime(),...p})).filter(p=>!isNaN(p.ts)).sort((a,b)=>a.ts-b.ts);

      // ─── arcs with Line2 ─────────────────────────────────────────────
      posts.slice(1).forEach((p,i)=>{
        const prev=posts[i]; const steps=64; const sign=i%2?1:-1;
        const pts=[];
        if(ORIENTATION==='horizontal'){
          const x0=xScale(prev.ts),x1=xScale(p.ts),r=Math.abs((x1-x0)/2),cx=(x0+x1)/2;
          const startAngle=sign<0?Math.PI:0, delta=(Math.PI/steps)*sign;
          for(let j=0;j<=steps;j++){const θ=startAngle+delta*j; pts.push(cx+r*Math.cos(θ),yMid+sign*r*Math.sin(θ),0);}        } else {
          const y0=yScale(prev.ts),y1=yScale(p.ts),r=Math.abs((y1-y0)/2),cy=(y0+y1)/2;
          const startAngle=sign<0?Math.PI:0, delta=(Math.PI/steps)*sign;
          for(let j=0;j<=steps;j++){const θ=startAngle+delta*j; pts.push(xMid+sign*r*Math.sin(θ),cy+r*Math.cos(θ),0);}        }
        const lineGeo=new THREE.LineGeometry(); lineGeo.setPositions(pts);
        const lineMat=new THREE.LineMaterial({color:color.getHex(),linewidth:BASE_LINEWIDTH,resolution:new THREE.Vector2(width,height),dashed:false,opacity:1,transparent:true,worldUnits:false});
        lineMat.depthTest=false;
        lineMat.depthWrite=false;
        const line2=new THREE.Line2(lineGeo,lineMat); line2.computeLineDistances(); line2.scale.set(1,1,1); line2.renderOrder = 0;
        group.add(line2); arcLines.push(line2); arcLinesByCat[cat].push(line2);
      });

      // points
      const circleTex=createCircleTexture(64), coords=[];
      posts.forEach(p=>coords.push(ORIENTATION==='horizontal'?xScale(p.ts):xMid,ORIENTATION==='horizontal'?yMid:yScale(p.ts),0));
      const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
      const pm=new THREE.PointsMaterial({size:CONFIG.DOT_SIZE,map:circleTex,alphaTest:0.5,transparent:true,color, sizeAttenuation:false});
const pts = new THREE.Points(pg, pm);
pts.renderOrder = 1;          // draw after arc
pts.material.depthTest = false; // always on top
group.add(pts);
      pointSystems.push({cat,group,mesh:group.children.slice(-1)[0],posts}); categoryState[cat]=true;
    });
    syncArcLineMaterialResolution();
    initTooltip();
  }

  function syncArcLineMaterialResolution(){
    arcLines.forEach((l2)=>{
      if(l2.material&&l2.material.resolution) l2.material.resolution.set(width,height);
    });
  }


  function createCircleTexture(size){
    const c=document.createElement('canvas');
    c.width=c.height=size;
    const cx=c.getContext('2d');
    cx.fillStyle='#fff';
    cx.beginPath();
    cx.arc(size/2,size/2,size/2-1,0,Math.PI*2);
    cx.fill();
    return new THREE.CanvasTexture(c);
  }

  function prepareHighlightTexture(){
    highlightTexture=createCircleTexture(32);
  }

  function setupParticleSystem(){
    const tex=createCircleTexture(32);
    const geo=new THREE.BufferGeometry(),
          posArr=new Float32Array(CONFIG.MAX_PARTICLES*3),
          colArr=new Float32Array(CONFIG.MAX_PARTICLES*4);
    geo.setAttribute('position',new THREE.BufferAttribute(posArr,3));
    geo.setAttribute('color',   new THREE.BufferAttribute(colArr,4));
    particleSystem=new THREE.Points(geo,new THREE.PointsMaterial({
      size:4,map:tex,alphaTest:0.5,transparent:true,vertexColors:true,depthWrite:false
    }));
    particleSystem.frustumCulled=false;
    geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Infinity);
    scene.add(particleSystem);
  }

  function noise(x,y,z){
    const v=Math.sin(x*12.9898+y*78.233+z*37.719)*43758.5453;
    return v-Math.floor(v);
  }

  function spawnParticles(pos,color){
    for(let i=0;i<CONFIG.PARTICLES_PER_SPAWN&&particlesData.length<CONFIG.MAX_PARTICLES;i++){
      const ang=Math.random()*2*Math.PI;
      const base=CONFIG.PARTICLE_SPEED.min+
        Math.random()*(CONFIG.PARTICLE_SPEED.max-CONFIG.PARTICLE_SPEED.min);
      const speed=base*CONFIG.SPEED_MULT;
      particlesData.push({
        pos:pos.clone(),
        vel:new THREE.Vector3(Math.cos(ang)*speed,Math.sin(ang)*speed,0),
        age:0,
        lifespan:2+Math.random()*2,
        color:color.clone()
      });
    }
  }

  function updateParticles(dt){
    const t=clock.getElapsedTime(),
          posArr=particleSystem.geometry.attributes.position.array,
          colArr=particleSystem.geometry.attributes.color.array;
    let p3=0,c4=0;
    for(let i=0;i<particlesData.length;){
      const p=particlesData[i];
      p.age+=dt;
      if(p.age>=p.lifespan){particlesData.splice(i,1);continue;}
      const nx=noise(p.pos.x*0.002,p.pos.y*0.002,t*0.1),
            ny=noise(p.pos.x*0.002+5,p.pos.y*0.002+5,t*0.1);
      p.vel.x+=(nx-0.5)*CONFIG.TURBULENCE*dt;
      p.vel.y+=(ny-0.5)*CONFIG.TURBULENCE*dt;
      p.pos.y+=CONFIG.WIND_STRENGTH*dt;
      p.pos.addScaledVector(p.vel,dt);
      posArr[p3++]=p.pos.x;
      posArr[p3++]=p.pos.y;
      posArr[p3++]=0;
      const a=1-p.age/p.lifespan;
      colArr[c4++]=p.color.r;
      colArr[c4++]=p.color.g;
      colArr[c4++]=p.color.b;
      colArr[c4++]=a;
      i++;
    }
    while(p3<posArr.length) posArr[p3++]=0;
    while(c4<colArr.length) colArr[c4++]=0;
    particleSystem.geometry.attributes.position.needsUpdate=true;
    particleSystem.geometry.attributes.color.needsUpdate=true;
  }

  // —————————————————————————————————————————————
  // 12) TOOLTIP (now pointer-events toggled)
  // —————————————————————————————————————————————
  function syncTooltipPlacement(){
    if(!tooltip) return;
    const mast=document.getElementById('masthead');
    const gap=12;
    const top=mast?Math.round(mast.getBoundingClientRect().bottom)+gap:64;
    tooltip.style.top=`${top}px`;
    tooltip.style.left='50%';
    tooltip.style.transform='translateX(-50%)';
    tooltip.style.right='auto';
  }
  function initTooltip(){
    if(tooltip) tooltip.remove();
    tooltip=document.createElement('div');
    tooltip.id='webgl-tooltip';
    Object.assign(tooltip.style,{
      fontFamily:'Helvetica,Arial,sans-serif',
      position:'fixed',
      top:'64px',
      left:'50%',
      transform:'translateX(-50%)',
      right:'auto',
      background:'rgba(0,0,0,0.7)',
      color:'#fff',
      padding:'8px',
      boxSizing:'border-box',
      fontSize:'14px',
      textAlign:'left',
      textTransform:'uppercase',
      border:'1px solid #999',
      opacity:'0',
      pointerEvents:'none',
      transition:'opacity 0.2s ease',
      zIndex:'1050',
      maxWidth:'min(360px, calc(100vw - 24px))',
      width:'auto'
    });
    document.body.appendChild(tooltip);
  }
  function showTooltip(){
    syncTooltipPlacement();
    tooltip.style.opacity='1';
    tooltip.style.pointerEvents='auto';
  }
  function hideTooltip(){
    tooltip.style.opacity='0';
    tooltip.style.pointerEvents='none';
  }

  function makeHTML(post,includeBtn){
    let html=`<strong style="display:block;margin-bottom:4px">${post.title}</strong>
              <small>${post.date.slice(0,10)}</small>`;
    if(post.thumbnail){
      const TW=280,TH=158;
      html+=`<div style="width:${TW}px;height:${TH}px;max-width:100%;margin-top:8px;overflow:hidden;border-radius:2px;background:#111;box-sizing:border-box;">
        <img src="${post.thumbnail}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"/>
      </div>`;
    }
    if(includeBtn){
      html+=`<button class="open-post-btn" style="margin-top:8px;padding:4px 8px;cursor:pointer">
                OPEN POST
              </button>`;
    }
    return html;
  }

  // —————————————————————————————————————————————
  // 13) AXES DRAWING
  // —————————————————————————————————————————————
  function drawAxes2D(){
    ctx2d.clearRect(0,0,width,height);
    // compute visible span
    let tsA, tsB;
    if(ORIENTATION==='horizontal'){
      const lW=new THREE.Vector3(-1,0,0).unproject(camera).x;
      const rW=new THREE.Vector3(1,0,0).unproject(camera).x;
      const invTs=x=>((x-M.left)/W)*(tMax-tMin)+tMin;
      tsA=invTs(lW); tsB=invTs(rW);
    } else {
      const bW=new THREE.Vector3(0,-1,0).unproject(camera).y;
      const tW=new THREE.Vector3(0,1,0).unproject(camera).y;
      const invTs = y => tMin + ((y - M.top)/H)*(tMax - tMin);

      tsA=invTs(bW); tsB=invTs(tW);
    }
    const vMin=Math.min(tsA,tsB), vMax=Math.max(tsA,tsB);

    currentSpan = vMax - vMin;  // capture for the width mapping

    showMonths=(vMax-vMin)<2*365*24*60*60*1000;

    // styling
    const axisSpacing=20;
    ctx2d.strokeStyle='#999';
    ctx2d.fillStyle='#777';
    ctx2d.lineWidth=1;

    if(ORIENTATION==='horizontal'){
      const baseY=worldToScreen(0,yMid).y;
      const mY=baseY+axisSpacing;
      const yY=baseY+axisSpacing*2;
      // YEARS
      ctx2d.beginPath();
      ctx2d.moveTo(M.left,yY);
      ctx2d.lineTo(width-M.right,yY);
      ctx2d.stroke();
      for(let yr=new Date(vMin).getUTCFullYear();yr<=new Date(vMax).getUTCFullYear();yr++){
        const ts=Date.UTC(yr,0,1);
        if(ts<vMin||ts>vMax) continue;
        const sx=worldToScreen(xScale(ts),yMid).x;
        ctx2d.beginPath();
        ctx2d.moveTo(sx,yY);
        ctx2d.lineTo(sx,yY+12);
        ctx2d.stroke();
        ctx2d.fillText(String(yr),sx,yY+14);
      }
      // MONTHS
      if(showMonths){
        ctx2d.beginPath();
        ctx2d.moveTo(M.left,mY);
        ctx2d.lineTo(width-M.right,mY);
        ctx2d.stroke();
        let cur=Date.UTC(new Date(vMin).getUTCFullYear(),new Date(vMin).getUTCMonth(),1);
        const end=Date.UTC(new Date(vMax).getUTCFullYear(),new Date(vMax).getUTCMonth(),1);
        while(cur<=end){
          const sx=worldToScreen(xScale(cur),yMid).x;
          ctx2d.beginPath();
          ctx2d.moveTo(sx,mY);
          ctx2d.lineTo(sx,mY+6);
          ctx2d.stroke();
          let m=new Date(cur).toLocaleString('en-US',{month:'short'});
          m=m.charAt(0).toUpperCase()+m.slice(1);
          ctx2d.fillText(m,sx,mY+8);
          const d=new Date(cur);
          cur=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);
        }
      }
    } else {
      const baseX=worldToScreen(xMid,0).x;
      const mX=baseX+axisSpacing;
      const yX=baseX+axisSpacing*3;
      const yearLabelOffset=24;
      const monthLabelOffset=18;
      // YEARS
      ctx2d.beginPath();
      ctx2d.moveTo(yX,M.top);
      ctx2d.lineTo(yX,M.top+H);
      ctx2d.stroke();
      for(let yr=new Date(vMin).getUTCFullYear();yr<=new Date(vMax).getUTCFullYear();yr++){
        const ts=Date.UTC(yr,0,1);
        if(ts<vMin||ts>vMax) continue;
        const sy=worldToScreen(xMid,yScale(ts)).y;
        ctx2d.beginPath();
        ctx2d.moveTo(yX,sy);
        ctx2d.lineTo(yX+12,sy);
        ctx2d.stroke();
        ctx2d.fillText(String(yr),yX+yearLabelOffset,sy-6);
      }
      // MONTHS
      if(showMonths){
        ctx2d.beginPath();
        ctx2d.moveTo(mX,M.top);
        ctx2d.lineTo(mX,M.top+H);
        ctx2d.stroke();
        let cur=Date.UTC(new Date(vMin).getUTCFullYear(),new Date(vMin).getUTCMonth(),1);
        const end=Date.UTC(new Date(vMax).getUTCFullYear(),new Date(vMax).getUTCMonth(),1);
        while(cur<=end){
          const sy=worldToScreen(xMid,yScale(cur)).y;
          ctx2d.beginPath();
          ctx2d.moveTo(mX,sy);
          ctx2d.lineTo(mX+6,sy);
          ctx2d.stroke();
          let m=new Date(cur).toLocaleString('en-US',{month:'short'});
          m=m.charAt(0).toUpperCase()+m.slice(1);
          ctx2d.fillText(m,mX+monthLabelOffset,sy-6);
          const d=new Date(cur);
          cur=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);
        }
      }
    }
  }

  // —————————————————————————————————————————————
  // 14) HIGHLIGHT + RAYCAST + POINTERS
  // —————————————————————————————————————————————
  function highlightDot(sys,idx){
    if(prevHoverMesh){ scene.remove(prevHoverMesh); prevHoverMesh=null; }
    const x=xScale(sys.posts[idx].ts), y=yScale(sys.posts[idx].ts);
    const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y,0)]);
    const mat=new THREE.PointsMaterial({
      size:CONFIG.DOT_SIZE*2,map:highlightTexture,
      color:sys.mesh.material.color,alphaTest:0.5,
      transparent:true,sizeAttenuation:false
    });
    prevHoverMesh=new THREE.Points(geo,mat);
    prevHoverMesh.renderOrder=1000; scene.add(prevHoverMesh);
    startHoverAnim(new THREE.Vector3(x,y,0),sys.mesh.material.color);
    prevHitId=`${sys.cat}_${idx}`;
  }

  function getPointerNDC(x,y){
    const rect=renderer.domElement.getBoundingClientRect();
    const rw=rect.width||1;
    const rh=rect.height||1;
    return{
      nx:((x-rect.left)/rw)*2-1,
      ny:-((y-rect.top)/rh)*2+1
    };
  }

  function pickPoint(x,y){
    const {nx,ny}=getPointerNDC(x,y);
    raycaster.setFromCamera({x:nx,y:ny},camera);
    for(const sys of pointSystems){
      if(!categoryState[sys.cat]) continue;
      const hits=raycaster.intersectObject(sys.mesh);
      if(hits.length) return {sys,idx:hits[0].index,point:hits[0].point.clone()};
    }
    return null;
  }


// ─── pointer‐move: como no WordPress — pontos primeiro (tooltip), depois arcos ────────────────────────────────
function handlePointerMove(e) {
  if (staticTooltip) return;
  updateThreshold();

  const hit = pickPoint(e.clientX, e.clientY);
  if (hit) {
    const { sys, idx, point } = hit;
    const id = `${sys.cat}_${idx}`;
    if (!lockedArcCat) {
      highlightCategory(sys.cat);
      showCategoryLabel(sys.cat);
    }
    if (id !== prevHitId) highlightDot(sys, idx);
    if (id !== prevTipId) {
      spawnParticles(point, sys.mesh.material.color);
      prevTipId = id;
      tooltip.innerHTML = makeHTML(sys.posts[idx], false);
    }
    showTooltip();
    return;
  }

  if (prevHoverMesh) {
    scene.remove(prevHoverMesh);
    prevHoverMesh = null;
  }
  prevHitId = prevTipId = null;
  hideTooltip();

  const arcCatHover = pickArc(e.clientX, e.clientY);
  if (arcCatHover) {
    if (!lockedArcCat) {
      highlightCategory(arcCatHover);
      showCategoryLabel(arcCatHover);
    }
    return;
  }

  if (!lockedArcCat) {
    clearCategoryHighlight();
    hideCategoryLabel();
  }
}

// ─── pointer‐down: toggle arc selection if you clicked an arc ──────────────
let lockedArcCat = null;
function handlePointerDown(e) {
  if (staticTooltip) return;
  updateThreshold();

  const hit = pickPoint(e.clientX, e.clientY);
  if (hit) {
    const { sys, idx } = hit;
    highlightDot(sys, idx);
    staticTooltip = true;
    renderer.domElement.removeEventListener('pointermove', handlePointerMove);
    tooltip.innerHTML = makeHTML(sys.posts[idx], true);
    showTooltip();
    setTimeout(() => document.addEventListener('pointerdown', docClickOutside), 0);
    tooltip.querySelector('.open-post-btn')
           .addEventListener('click', () => window.open(sys.posts[idx].link, '_blank'));
    return;
  }

  const arcCat = pickArc(e.clientX, e.clientY);
  if (arcCat) {
    lockedArcCat = lockedArcCat === arcCat ? null : arcCat;
    if (lockedArcCat) {
      highlightCategory(lockedArcCat);
      showCategoryLabel(lockedArcCat);
    } else {
      clearCategoryHighlight();
      hideCategoryLabel();
    }
  }
}

function handleCanvasDoubleClick(e){
  e.preventDefault();
  zoomToFill();
}

function handleCanvasPointerUp(e){
  if(e.pointerType!=='touch') return;
  updateThreshold();
  if(pickPoint(e.clientX,e.clientY)||pickArc(e.clientX,e.clientY)){
    lastTouchTapTs = 0;
    return;
  }
  const now = e.timeStamp || performance.now();
  const dt = now - lastTouchTapTs;
  const dx = e.clientX - lastTouchTapX;
  const dy = e.clientY - lastTouchTapY;
  if(lastTouchTapTs && dt < 320 && (dx*dx + dy*dy) < (24*24)){
    lastTouchTapTs = 0;
    e.preventDefault();
    zoomToFill();
    return;
  }
  lastTouchTapTs = now;
  lastTouchTapX = e.clientX;
  lastTouchTapY = e.clientY;
}


  function docClickOutside(e){
   // if(!staticTooltip) return;
    if(tooltip.contains(e.target)) return;
    staticTooltip=false;
    clearCategoryHighlight();

     // clear any hover or locked category
  clearCategoryHighlight();
  lockedArcCat = null;              // ← add this
  hideCategoryLabel();


    renderer.domElement.addEventListener('pointermove',handlePointerMove);
    hideTooltip();
    document.removeEventListener('pointerdown',docClickOutside);
  }

  function updateThreshold(){
  const pix = showMonths ? 6 : 12;
  const tol = pix / (camera.zoom || 1);

  // pick tolerance for dots
  raycaster.params.Points.threshold = tol;

  // **add these two** so lines and Line2s pick with the same tolerance
  raycaster.params.Line.threshold   = tol;
  raycaster.params.Line2.threshold  = tol;
}

  function attachEventHandlers(){
    renderer.domElement.addEventListener('pointermove',handlePointerMove);
    renderer.domElement.addEventListener('pointerdown',handlePointerDown);
    renderer.domElement.addEventListener('pointerup',handleCanvasPointerUp);
    renderer.domElement.addEventListener('dblclick',handleCanvasDoubleClick);
    window.addEventListener('resize',onResize);
  }

  // —————————————————————————————————————————————
  // 15) HOVER ANIMS
  // —————————————————————————————————————————————
  function startHoverAnim(pos,color){
    const geo=new THREE.CircleGeometry(1,32);
    const mat=new THREE.MeshBasicMaterial({
      color,transparent:true,opacity:0.5,depthWrite:false,depthTest:false
    });
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.copy(pos); mesh.position.z=1; mesh.renderOrder=999;
    mesh.scale.set(0,0,1); scene.add(mesh);
    hoverAnims.push({mesh,state:'grow',elapsed:0});
  }
  function updateHoverAnims(dt){
    const invZ=1/(camera.zoom||1);
    for(let i=hoverAnims.length-1;i>=0;i--){
      const a=hoverAnims[i]; a.elapsed+=dt;
      if(a.state==='grow'){
        const t=Math.min(a.elapsed/CONFIG.HOVER_GROW,1),
              s=t*CONFIG.DOT_SIZE*3.5*invZ;
        a.mesh.scale.set(s,s,1);
        if(t>=1){a.state='shrink';a.elapsed=0;}
      } else {
        const t=Math.min(a.elapsed/CONFIG.HOVER_SHRINK,1),
              s=(1-t)*CONFIG.DOT_SIZE*3.5*invZ;
        a.mesh.scale.set(s,s,1);
        if(t>=1){scene.remove(a.mesh);hoverAnims.splice(i,1);}
      }
    }
  }


function updateArcLineWidths() {
  // 1 year in ms
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  const maxSpan   = TOTAL_SPAN;     // full timeline span
  const span      = currentSpan;    // current visible timespan

  // normalized 0→1: 0 when fully zoomed out (span=maxSpan),
  //                1 when zoomed in to 1 year or tighter (span<=oneYearMs)
  let rel = (maxSpan - span) / (maxSpan - oneYearMs);
  rel = THREE.MathUtils.clamp(rel, 0, 1);

  // apply quadratic ease‐in
  const eased = Math.pow(rel, 10);

  // continuous width from 1px→6px
  const lw = THREE.MathUtils.lerp(1.2, 6, eased);

 

  arcLines.forEach(l2 => {
    l2.material.linewidth   = lw;
    l2.material.needsUpdate = true;
  });
}



// ─── NEW: raycast against all Line2 arcs ───────────────────────────────────
function pickArc(x, y) {
  const { nx, ny } = getPointerNDC(x, y);
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  // for each category, for each Line2
  for (const cat in arcLinesByCat) {
    for (const l2 of arcLinesByCat[cat]) {
      const hits = raycaster.intersectObject(l2);
      if (hits.length) return cat;
    }
  }
  return null;
}


  // —————————————————————————————————————————————
  // 16) RENDER LOOP
  // —————————————————————————————————————————————
  function animate(){
    rafId = requestAnimationFrame(animate);
    const dt=clock.getDelta();
    updateParticles(dt);
    updateHoverAnims(dt);
    controls.update();
    clampCameraToTimelineBounds();
    drawAxes2D();
    updateArcLineWidths();
    renderer.render(scene,camera);
  }

  // —————————————————————————————————————————————
  // 17) RESIZE HANDLER
  // —————————————————————————————————————————————
  function onResize(){
    setDimensions();
    renderer.setSize(width,height);
    camera.left=0;camera.right=width;
    camera.top=height;camera.bottom=0;
    camera.updateProjectionMatrix();
    recenterCamera();
    initAxesCanvas();
    initSidePanZones();
    initDataStructures();
    drawAxes2D();
    syncCategoryLabelPlacement();
  }


  function dispose() {
    cancelAnimationFrame(rafId)
    window.removeEventListener("resize", onResize)
    document.removeEventListener("pointerdown", docClickOutside)
    if (renderer) {
      renderer.domElement.removeEventListener("pointermove", handlePointerMove)
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown)
      renderer.domElement.removeEventListener("pointerup", handleCanvasPointerUp)
      renderer.domElement.removeEventListener("dblclick", handleCanvasDoubleClick)
      renderer.dispose()
    }
    if (controls) controls.dispose()
    if (tooltip) {
      tooltip.remove()
      tooltip = null
    }
    if (categoryLabel) {
      categoryLabel.remove()
      categoryLabel = null
    }
    container.replaceChildren()
  }

  init()
  animate()

  return dispose
}
