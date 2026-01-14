import { TransformControls } from "three/examples/jsm/controls/TransformControls";

export function attachTransform(camera, dom, object, onChange) {
  const controls = new TransformControls(camera, dom);
  controls.attach(object);
  controls.setMode("translate");
  controls.showY = false;

  controls.addEventListener("objectChange", onChange);
  return controls;
}
// export function detachTransform(controls, onChange) {
//   controls.removeEventListener("objectChange", onChange);
//   controls.detach();
// }