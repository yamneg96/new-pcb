import * as THREE from "three";

export function createHoles(holesData) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x111111 }); // Dark hole interior

  holesData.forEach(hole => {
    // Standard thickness is 1.6mm [cite: 37]
    const geometry = new THREE.CylinderGeometry(hole.radius, hole.radius, 1.62, 32);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(hole.pos[0], 0, hole.pos[2]);
    group.add(mesh);
  });

  return group;
}