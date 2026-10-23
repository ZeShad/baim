import { PHOTO_PUZZLE, initialPuzzle, validPuzzle, movePuzzle, puzzleHint, puzzleSolved } from './SlidingBlockPuzzle.js';

// A genuine Blender GLB, with grid rules shared by mouse and accessible controls.
export function createSlidingPuzzle({ state, text, onChange, onSolved, onClose }) {
  let current = validPuzzle(state) ? structuredClone(state) : initialPuzzle();
  let selected = 'blue', ready = false, disposed = false, release = () => {}, draw = () => {};
  const panel = document.createElement('section'); panel.className = 'photo-puzzle-screen';
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label',text('title'));
  const title=document.createElement('h2'); title.textContent=text('title'); panel.append(title);
  const help=document.createElement('p'); help.textContent=text('help'); panel.append(help);
  const host=document.createElement('div'); host.className='photo-puzzle-view'; panel.append(host);
  const status=document.createElement('p'); status.setAttribute('role','status'); status.textContent=text('loading'); panel.append(status);
  const buttons=document.createElement('div'); buttons.className='photo-puzzle-controls'; panel.append(buttons);
  const pieceButtons = new Map();
  function button(label, action, parent=buttons) { const b=document.createElement('button'); b.type='button'; b.textContent=label; b.onclick=action; parent.append(b); return b; }
  function choose(id) { selected=id; for(const [key,b] of pieceButtons) b.setAttribute('aria-pressed',String(key===id)); draw(); }
  const selectors=document.createElement('div'); selectors.className='photo-puzzle-pieces'; panel.append(selectors);
  for(const [i,p] of PHOTO_PUZZLE.pieces.entries()) {
    const b=button(`${text(p.color)} ${i+1}`,()=>choose(p.id),selectors); b.dataset.piece=p.id; pieceButtons.set(p.id,b);
  }
  function slide(dx,dy) {
    if(!ready || disposed) return;
    const next=movePuzzle(current,selected,dx,dy);
    if(!next) { status.textContent=text('blocked'); return; }
    current=next; onChange(structuredClone(current)); draw();
    status.textContent=`${text('moves')}: ${current.moves}`;
    if(puzzleSolved(current)) { ready=false; onSolved(); }
  }
  for(const [key,dx,dy,glyph] of [['left',-1,0,'←'],['up',0,-1,'↑'],['down',0,1,'↓'],['right',1,0,'→']]) {
    const b=button(`${glyph} ${text(key)}`,()=>slide(dx,dy)); b.dataset.direction=key;
  }
  button(text('hint'),()=>{
    if(!ready) return;
    const hint=puzzleHint(current); if(!hint) return;
    choose(hint.id);
    status.textContent=`${pieceButtons.get(hint.id).textContent}: ${text(hint.dx<0?'left':hint.dx>0?'right':hint.dy<0?'up':'down')}`;
  }).dataset.action='hint';
  button(text('reset'),()=> { if(!ready) return; current=initialPuzzle(); onChange(structuredClone(current)); choose('blue'); status.textContent=`${text('moves')}: 0`; });
  button(text('close'),onClose);
  const keydown=event=>{
    if(event.key==='Escape') { event.preventDefault(); onClose(); return; }
    if(event.key==='Tab') {
      const controls=[...panel.querySelectorAll('button')], i=controls.indexOf(document.activeElement);
      controls[(i+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus(); event.preventDefault(); return;
    }
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(d) { event.preventDefault(); slide(...d); }
  };
  panel.addEventListener('keydown',keydown); choose('blue');
  (async()=>{
    const [T,{GLTFLoader}]=await Promise.all([import('../vendor/three/three.module.js'),import('../vendor/three/GLTFLoader.js')]);
    if(disposed) return;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    const scene=new T.Scene(), camera=new T.OrthographicCamera(-.15,.15,.145,-.145,.001,2);
    camera.position.set(0,.37,.22); camera.lookAt(0,0,0);
    scene.add(new T.HemisphereLight(0xfff0d2,0x372616,2.8));
    const light=new T.DirectionalLight(0xffffff,3); light.position.set(-.15,.4,.2); scene.add(light);
    const canvas=renderer.domElement; canvas.setAttribute('aria-label',text('title')); host.append(canvas);
    let model=null; const pieces=new Map(), ray=new T.Raycaster();
    draw=()=>{
      if(disposed) return;
      for(const p of PHOTO_PUZZLE.pieces) {
        const object=pieces.get(p.id); if(!object) continue;
        object.position.x=(current.positions[p.id].x+p.w/2-2)*.04;
        object.position.z=(current.positions[p.id].y+p.h/2-2.5)*.04;
        object.position.y = p.id === selected ? .012 : .010;
      }
      const w=Math.max(250,host.clientWidth),h=Math.max(230,host.clientHeight);
      camera.left=-.145*w/h; camera.right=.145*w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); renderer.render(scene,camera);
      host.dataset.modelState=ready?'ready':'loading'; host.dataset.triangles=renderer.info.render.triangles;
    };
    const pick=event=>{
      if(!ready) return; const r=canvas.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);
      for(const hit of ray.intersectObjects([...pieces.values()],true)) {
        let o=hit.object; while(o && !o.userData.pieceId) o=o.parent;
        if(o) { choose(o.userData.pieceId); pieceButtons.get(o.userData.pieceId).focus(); break; }
      }
    };
    canvas.addEventListener('pointerdown',pick); const observer=new ResizeObserver(draw); observer.observe(host);
    const disposeModel=root=>{ const materials=new Set(),textures=new Set(); root?.traverse(o=>{o.geometry?.dispose(); for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)) materials.add(m);}); for(const m of materials){ for(const v of Object.values(m))if(v?.isTexture)textures.add(v); m.dispose(); } for(const t of textures){t.source?.data?.close?.();t.dispose();} };
    release=()=>{observer.disconnect();canvas.removeEventListener('pointerdown',pick);disposeModel(model);renderer.dispose();renderer.forceContextLoss();};
    try {
      const gltf=await new GLTFLoader().loadAsync('assets/chapter1/puzzles/photo-cupboard-c01.glb');
      if(disposed) { disposeModel(gltf.scene); return; }
      model=gltf.scene; model.traverse(o=>{if(o.userData.pieceId)pieces.set(o.userData.pieceId,o);});
      if(pieces.size!==PHOTO_PUZZLE.pieces.length) throw new Error('Incomplete puzzle model');
      scene.add(model); ready=true; status.textContent=`${text('moves')}: ${current.moves}`; draw();
      if(puzzleSolved(current)) { ready=false; onSolved(); }
    } catch(error) { if(!disposed) {ready=false;host.dataset.modelState='error';status.textContent=text('error');} }
  })().catch(()=> {if(!disposed)status.textContent=text('error');});
  queueMicrotask(()=> {if(!disposed)pieceButtons.get('blue')?.focus();});
  return { element:panel, dispose(){disposed=true;ready=false;panel.removeEventListener('keydown',keydown);release();} };
}
