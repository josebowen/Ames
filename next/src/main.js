// The Ames Room. One mission: see the illusion, reason about distance, step outside, name the cues, build one, break it.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GlowPoints, skyDome, mulberry, clamp, lerp, ease } from './fx.js';
import { buildRoom, ROOM as R, warp } from './room.js';
import { makeFigure } from './people.js';
import { SRC, cite, CUES, CUE_OPTS, Q1, Q4, FIELDS, ABOUT } from './content.js';
import { EF } from './effort.js';

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const DTCAP = parseFloat(qs.get('dtcap')) || 0.05;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => innerWidth < 820;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const f1 = (x) => x.toFixed(1), f2 = (x) => x.toFixed(2);
const STEPS = ['look', 'reveal', 'cues', 'build', 'break', 'debrief'];
const CMAX = 0.24, GY = -3.3, PX = 1.6, PZ = -3.6;

// ---------- geometry of the two people: the answer key ----------
const _f = V(), _h = V();
function person(who, c, s) {
  const dir = who === 'A' ? 1 : -1, u = s;
  const ax = dir * lerp(-PX, PX, u), az = PZ - dir * 0.24 * Math.sin(Math.PI * u);
  const foot = warp(V(), ax, R.y0, az, c), head = foot.clone(); head.y += R.person;
  return { ax, az, foot, head, dist: Math.hypot(foot.x, foot.z), ang: foot.angleTo(head) };
}
function measure(c, s = 1) { const A = person('A', c, s), B = person('B', c, s); return { A, B, img: B.ang / A.ang, far: B.dist / A.dist }; }
let lo = 0.05, hi = CMAX; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (measure(m).img > 0.5) lo = m; else hi = m; }
const CHALF = Math.round(((lo + hi) / 2) * 1000) / 1000;

// ---------- state ----------
const st = { step: 'title', c: CHALF, cT: CHALF, s: 0, sT: 1, auto: true, wait: 0, walkPh: 0, moving: false,
  guess: null, swapped: false, q1: { sel: null, tries: 0, first: null, done: false },
  cue: { i: 0, sel: null, tries: 0, done: false, first: [] },
  build: { tries: 0, done: false, shown: false, ok: false, msg: '', kind: '' },
  brk: { moved: false, sway: false, lights: true, q: { sel: null, tries: 0, first: null, done: false } }, log: [] };
const cam = { blend: 0, blendT: 0, yaw: 0.6, pitch: 0.6, yawT: 0.6, pitchT: 0.6, zoom: 1, eye: V(0, 0, 0), spin: false };
const log = (what, extra = {}) => st.log.push({ step: st.step, what, ...extra });
function trail() {
  const out = [], L = st.log, mk = (l, names) => `"${names[l.sel]}" ${l.ok ? '✓' : '✕'}`;
  if (st.guess !== null) out.push(`Opening guess: ${['A is taller', 'B is taller', 'they are the same height'][st.guess]}.`);
  const a = L.filter((l) => l.what === 'q1'); if (a.length) out.push(`Image size and distance. You said: ${a.map((l) => mk(l, Q1.opts)).join(', then ')}.`);
  CUES.forEach((C, i) => { const c = L.filter((l) => l.what === 'cue' && l.k === i); if (c.length) out.push(`${C.q.split('.')[0]}. You said: ${c.map((l) => CUE_OPTS[l.sel].toLowerCase() + (l.ok ? ' ✓' : ' ✕')).join(', then ')}.`); });
  const b = L.filter((l) => l.what === 'build'); if (b.length || st.build.shown) out.push(`Building the room. ${b.length} ${b.length === 1 ? 'check' : 'checks'} of your own setting${st.build.shown ? ', then Show me' : ''}.`);
  const d = L.filter((l) => l.what === 'q4'); if (d.length) out.push(`Why one fixed eye. You said: ${d.map((l) => mk(l, Q4.opts)).join(', then ')}.`);
  return out;
}
EF.watch(() => { const s = st.step; if (s === 'look' && st.guess === null) return 'Opening guess'; if (s === 'look' && st.q1 && !st.q1.done && st.swapped) return 'Image size and distance'; if (s === 'cues' && !st.cue.done) return 'Cue ' + (st.cue.i + 1); if (s === 'build' && !st.build.done) return 'Building the room'; if (s === 'break' && st.brk.q && !st.brk.q.done) return 'Why one fixed eye'; return null; });

// ---------- renderer and scene ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400); camera.layers.enable(1);
const eyeCam = new THREE.PerspectiveCamera(42, 1.58, 0.05, 100);
const LOOK = V(0, -0.2, R.zb); eyeCam.lookAt(LOOK);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x04080b, 0.012);
scene.add(skyDome(0x0c2228, 0x050b0e, 0x010203));
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a4a4a, 1.25));
const key = new THREE.DirectionalLight(0xfff2dd, 1.7); key.position.set(1.5, 5, 4); scene.add(key);

const room = buildRoom(); scene.add(room.group);
const figA = makeFigure(0xff7a66), figB = makeFigure(0x4fb2ff); scene.add(figA, figB);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, fog: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
const blobs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 28), blobMat); m.renderOrder = 4; scene.add(m); return m; });

