import * as THREE from "three";
import { createCopperMaterial } from "../shaders/CopperShader";
import { PCB_LAYERS } from "../engine/Layers";

/**
 * Create a single copper trace between two points using a flat rectangular mesh.
 *
 * start, end: [x, y, z] in world space (typically y at top copper height)
 * width: trace width in world units
 * raw: original JSON description (for sidebar metadata)
 */
export function createTrace(start, end, width, raw) {
  const p1 = new THREE.Vector3().fromArray(start);
  const p2 = new THREE.Vector3().fromArray(end);

  const distance = p1.distanceTo(p2);
  if (distance === 0) {
    return null;
  }

  // PlaneGeometry: width (X) x length (Y), then rotated into XZ plane
  const geometry = new THREE.PlaneGeometry(width, distance);

  // Allow per-trace color override (e.g. to highlight specific nets)
  let colorOption = undefined;
  if (raw && raw.color) {
    try {
      colorOption = new THREE.Color(raw.color);
    } catch {
      colorOption = undefined;
    }
  }

  const material = createCopperMaterial({
    layer: PCB_LAYERS.TOP_COPPER,
    ...(colorOption ? { baseColor: colorOption } : {}),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.type = "trace";
  mesh.userData.exportable = true;
  mesh.userData.start = start;
  mesh.userData.end = end;
  mesh.userData.width = width;
  mesh.userData.raw = raw || {
    type: "trace",
    start,
    end,
    width,
  };

  // Position at midpoint
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(mid);

  // Rotate into XZ plane
  mesh.rotation.x = -Math.PI / 2;

  // Rotate around Y to align with start/end
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const angle = Math.atan2(dir.x, dir.z);
  mesh.rotation.y = angle;

  return mesh;
}