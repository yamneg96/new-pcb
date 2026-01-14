import * as THREE from "three";

export function createEdges(geometry) {
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0x000000
  });

  return new THREE.LineSegments(edges, material);
}