// helpers live on layer 1 so the peephole inset never shows them
const helpers = new THREE.Group(); scene.add(helpers);
class Tubes {
  constructor(max) { this.max = max; this.n = 0; this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ fog: false }), max); this.mesh.frustumCulled = false; this.mesh.layers.set(1); this.mesh.setColorAt(0, new THREE.Color(1, 1, 1)); helpers.add(this.mesh); }
  begin() { this.n = 0; }
  add(a, b, r, col) { if (this.n >= this.max) return; const d = _t1.copy(b).sub(a), len = d.length(); if (len < 1e-5) return; _q.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); _m.compose(_t2.copy(a).add(b).multiplyScalar(0.5), _q, _t3.set(r, len, r)); this.mesh.setMatrixAt(this.n, _m); this.mesh.setColorAt(this.n, _c.setRGB(col[0], col[1], col[2])); this.n++; }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
}
const UP = V(0, 1, 0), _t1 = V(), _t2 = V(), _t3 = V(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _c = new THREE.Color();
const fixed = new Tubes(60), dyn = new Tubes(80);
const eyeMark = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 10, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.35), fog: false })); const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), ring.material); eyeMark.add(ring, pupil); eyeMark.traverse((o) => o.layers.set(1)); helpers.add(eyeMark);
const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'varying vec3 vW; void main(){ vec2 g = abs(fract(vW.xz*0.5)-0.5); float l = smoothstep(0.46,0.5,max(g.x,g.y)); float r = length(vW.xz-vec2(-1.0,-3.5)); float f = smoothstep(30.0,5.0,r); gl_FragColor = vec4(vec3(0.3,0.95,0.75)*(0.02+0.2*l)*f, 1.0); }' }));
ground.rotation.x = -Math.PI / 2; ground.position.y = GY; ground.layers.set(1); helpers.add(ground);
const glow = new GlowPoints(500); glow.points.layers.set(1); helpers.add(glow.points);
const rnd = mulberry(11), dust = []; for (let i = 0; i < 260; i++) dust.push((rnd() - 0.5) * 30 - 1, GY + rnd() * 10, (rnd() - 0.5) * 30 - 3.5, rnd() * 6.28, rnd());

const corner = (i, c, out) => { const x = i & 1 ? R.x1 : R.x0, y = i & 2 ? R.y1 : R.y0, z = i & 4 ? R.zb : R.zf; return c === null ? out.set(x, y, z) : warp(out, x, y, z, c); };
const EDGES = []; for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) EDGES.push([i, i | b]);
function rebuildFixed(c) {
  const a = V(), b = V(); fixed.begin();
  for (const [i, j] of EDGES) fixed.add(corner(i, c, a), corner(j, c, b), 0.017, [0.22, 0.95, 0.68]);
  if (c > 0.004) for (const [i, j] of EDGES) fixed.add(corner(i, null, a), corner(j, null, b), 0.008, [0.5, 0.52, 0.58]);
  for (const i of [4, 5, 6, 7]) { corner(i, c, a); corner(i, null, b); fixed.add(V(0, 0, 0), a.length() > b.length() ? a : b, 0.006, [1.5, 1.05, 0.3]); }
  for (const i of [0, 1, 4, 5]) { corner(i, c, a); fixed.add(a, b.set(a.x, GY, a.z), 0.03, [0.1, 0.14, 0.14]); }
  fixed.end();
}

const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: isPhone() ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
const bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.34, 0.5, 0.93);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());

// ---------- layout: where the free area is, the peephole mask, the inset ----------
let W = 1, H = 1; const view = { cx: 0, cy: 0, R: 100, fw: 1, fh: 1 }; let pip = null;
function layout() {
  W = innerWidth; H = innerHeight; const ph = isPhone();
  if (st.step === 'title') { if (ph) Object.assign(view, { cx: W / 2, cy: H * 0.3, R: W * 0.46, fw: W, fh: H * 0.6 }); else Object.assign(view, { cx: W * 0.7, cy: H / 2, R: Math.min(W * 0.28, H * 0.45), fw: W * 0.6, fh: H }); }
  else if (ph) { const fh = H * 0.54 - 44; Object.assign(view, { cx: W / 2, cy: 44 + fh / 2, R: Math.min(W, fh) * 0.49, fw: W, fh }); }
  else { const fw = W - 460, fh = H - 70; Object.assign(view, { cx: fw / 2, cy: 60 + fh / 2, R: Math.min(fw, fh) * 0.49, fw, fh }); }
  const r = view.R; $('#peep').style.background = `radial-gradient(circle at ${view.cx}px ${view.cy}px, transparent ${r - 7}px, rgba(255,215,90,.5) ${r - 3}px, #010203 ${r}px)`;
  pip = ph ? { x: 8, y: 48, w: 132, h: 92 } : { x: 22, y: H - 214, w: 300, h: 190 };
  Object.assign($('#pip').style, { left: pip.x - 2 + 'px', top: pip.y - 2 + 'px', width: pip.w + 'px', height: pip.h + 'px' });
  eyeCam.aspect = pip.w / pip.h; eyeCam.fov = ph ? 50 : 42; eyeCam.updateProjectionMatrix();
}
function resize() { layout(); const pr = Math.min(devicePixelRatio || 1, isPhone() ? 1.5 : 2); renderer.setPixelRatio(pr); renderer.setSize(W, H, false); composer.setPixelRatio(pr); composer.setSize(W, H); camera.aspect = W / H; }
addEventListener('resize', resize);

