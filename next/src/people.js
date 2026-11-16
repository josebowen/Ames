import * as THREE from 'three';
// A simple mannequin, 1.65 m tall, feet at y = 0.
export function makeFigure(color, H = 1.65) {
  const g = new THREE.Group(), k = H / 1.65;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, emissive: color, emissiveIntensity: 0.16 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b303b, roughness: 0.7, emissive: 0x2b303b, emissiveIntensity: 0.25 });
  const cap = (r, len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  const torso = cap(0.135, 0.36, mat); torso.position.y = 1.1; torso.scale.set(1.15, 1, 0.78); g.add(torso);
  const hips = cap(0.125, 0.08, dark); hips.position.y = 0.86; hips.scale.set(1.15, 1, 0.8); g.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 24, 18), mat); head.position.y = 1.535; head.scale.set(0.92, 1.05, 1); g.add(head);
  const neck = cap(0.045, 0.05, mat); neck.position.y = 1.41; g.add(neck);
  const limb = (x, y, r, len, m) => { const p = new THREE.Group(); p.position.set(x, y, 0); const c = cap(r, len, m); c.position.y = -(len / 2 + r * 0.6); p.add(c); g.add(p); return p; };
  const legL = limb(-0.085, 0.86, 0.065, 0.68, dark), legR = limb(0.085, 0.86, 0.065, 0.68, dark);
  const armL = limb(-0.215, 1.35, 0.048, 0.5, mat), armR = limb(0.215, 1.35, 0.048, 0.5, mat);
  armL.rotation.z = -0.07; armR.rotation.z = 0.07;
  g.scale.setScalar(k);
  g.userData.walk = (ph, amt) => { const s = Math.sin(ph) * 0.55 * amt; legL.rotation.x = s; legR.rotation.x = -s; armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8; torso.position.y = 1.1 + Math.abs(Math.cos(ph)) * 0.012 * amt; };
  return g;
}
