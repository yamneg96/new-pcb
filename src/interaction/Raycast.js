import * as THREE from "three";

export const raycaster = new THREE.Raycaster();
export const mouse = new THREE.Vector2();

export function updateMouse(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

export function raycast(camera, objects) {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(objects, false);
}