// ---------- labels ----------
const labels = []; const labRoot = $('#labels');
function label(text, cls, pos, show) { const el = document.createElement('div'); el.className = 'lab ' + cls; el.textContent = text; labRoot.appendChild(el); labels.push({ el, pos, show }); }
const headA = V(), headB = V(), footA = V(), footB = V();
label('A', 'who a', () => _t1.copy(headA).setY(headA.y + 0.24), () => st.step !== 'title');
label('B', 'who b', () => _t1.copy(headB).setY(headB.y + 0.24), () => st.step !== 'title');
label('Peephole', 'small', () => _t1.set(0, 0.28, 0), () => cam.blend > 0.9 && !isPhone());
label('The box your eye assumes', 'note', () => corner(6, null, _t1).setY(R.y1 + 0.2), () => cam.blend > 0.9 && st.c > 0.05 && !isPhone() && st.step === 'reveal');
label('The real room', 'note', () => corner(6, st.c, _t1).add(_t2.set(0, 0.3, 0)), () => cam.blend > 0.9 && st.c > 0.05 && !isPhone() && st.step === 'reveal');
function placeLabels() {
  for (const L of labels) { let on = L.show(); if (on) { const p = L.pos().project(camera); const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H; on = p.z < 1 && x > 10 && x < W - 10 && y > (isPhone() ? 40 : 54) && y < H - 10; if (on) L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; } L.el.style.opacity = on ? 1 : 0; }
}

// ---------- plan view ----------
const pc = $('#planC'), px = pc.getContext('2d');
function drawPlan() {
  const S = 45.8, X = (x) => (x + 6.3) * S, Z = (z) => (z + 8.85) * S, c = st.c; px.clearRect(0, 0, 520, 440);
  px.font = '600 20px Inter, sans-serif'; px.fillStyle = '#a9c9d1'; px.fillText('PLAN VIEW', 14, 28);
  const poly = (cc, style, dash, lw) => { px.beginPath(); [[R.x0, R.zf], [R.x0, R.zb], [R.x1, R.zb], [R.x1, R.zf]].forEach(([x, z], i) => { const k = cc === null ? 1 : 1 / (1 + cc * x); px[i ? 'lineTo' : 'moveTo'](X(x * k), Z(z * k)); }); px.closePath(); px.setLineDash(dash); px.lineWidth = lw; px.strokeStyle = style; px.stroke(); px.setLineDash([]); };
  poly(null, 'rgba(200,205,215,.6)', [7, 7], 2); px.fillStyle = 'rgba(127,231,196,.1)'; poly(c, '#7fe7c4', [], 4); px.fill();
  const dot = (p, col, name) => { px.strokeStyle = col; px.lineWidth = 2; px.globalAlpha = 0.7; px.beginPath(); px.moveTo(X(0), Z(0)); px.lineTo(X(p.x), Z(p.z)); px.stroke(); px.globalAlpha = 1; px.fillStyle = col; px.beginPath(); px.arc(X(p.x), Z(p.z), 11, 0, 7); px.fill(); px.font = '700 22px Inter, sans-serif'; const t = `${name} ${f1(Math.hypot(p.x, p.z))} m`; const tx = clamp(X(p.x) - 40, 8, 400); px.fillText(t, tx, Z(p.z) - 18); };
  dot(footA, '#ff8b77', 'A'); dot(footB, '#6cc3ff', 'B');
  px.fillStyle = '#ffd75a'; px.beginPath(); px.arc(X(0), Z(0), 8, 0, 7); px.fill(); px.font = '600 18px Inter, sans-serif'; px.fillText('eye', X(0) + 14, Z(0) + 6);
}

