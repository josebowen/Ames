// The room. Everything is authored as flat quads in the box room the eye assumes ("apparent" space,
// eye at the origin), then moved along its line of sight by X' = X / (1 + c x). That map sends planes
// to planes and keeps every point on the same ray from the eye, so the image at the eye never changes.
import * as THREE from 'three';
export const ROOM = { x0: -2, x1: 2, y0: -1.5, y1: 1.1, zf: -0.7, zb: -4.2, eyeY: 1.5, person: 1.65 };
export const warp = (out, x, y, z, c) => { const k = 1 / (1 + c * x); return out.set(x * k, y * k, z * k); };
const R = ROOM;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildRoom() {
  const group = new THREE.Group();
  const surfaces = {};
  const mats = [0, 1, 2].map((l) => new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide, polygonOffset: l > 0, polygonOffsetFactor: -2 * l, polygonOffsetUnits: -2 * l }));
  const bufs = {};
  const S = (name, p3, own) => { surfaces[name] = { name, p3, own, meshes: [] }; bufs[name] = [[], [], []].map(() => ({ app: [], col: [] })); };
  S('floor', [[0, R.y0, -1], [1, R.y0, -1], [0, R.y0, -2]], 'y0');
  S('ceil', [[0, R.y1, -1], [1, R.y1, -1], [0, R.y1, -2]], 'y1');
  S('back', [[0, 0, R.zb], [1, 0, R.zb], [0, 1, R.zb]], 'zb');
  S('left', [[R.x0, 0, -1], [R.x0, 1, -1], [R.x0, 0, -2]], 'x0');
  S('right', [[R.x1, 0, -1], [R.x1, 1, -1], [R.x1, 0, -2]], 'x1');
  // painted light: darker toward corners and the open front, brighter near the windows
  const shade = (p, own) => {
    let s = 1;
    if (own !== 'y0') s *= 0.74 + 0.26 * sm(0, 1.1, p[1] - R.y0);
    if (own !== 'y1') s *= 0.78 + 0.22 * sm(0, 0.9, R.y1 - p[1]);
    if (own !== 'x0') s *= 0.8 + 0.2 * sm(0, 1.0, p[0] - R.x0);
    if (own !== 'x1') s *= 0.8 + 0.2 * sm(0, 1.0, R.x1 - p[0]);
    if (own !== 'zb') s *= 0.82 + 0.18 * sm(0, 1.2, p[2] - R.zb);
    s *= 0.8 + 0.3 * sm(R.zf, R.zb, p[2]);
    return s;
  };
  const quad = (name, level, a, b, c, d, col, nu = 1, nv = 1, flat = false) => {
    const buf = bufs[name][level], own = surfaces[name].own;
    const P = (u, v) => [0, 1, 2].map((i) => (a[i] * (1 - u) + b[i] * u) * (1 - v) + (d[i] * (1 - u) + c[i] * u) * v);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const q = [P(i / nu, j / nv), P((i + 1) / nu, j / nv), P((i + 1) / nu, (j + 1) / nv), P(i / nu, (j + 1) / nv)];
      for (const k of [0, 1, 2, 0, 2, 3]) { const p = q[k]; buf.app.push(p[0], p[1], p[2]); const s = flat ? 1 : shade(p, own); buf.col.push(col[0] * s, col[1] * s, col[2] * s); }
    }
  };
  const C = { cream: [0.74, 0.7, 0.62], ink: [0.05, 0.055, 0.07], wall: [0.09, 0.3, 0.3], wain: [0.5, 0.47, 0.41], trim: [0.72, 0.69, 0.62], base: [0.2, 0.19, 0.17], ceil: [0.46, 0.48, 0.47], beam: [0.2, 0.15, 0.11], gold: [0.75, 0.56, 0.2], art1: [0.5, 0.13, 0.1], art2: [0.1, 0.17, 0.42], glassHi: [1.0, 1.2, 1.45], glassLo: [1.3, 1.08, 0.88] };
  // floor: checkerboard, one quad per tile
  const NX = 8, NZ = 7, tw = (R.x1 - R.x0) / NX, td = (R.zf - R.zb) / NZ;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = R.x0 + i * tw, z = R.zb + j * td;
    quad('floor', 0, [x, R.y0, z], [x + tw, R.y0, z], [x + tw, R.y0, z + td], [x, R.y0, z + td], (i + j) % 2 ? C.cream : C.ink, 2, 2);
  }
  // ceiling with beams
  quad('ceil', 0, [R.x0, R.y1, R.zb], [R.x1, R.y1, R.zb], [R.x1, R.y1, R.zf], [R.x0, R.y1, R.zf], C.ceil, 10, 8);
  for (let j = 0; j < 5; j++) { const z = R.zb + 0.45 + j * 0.7; quad('ceil', 1, [R.x0, R.y1, z], [R.x1, R.y1, z], [R.x1, R.y1, z + 0.11], [R.x0, R.y1, z + 0.11], C.beam, 8, 1); }
  // a wall = baseboard, wainscot, rail, wall, crown. u runs along the wall, f maps (u, y) to a point
  const wall = (name, f, nu) => {
    const band = (ya, yb, col, nv) => quad(name, 0, f(0, ya), f(1, ya), f(1, yb), f(0, yb), col, nu, nv);
    band(R.y0, R.y0 + 0.13, C.base, 1); band(R.y0 + 0.13, -0.6, C.wain, 3); band(-0.6, -0.53, C.trim, 1); band(-0.53, R.y1 - 0.1, C.wall, 6); band(R.y1 - 0.1, R.y1, C.trim, 1);
  };
  const fb = (u, y) => [R.x0 + u * (R.x1 - R.x0), y, R.zb], fl = (u, y) => [R.x0, y, R.zf + u * (R.zb - R.zf)], fr = (u, y) => [R.x1, y, R.zb + u * (R.zf - R.zb)];
  wall('back', fb, 12); wall('left', fl, 10); wall('right', fr, 10);
  // windows on the back wall: frame, then four bright panes
  const windows = [[-1.55, -0.5], [0.5, 1.55]];
  for (const [xa, xb] of windows) {
    const ya = -0.38, yb = 0.78, m = 0.07, xm = (xa + xb) / 2, ym = (ya + yb) / 2;
    quad('back', 1, [xa, ya, R.zb], [xb, ya, R.zb], [xb, yb, R.zb], [xa, yb, R.zb], C.trim, 2, 2);
    const pane = (x0, x1, y0, y1, col) => quad('back', 2, [x0, y0, R.zb], [x1, y0, R.zb], [x1, y1, R.zb], [x0, y1, R.zb], col, 1, 1, true);
    pane(xa + m, xm - m / 2, ym + m / 2, yb - m, C.glassHi); pane(xm + m / 2, xb - m, ym + m / 2, yb - m, C.glassHi);
    pane(xa + m, xm - m / 2, ya + m, ym - m / 2, C.glassLo); pane(xm + m / 2, xb - m, ya + m, ym - m / 2, C.glassLo);
  }
  const framed = (name, f, ua, ub, ya, yb, art) => { const m = 0.06, mu = m / 3.5; quad(name, 1, f(ua, ya), f(ub, ya), f(ub, yb), f(ua, yb), C.gold, 1, 1); quad(name, 2, f(ua + mu, ya + m), f(ub - mu, ya + m), f(ub - mu, yb - m), f(ua + mu, yb - m), art, 2, 2); };
  framed('back', (u, y) => [u, y, R.zb], -0.26, 0.26, -0.2, 0.62, C.art1);
  framed('left', fl, 0.5, 0.8, -0.2, 0.55, C.art2); framed('right', fr, 0.2, 0.5, -0.2, 0.55, C.art1);
  // meshes
  const all = [];
  for (const name in surfaces) bufs[name].forEach((b, l) => {
    if (!b.app.length) return;
    const g = new THREE.BufferGeometry(); const app = new Float32Array(b.app);
    const pos = new THREE.BufferAttribute(new Float32Array(app.length), 3); pos.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', pos); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.col), 3));
    const m = new THREE.Mesh(g, mats[l]); m.frustumCulled = false; m.renderOrder = l; group.add(m); surfaces[name].meshes.push(m); all.push({ app, pos });
  });
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b2 = new THREE.Vector3(), c2 = new THREE.Vector3(), inside = new THREE.Vector3();
  function update(c) {
    for (const { app, pos } of all) { const o = pos.array; for (let i = 0; i < app.length; i += 3) { const k = 1 / (1 + c * app[i]); o[i] = app[i] * k; o[i + 1] = app[i + 1] * k; o[i + 2] = app[i + 2] * k; } pos.needsUpdate = true; }
    warp(inside, 0, -0.2, -2.5, c);
    for (const name in surfaces) { const s = surfaces[name]; warp(a, ...s.p3[0], c); warp(b2, ...s.p3[1], c); warp(c2, ...s.p3[2], c);
      s.n = (s.n || new THREE.Vector3()).copy(b2).sub(a).cross(v.copy(c2).sub(a)).normalize(); s.d = s.n.dot(a); if (s.n.dot(inside) - s.d < 0) { s.n.negate(); s.d = -s.d; } }
  }
  // hide any wall the camera is behind, so the room reads as a cutaway
  function cull(camPos) { for (const name in surfaces) { const s = surfaces[name], vis = !camPos || s.n.dot(camPos) - s.d > -0.02; for (const m of s.meshes) m.visible = vis; } }
  return { group, surfaces, update, cull, windows, tiles: { NX, NZ, tw, td } };
}
