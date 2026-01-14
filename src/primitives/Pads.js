import * as THREE from "three";
import { createCopperMaterial } from "../shaders/CopperShader";
import { PCB_LAYERS } from "../engine/Layers";

/**
 * Create an instanced set of rectangular SMD pads and their edge outlines.
 *
 * data: Array<{ id?: string, position: [x, y, z], size: [w, h] }>
 *
 * Returns a THREE.Group containing:
 * - instanced copper pads mesh (ShaderMaterial)
 * - instanced edge lines (EdgesGeometry + LineBasicMaterial)
 */
export function createPads(data = []) {
  if (!data.length) {
    return new THREE.Group();
  }

  const group = new THREE.Group();
  group.userData.type = "pads";

  const padGeometry = new THREE.PlaneGeometry(1, 1);
  // Ensure base geometry bounds exist (used by InstancedMesh bounds computations)
  padGeometry.computeBoundingBox();
  padGeometry.computeBoundingSphere();
  const copperMaterial = createCopperMaterial({
    layer: PCB_LAYERS.TOP_COPPER,
  });

  const padMesh = new THREE.InstancedMesh(padGeometry, copperMaterial, data.length);
  const dummy = new THREE.Object3D();
  const idMap = {};

  // Add instance ID attribute for per-instance shader picking
  // InstancedBufferAttribute must be added to the InstancedMesh, not the base geometry
  const instanceIds = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    instanceIds[i] = i;
  }
  padMesh.geometry.setAttribute("instanceId", new THREE.InstancedBufferAttribute(instanceIds, 1));

  data.forEach((pad, i) => {
    const [x, y, z] = pad.position;
    const [w, h] = pad.size;

    // Place pads on the top surface of the board: lying in XZ plane
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, 1);
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();

    padMesh.setMatrixAt(i, dummy.matrix);
    idMap[i] = {
      id: pad.id ?? `pad_${i}`,
      size: [w, h],
      position: [x, y, z],
      instanceId: i,
    };
  });

  padMesh.instanceMatrix.needsUpdate = true;
  padMesh.userData.idMap = idMap;
  // Critical for raycasting / culling correctness on InstancedMesh
  padMesh.geometry.computeBoundingBox();
  padMesh.geometry.computeBoundingSphere();
  padMesh.computeBoundingBox();
  padMesh.computeBoundingSphere();
  padMesh.userData.type = "pads_copper";
  padMesh.userData.exportable = true;

  // Edges: instanced outline using EdgesGeometry
  const edgeGeometry = new THREE.EdgesGeometry(padGeometry);
  edgeGeometry.computeBoundingBox();
  edgeGeometry.computeBoundingSphere();
  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
  });

  const edgeMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, data.length);

  data.forEach((pad, i) => {
    const [x, y, z] = pad.position;
    const [w, h] = pad.size;

    dummy.position.set(x, y, z + 0.0005); // minimal visual nudge
    dummy.scale.set(w, h, 1);
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();

    edgeMesh.setMatrixAt(i, dummy.matrix);
  });

  edgeMesh.instanceMatrix.needsUpdate = true;
  edgeMesh.userData.type = "pads_edges";
  edgeMesh.geometry.computeBoundingBox();
  edgeMesh.geometry.computeBoundingSphere();
  edgeMesh.computeBoundingBox();
  edgeMesh.computeBoundingSphere();

  group.add(padMesh);
  group.add(edgeMesh);

  return group;
}