// ---------- step logic ----------
const panel = $('#panelBody');
const seg = (name, opts, q, cls = 'one') => `<div class="seg ${cls}">${opts.map((o, i) => `<label><input type="radio" name="${name}" value="${i}" ${q.sel === i ? 'checked' : ''} ${q.done ? 'disabled' : ''}><span>${o}</span></label>`).join('')}</div>`;
const nextBtn = (label, on = true) => `<div class="row"><button class="btn pri" data-act="next" ${on ? '' : 'disabled'}>${label}</button></div>`;
const order = (n, seed) => { const r = mulberry(seed), a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const Q1ORD = order(3, 7), Q4ORD = order(4, 3);
const q1Ans = () => { const m = measure(CHALF); let b = 0; Q1.vals.forEach((v, i) => { if (Math.abs(v - m.far) < Math.abs(Q1.vals[b] - m.far)) b = i; }); return b; };

function render() {
  const s = st.step; document.body.dataset.state = s; layout();
  document.querySelectorAll('#steps li').forEach((li, i) => { const k = STEPS.indexOf(s); li.className = i === k ? 'cur' : i < k ? 'done' : ''; });
  let h = ''; const m = measure(st.c, 1);
  if (s === 'look') {
    h = `<p class="kick">Step 1 of 6</p><h2 tabindex="-1">Look through the peephole</h2><p>You are looking with one eye through a small hole in the wall. Two people stand in the back corners of a room.</p>`;
    h += `<fieldset class="q"><legend>Before anything else: who is taller?</legend>${seg('guess', ['A is taller', 'B is taller', 'They are the same'], { sel: st.guess, done: st.guess !== null }, '')}</fieldset>`;
    if (st.guess !== null && !st.swapped) h += `<p>Noted. Now have them trade corners and watch.</p><div class="row"><button class="btn pri" data-act="swap" ${st.moving ? 'disabled' : ''}>Trade corners</button></div>`;
    if (st.swapped) {
      h += `<p>Same two people. Each one is ${R.person} m tall in either corner.</p>`;
      h += `<fieldset class="q"><legend>B now looks about half as tall as A. If they are the same height, where must B be standing?</legend>${seg('q1', Q1ORD.map((i) => Q1.opts[i]), { sel: st.q1.sel === null ? null : Q1ORD.indexOf(st.q1.sel), done: st.q1.done })}</fieldset>`;
      if (st.q1.done) h += `<p class="fb ${st.q1.first ? 'good' : ''}">${st.q1.first ? 'Yes. ' : 'B is about twice as far away. '}The image an object casts in the eye shrinks in proportion to its distance. Half the image height means twice the distance. Measured in this scene, A is ${f1(m.A.dist)} m from the peephole and B is ${f1(m.B.dist)} m.</p>` + nextBtn('Step away from the peephole');
      else if (st.q1.tries) h += `<p class="fb bad">${Q1.hint}</p>`;
    }
  } else if (s === 'reveal') {
    const a = V(), b = V(); corner(4, st.c, a); corner(5, st.c, b);
    h = `<p class="kick">Step 2 of 6</p><h2 tabindex="-1">The room is not a box</h2><p>Drag to look around. The back wall runs at a slant. Its left corner is ${f1(Math.hypot(a.x, a.z))} m from the peephole and its right corner is ${f1(Math.hypot(b.x, b.z))} m. The floor drops ${f1(b.y - a.y)} m from right to left.</p>
    <p>The gold lines run from the peephole through each real corner to the corner of an ordinary box room, drawn in gray. Every point of the real room sits on the same line of sight as a point of the box. From the peephole the two rooms cast the same image.</p>
    <p>The gold frame shows the peephole view. It has not changed.</p>
    <div class="row"><button class="chip" data-act="walk" aria-pressed="${st.auto}">${st.auto ? 'Stop walking' : 'Make them walk'}</button></div>
    <p class="mis">Adelbert Ames Jr. designed this room in the 1930s. Psychologists call the real room and the box equivalent configurations: different layouts that send the eye the same image.</p>
    <p class="src">${cite('sage')} · ${cite('behrens')}</p>${nextBtn('Which cues fooled you?')}`;
  } else if (s === 'cues') {
    const k = st.cue.i, C = CUES[k];
    h = `<p class="kick">Step 3 of 6</p><h2 tabindex="-1">Three cues that lied</h2><p>A monocular cue is depth information that needs only one eye. This room is built to feed one eye false ones. Name the cue behind each highlighted feature.</p><div class="prog"><i style="width:${((k + (st.cue.done ? 1 : 0)) / 3) * 100}%"></i></div>`;
    h += `<fieldset class="q"><legend>${k + 1} of 3. ${C.q}</legend>${seg('cue', CUE_OPTS, st.cue, 'four')}</fieldset>`;
    if (st.cue.done) h += `<p class="fb ${st.cue.first[k] ? 'good' : ''}">${C.ok}</p>` + nextBtn(k < 2 ? 'Next feature' : 'Build your own room');
    else if (st.cue.tries) h += `<p class="fb bad">${C.no[st.cue.sel]}</p>`;
    if (k === 2 && st.cue.done) h += `<p class="src">Linear perspective and relative size: ${cite('osx')}. Texture gradient and height in the field are standard in perception courses.</p>`;
  } else if (s === 'build') {
    const B = st.build;
    h = `<p class="kick">Step 4 of 6</p><h2 tabindex="-1">Build your own</h2><p>The slider bends the room. At zero it is an ordinary box and the two people look equal. Watch the gold frame while you drag. The room in it never changes. Only the people do.</p>
    <p><b>Your job:</b> set the room so B looks half as tall as A. The plan view gives each person's distance from the peephole.</p>
    <label class="sl"><span>Distortion <b id="cVal">${Math.round((st.cT / CMAX) * 100)}</b></span><input type="range" id="cSl" min="0" max="${CMAX}" step="0.002" value="${st.cT}" ${B.done ? 'disabled' : ''} aria-label="Room distortion"><small><span>box</span><span>extreme</span></small></label>`;
    if (!B.done) h += `<div class="row"><button class="btn pri" data-act="check">Check</button><button class="btn" data-act="showBuild">Show me</button></div>`;
    if (B.msg) h += `<p class="fb ${B.kind}">${B.msg}</p>`;
    if (B.done) h += `<p>There is no single Ames room. Every slider position is a different room, and from the peephole every one of them looks like the same box.</p>` + nextBtn('Now break it');
  } else if (s === 'break') {
    const q = st.brk.q;
    h = `<p class="kick">Step 5 of 6</p><h2 tabindex="-1">Break the illusion</h2><p>The room works from one point, with one eye, held still. You are back at the peephole with the wall taken away. Drag in the view to move your head.</p>
    <div class="row"><button class="chip" data-act="sway" aria-pressed="${st.brk.sway}">${st.brk.sway ? 'Stop swaying' : 'Sway for me'}</button><button class="chip" data-act="center">Back to the peephole</button><button class="chip" data-act="lights" aria-pressed="${!st.brk.lights}">${st.brk.lights ? 'Hide the room' : 'Show the room'}</button></div>`;
    if (!st.brk.lights) h += `<p class="hint">With the room hidden, nothing on screen says the two people are equally far away.</p>`;
    if (st.brk.moved) {
      h += `<fieldset class="q"><legend>As your head moved, near surfaces slid across the view faster than far ones, and the wall's slant showed. Which depth cue is that?</legend>${seg('q4', Q4ORD.map((i) => Q4.opts[i]), { sel: q.sel === null ? null : Q4ORD.indexOf(q.sel), done: q.done }, 'four')}</fieldset>`;
      if (q.done) h += `<p class="fb ${q.first ? 'good' : ''}">${Q4.ok}</p><p>Opening the second eye adds binocular disparity: two viewpoints a few centimeters apart, both at once. A flat screen cannot show you that one.</p><p class="src">Monocular and binocular cues: ${cite('osx')}. Motion parallax is not in the OpenStax section.</p>` + nextBtn('Debrief');
      else if (q.tries) h += `<p class="fb bad">${Q4.no[q.sel]}</p>`;
    } else h += `<p class="hint">Move your head at least a little to continue.</p>`;
  } else if (s === 'debrief') {
    const pts = [st.q1.first, ...[0, 1, 2].map((i) => st.cue.first[i]), st.build.ok && !st.build.shown, st.brk.q.first], n = pts.filter(Boolean).length;
    const g = ['A', 'B', 'neither'][st.guess ?? 2];
    h = `<p class="kick">Step 6 of 6</p><h2 tabindex="-1">Debrief</h2><p class="big2">${n} of 6 on the first try</p>
    <ul class="obj"><li class="${pts[0] ? 'ok' : 'no'}"><span class="mark">${pts[0] ? '✓' : '·'}</span><div>Predict image size from distance<small>${st.guess === null ? 'No opening guess recorded.' : `Your opening guess: ${g === 'neither' ? 'they are the same height' : g + ' is taller'}. They are the same height.`} ${st.q1.tries > 1 || st.q1.first === false ? 'You needed the hint on the distance question.' : ''}</small></div></li>
    <li class="${pts[1] && pts[2] && pts[3] ? 'ok' : 'no'}"><span class="mark">${pts[1] && pts[2] && pts[3] ? '✓' : '·'}</span><div>Identify the monocular cues<small>${[0, 1, 2].filter((i) => pts[i + 1]).length} of 3 named on the first try.</small></div></li>
    <li class="${pts[4] ? 'ok' : 'no'}"><span class="mark">${pts[4] ? '✓' : '·'}</span><div>Apply the size and distance rule<small>${st.build.shown ? 'The room was set for you with Show me.' : st.build.ok ? `You set the room in ${st.build.tries} ${st.build.tries === 1 ? 'check' : 'checks'}.` : 'Not completed.'}</small></div></li>
    <li class="${pts[5] ? 'ok' : 'no'}"><span class="mark">${pts[5] ? '✓' : '·'}</span><div>Explain why it needs one fixed eye<small>${st.brk.sway && !st.brk.dragged ? 'The head movement was shown to you.' : 'You moved your own head.'}</small></div></li></ul>
    <h3>Your answers, in the order you gave them</h3><ul class="try">${trail().map((t) => `<li>${t}</li>`).join('')}</ul>
    <p class="hint">First answers are kept even when a second try was right.</p>${EF.html()}
    <h3>Same geometry, other fields</h3><div class="cards">${FIELDS.map((f) => `<div class="cardf"><h4>${f.h}</h4><p>${f.p}${f.k ? ` <span class="src">${cite(f.k)}</span>` : ''}</p></div>`).join('')}</div>
    <h3>Take it further</h3><p>A phone camera has one lens. Two same-sized objects appear in one photo, and one image is half the height of the other. What can the photo tell you about where they are, and what can it not?</p>
    <div class="row"><button class="btn" data-act="again">Play again</button><button class="btn" data-act="about">Sources and method</button></div>`;
  }
  panel.innerHTML = h;
  $('#hint').textContent = s === 'break' ? 'Drag to move your head' : 'Drag to look around'; $('#hint').classList.toggle('on', ['reveal', 'build', 'break'].includes(s) && !isPhone());
}
function focusH() { const h2 = panel.querySelector('h2'); if (h2) h2.focus({ preventScroll: true }); $('#panel').scrollTop = 0; }

function go(step) {
  st.step = step; cam.spin = false; st.brk.sway = false; room.group.visible = true; st.brk.lights = true;
  if (step === 'title') { cam.blendT = 0; st.auto = true; st.cT = CHALF; }
  if (step === 'look') { cam.blendT = 0; cam.eye.set(0, 0, 0); st.auto = false; st.sT = st.swapped ? 1 : 0; if (!st.swapped) st.s = 0; st.cT = st.c = CHALF; }
  if (step === 'reveal') { cam.blendT = 1; cam.yawT = 0.62; cam.pitchT = 0.62; st.auto = false; st.sT = 1; st.cT = CHALF; }
  if (step === 'cues') { cam.blendT = 1; st.auto = false; st.sT = 1; st.cT = CHALF; cueView(); }
  if (step === 'build') { cam.blendT = 1; cam.yawT = 0.35; cam.pitchT = 0.85; st.auto = false; st.sT = 1; if (!st.build.done) st.cT = 0; }
  if (step === 'break') { cam.blendT = 0; cam.eye.set(0, 0, 0); st.auto = false; st.sT = 1; st.cT = CHALF; }
  if (step === 'debrief') { cam.blendT = 1; cam.pitchT = 0.5; cam.spin = true; st.auto = true; st.cT = CHALF; }
  render(); focusH();
}
function cueView() { const v = CUES[st.cue.i].view; cam.yawT = v[0]; cam.pitchT = v[1]; }
function answer(name, i) {
  if (name === 'guess') { if (st.guess === null) { st.guess = i; log('guess', { i }); } }
  else if (name === 'q1') { const q = st.q1; if (q.done) return; q.sel = Q1ORD[i]; q.tries++; const ok = q.sel === q1Ans(); if (q.first === null) q.first = ok; if (ok || q.tries > 1) q.done = true; log('q1', { sel: q.sel, ok }); }
  else if (name === 'cue') { const q = st.cue; if (q.done) return; q.sel = i; q.tries++; const ok = i === CUES[q.i].ans; if (q.first[q.i] === undefined) q.first[q.i] = ok; if (ok) q.done = true; log('cue', { k: q.i, sel: i, ok }); }
  else if (name === 'q4') { const q = st.brk.q; if (q.done) return; q.sel = Q4ORD[i]; q.tries++; const ok = q.sel === Q4.ans; if (q.first === null) q.first = ok; if (ok || q.tries > 1) q.done = true; log('q4', { sel: q.sel, ok }); }
  render();
}
function act(a) {
  if (a === 'begin') go('look');
  else if (a === 'about') { $('#aboutBody').innerHTML = ABOUT; $('#modal').hidden = false; $('#modalClose').focus(); }
  else if (a === 'closeAbout') $('#modal').hidden = true;
  else if (a === 'swap') { st.sT = 1; st.moving = true; render(); }
  else if (a === 'walk') { st.auto = !st.auto; if (!st.auto) st.sT = 1; render(); }
  else if (a === 'check' || a === 'showBuild') {
    const B = st.build;
    if (a === 'showBuild') { B.shown = true; st.cT = CHALF; st.c = st.c; const m = measure(CHALF); B.done = true; B.kind = ''; B.msg = `Set for you. B is ${f1(m.B.dist)} m from the peephole and A is ${f1(m.A.dist)} m. That is ${f1(m.far)} times as far, so B's image is ${f2(m.img)} the height of A's.`; log('build', { shown: true }); }
    else { B.tries++; if (B.tries > 1) EF.extra('Extra room checks'); const m = measure(st.cT); log('build', { c: st.cT, img: m.img });
      if (Math.abs(m.img - 0.5) <= 0.035) { B.done = true; B.ok = true; B.kind = 'good'; B.msg = `That does it. B is ${f1(m.B.dist)} m away and A is ${f1(m.A.dist)} m. That is ${f1(m.far)} times as far, and B's image measures ${f2(m.img)} the height of A's.`; }
      else { B.kind = 'bad'; B.msg = B.tries === 1 ? `Not yet. B's image is ${f2(m.img)} the height of A's. Image height goes as one over distance. How many times as far must B be?` : `B's image is ${f2(m.img)} the height of A's. For half the height B must be twice as far as A. Right now B is ${f1(m.far)} times as far. ${m.img > 0.5 ? 'Bend the room more.' : 'Bend the room less.'}`; } }
    render();
  }
  else if (a === 'sway') { st.brk.sway = !st.brk.sway; if (st.brk.sway) st.brk.t0 = clock; render(); }
  else if (a === 'center') { st.brk.sway = false; cam.eye.set(0, 0, 0); render(); }
  else if (a === 'lights') { st.brk.lights = !st.brk.lights; room.group.visible = st.brk.lights; render(); }
  else if (a === 'again') { Object.assign(st, { guess: null, swapped: false, q1: { sel: null, tries: 0, first: null, done: false }, cue: { i: 0, sel: null, tries: 0, done: false, first: [] }, build: { tries: 0, done: false, shown: false, ok: false, msg: '', kind: '' }, brk: { moved: false, sway: false, lights: true, q: { sel: null, tries: 0, first: null, done: false } }, log: [], s: 0 }); go('look'); }
  else if (a === 'next') {
    if (st.step === 'cues') { if (st.cue.i < 2) { st.cue.i++; st.cue.sel = null; st.cue.tries = 0; st.cue.done = false; cueView(); render(); focusH(); } else go('build'); }
    else go(STEPS[STEPS.indexOf(st.step) + 1]);
  }
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act); else if (e.target.id === 'modal') act('closeAbout'); });
document.addEventListener('change', (e) => { if (e.target.type === 'radio') answer(e.target.name, +e.target.value); });
document.addEventListener('input', (e) => { if (e.target.id === 'cSl') { st.c = st.cT = +e.target.value; $('#cVal').textContent = Math.round((st.cT / CMAX) * 100); if (st.build.msg && !st.build.done) { st.build.msg = ''; const fb = panel.querySelector('.fb'); if (fb) fb.remove(); } } });
addEventListener('keydown', (e) => { if (e.key === 'Escape') act('closeAbout'); if (document.activeElement !== canvas) return; const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (d) { drag(d[0] * 24, d[1] * 24); e.preventDefault(); } });

// ---------- pointer ----------
let down = null;
function drag(dx, dy) {
  if (st.step === 'break') { cam.eye.x = clamp(cam.eye.x + dx * 0.004, -1.2, 1.2); cam.eye.y = clamp(cam.eye.y - dy * 0.004, -0.5, 0.6); st.brk.sway = false; st.brk.dragged = true; }
  else if (cam.blendT === 1) { cam.yawT = cam.yaw = cam.yaw - dx * 0.005; cam.pitchT = cam.pitch = clamp(cam.pitch + dy * 0.004, 0.06, 1.38); cam.spin = false; }
}
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (!down) return; drag(e.clientX - down.x, e.clientY - down.y); down.x = e.clientX; down.y = e.clientY; });
canvas.addEventListener('pointerup', () => { down = null; }); canvas.addEventListener('pointercancel', () => { down = null; });
canvas.addEventListener('wheel', (e) => { if (cam.blendT === 1) { cam.zoom = clamp(cam.zoom * (1 + e.deltaY * 0.001), 0.55, 1.5); e.preventDefault(); } }, { passive: false });

// ---------- simulation tick ----------
let clock = 0, lastC = -1;
const eyeQ = new THREE.Quaternion(), orbQ = new THREE.Quaternion(), orbP = V(), tgt = V(), mm = new THREE.Matrix4();
function tick(dt) {
  clock += dt;
  // room bend
  const dc = st.cT - st.c; st.c = Math.abs(dc) < 2e-4 ? st.cT : st.c + dc * Math.min(1, dt * 3.2);
  if (st.c !== lastC) { room.update(st.c); rebuildFixed(st.c); lastC = st.c; }
  // walking
  const ds = st.sT - st.s, sp = dt / (reduce ? 0.8 : 4.6);
  if (Math.abs(ds) > 1e-4) { st.s += clamp(ds, -sp, sp); st.moving = true; st.walkPh += dt * 7.5; }
  else if (st.moving) { st.moving = false; st.s = st.sT; if (st.step === 'look' && st.sT === 1 && !st.swapped) { st.swapped = true; render(); } st.wait = 1.4; }
  else if (st.auto) { st.wait -= dt; if (st.wait <= 0) st.sT = st.sT > 0.5 ? 0 : 1; }
  const A = person('A', st.c, st.s), B = person('B', st.c, st.s);
  footA.copy(A.foot); footB.copy(B.foot); headA.copy(A.head); headB.copy(B.head);
  const n = _t3.set(-1.5 * st.c, 1, 0).normalize();
  [[figA, A, 1], [figB, B, -1]].forEach(([f, p, dir], i) => {
    f.position.copy(p.foot); const mv = st.moving ? Math.sign(st.sT - st.s) * dir : 0;
    const face = mv ? Math.atan2(mv, 0.0001) : Math.atan2(-p.foot.x, -p.foot.z); let d = face - f.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.rotation.y += d * Math.min(1, dt * 6);
    f.userData.walk(st.walkPh + i * Math.PI, st.moving ? 1 : 0);
    blobs[i].position.copy(p.foot).addScaledVector(n, 0.012); blobs[i].quaternion.setFromUnitVectors(_t1.set(0, 0, 1), n);
  });
  // head
  if (st.step === 'break') { if (st.brk.sway) { const t = clock - st.brk.t0; cam.eye.x = 0.8 * Math.sin(t * 1.3); cam.eye.y = 0.15 * Math.sin(t * 0.9); } if (!st.brk.moved && Math.hypot(cam.eye.x, cam.eye.y) > 0.3) { st.brk.moved = true; log('moved', { sway: st.brk.sway }); render(); } }
  // camera
  const db = cam.blendT - cam.blend; if (Math.abs(db) > 1e-4) cam.blend += clamp(db, -dt / 3.4, dt / 3.4); else cam.blend = cam.blendT;
  if (cam.spin) cam.yawT += dt * 0.12;
  cam.yaw += (cam.yawT - cam.yaw) * Math.min(1, dt * 2.5); cam.pitch += (cam.pitchT - cam.pitch) * Math.min(1, dt * 2.5);
}
function pose() {
  const e = ease(cam.blend), ph = isPhone();
  const fEye = view.R / Math.tan(31 * Math.PI / 180), fovEye = 2 * Math.atan(H / 2 / fEye) * 180 / Math.PI, fovOrb = 38;
  mm.lookAt(cam.eye, LOOK, UP); eyeQ.setFromRotationMatrix(mm);
  tgt.set(-4.9 * st.c, -0.5, -2.4 - 6.8 * st.c);
  const t = Math.tan(fovOrb * Math.PI / 360), w = (6.5 + 16 * st.c) * (ph ? 0.7 : 1), hh = 6.2;
  const d = Math.max(hh * H / (2 * t * view.fh), w * H / (2 * t * view.fw)) * cam.zoom;
  orbP.set(tgt.x + d * Math.sin(cam.yaw) * Math.cos(cam.pitch), tgt.y + d * Math.sin(cam.pitch), tgt.z + d * Math.cos(cam.yaw) * Math.cos(cam.pitch));
  if (orbP.y < GY + 0.4) orbP.y = GY + 0.4;
  mm.lookAt(orbP, tgt, UP); orbQ.setFromRotationMatrix(mm);
  camera.position.lerpVectors(cam.eye, orbP, e); camera.quaternion.slerpQuaternions(eyeQ, orbQ, e); camera.fov = lerp(fovEye, fovOrb, e);
  camera.setViewOffset(W, H, W / 2 - view.cx, H / 2 - view.cy, W, H); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  scene.fog.density = Math.min(0.02, 0.3 / Math.max(6, d));
}
function draw() {
  pose();
  const s = st.step, out = cam.blend > 0.02, mask = (s === 'title' || s === 'look') ? 1 : 0;
  helpers.visible = out; $('#peep').style.opacity = mask * (1 - clamp(cam.blend * 4, 0, 1));
  eyeMark.lookAt(LOOK);
  // per frame tubes: sight lines to the heads, and the cue highlight
  dyn.begin(); const O = V(0, 0, 0), a = V(), b = V();
  if (out) {
    dyn.add(O, headA, 0.006, [1.5, 0.5, 0.4]); dyn.add(O, headB, 0.006, [0.35, 0.8, 1.6]);
    if (s === 'cues' && !reduce || s === 'cues') {
      const p = 1 + 0.3 * Math.sin(clock * 5), col = [1.15 * p, 0.9 * p, 0.3 * p], id = CUES[st.cue.i].id, c = st.c, y = R.y0 + 0.012;
      if (id === 'floor') { for (let i = 0; i <= room.tiles.NX; i++) { const x = R.x0 + i * room.tiles.tw; dyn.add(warp(a, x, y, R.zb, c), warp(b, x, y, R.zf, c), 0.014, col); } for (let j = 0; j <= room.tiles.NZ; j++) { const z = R.zb + j * room.tiles.td; dyn.add(warp(a, R.x0, y, z, c), warp(b, R.x1, y, z, c), 0.014, col); } }
      if (id === 'windows') { const z = R.zb + 0.012, box = (x0, x1, y0, y1) => [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].forEach(([p0, q0, p1, q1]) => dyn.add(warp(a, p0, q0, z, c), warp(b, p1, q1, z, c), 0.018, col)); for (const [x0, x1] of room.windows) box(x0, x1, -0.38, 0.78); box(R.x0, R.x1, R.y0, R.y1); }
      if (id === 'people') for (const [f, hd] of [[footA, headA], [footB, headB]]) { a.copy(f).add(_t1.set(0.34, 0, 0)); b.copy(hd).add(_t1); dyn.add(a, b, 0.022, col); dyn.add(_t2.copy(a).add(_t3.set(-0.12, 0, 0)), _t3.copy(a).add(V(0.12, 0, 0)), 0.022, col); dyn.add(_t2.copy(b).add(V(-0.12, 0, 0)), V().copy(b).add(V(0.12, 0, 0)), 0.022, col); }
    }
    glow.begin(); for (let i = 0; i < dust.length; i += 5) glow.add(dust[i] + Math.sin(clock * 0.2 + dust[i + 3]) * 0.6, dust[i + 1] + Math.sin(clock * 0.13 + dust[i + 3] * 2) * 0.5, dust[i + 2], 0.25, 0.75, 0.6, 0.05 + dust[i + 4] * 0.07); glow.end(); glow.mat.uniforms.uScale.value = H * 0.9;
  }
  dyn.end();
  room.cull(out ? camera.position : null);
  composer.render();
  const showPip = out && cam.blend > 0.6 && ['reveal', 'cues', 'build'].includes(s); $('#pip').style.display = showPip ? 'block' : 'none';
  const showPlan = ['reveal', 'cues', 'build', 'debrief'].includes(s) && cam.blend > 0.5; $('#plan').style.display = showPlan ? 'block' : 'none';
  if (showPip) { room.cull(null); renderer.setRenderTarget(null); renderer.setViewport(pip.x, H - pip.y - pip.h, pip.w, pip.h); renderer.setScissor(pip.x, H - pip.y - pip.h, pip.w, pip.h); renderer.setScissorTest(true); renderer.clear(); renderer.render(scene, eyeCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, W, H); }
  if (showPlan) drawPlan();
  placeLabels();
}
let last = performance.now();
function frame(now) { const dt = Math.min(DTCAP, (now - last) / 1000); last = now; tick(dt); draw(); requestAnimationFrame(frame); }

// ---------- test hook ----------
window.__demo = { go, act, answer, tick, draw, measure, CHALF, CMAX, st, cam,
  warm(sec) { for (let t = 0; t < sec; t += 0.05) tick(0.05); draw(); },
  setC(c) { st.c = st.cT = c; const sl = $('#cSl'); if (sl) sl.value = c; },
  state: () => ({ step: st.step, c: st.c, s: st.s, blend: cam.blend, guess: st.guess, swapped: st.swapped, q1: st.q1, cue: st.cue, build: st.build, brk: st.brk, m: (() => { const m = measure(st.c, st.s); return { img: m.img, far: m.far, dA: m.A.dist, dB: m.B.dist }; })(), q1Ans: q1Ans(), log: st.log.length }),
  // the invariant: project every room vertex from the eye for two bends and compare directions
  invariant() { let worst = 0; const p = V(), q = V(); for (const c of [0, 0.07, 0.15, CMAX]) { for (let i = 0; i < 4000; i++) { const x = R.x0 + Math.random() * 4, y = R.y0 + Math.random() * 2.6, z = R.zb + Math.random() * 3.5; p.set(x, y, z).normalize(); warp(q, x, y, z, c).normalize(); worst = Math.max(worst, p.distanceTo(q)); } } return worst; } };

resize(); room.update(st.c); rebuildFixed(st.c); lastC = st.c; render(); requestAnimationFrame(frame);
