import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";

/**
 * InteractionManager
 * ------------------
 * Handles raycasting, hover, selection, and transform controls.
 * - Listens to mouse events on the renderer canvas
 * - Performs instance-level picking for InstancedMesh
 * - Updates shader uniforms for visual feedback
 * - Manages TransformControls for selected objects
 */
export class InteractionManager {
  constructor(engine, onSelectionChange) {
    this.engine = engine;
    this.onSelectionChange = onSelectionChange || (() => {});

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredInstanceId = -1;
    this.selectedInstanceId = -1;
    this.selectedObject = null;
    this.transformControls = null;

    // Bind handlers
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onTransformChange = this._onTransformChange.bind(this);
    this._onTransformDrag = this._onTransformDrag.bind(this);

    this._setupEventListeners();
    this._setupTransformControls();
  }

  /**
   * Attach event listeners to the renderer canvas.
   */
  _setupEventListeners() {
    const canvas = this.engine.renderer.domElement;
    canvas.addEventListener("mousemove", this._onMouseMove);
    canvas.addEventListener("click", this._onClick);
  }

  /**
   * Create TransformControls and add to scene.
   */
  _setupTransformControls() {
    this.transformControls = new TransformControls(
      this.engine.camera,
      this.engine.renderer.domElement
    );
    this.transformControls.setMode("translate");
    this.transformControls.showY = false; // Lock to XZ plane
    this.transformControls.setSpace("world");

    // Disable orbit controls while dragging
    this.transformControls.addEventListener("dragging-changed", (event) => {
      this.engine.controls.enabled = !event.value;
    });

    this.transformControls.addEventListener("change", this._onTransformChange);
    this.transformControls.addEventListener("objectChange", this._onTransformDrag);

    this.engine.scene.add(this.transformControls);
  }

  /**
   * Update mouse position from event.
   */
  _updateMouse(event) {
    const rect = this.engine.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Get all interactable objects from the scene.
   */
  _getInteractableObjects() {
    const objects = [];
    this.engine.scene.traverse((obj) => {
      if (obj.userData.exportable || obj.userData.type === "pads_copper" || obj.userData.type === "trace") {
        objects.push(obj);
      }
    });
    return objects;
  }

  /**
   * Update hover state for instanced meshes.
   */
  _updateHover(hit) {
    const newHoveredId = hit.instanceId !== undefined ? hit.instanceId : -1;

    if (this.hoveredInstanceId !== newHoveredId) {
      this.hoveredInstanceId = newHoveredId;
      this._updateShaderUniforms();
    }
  }

  /**
   * Update selection state.
   */
  _updateSelection(hit) {
    if (!hit) {
      // Deselect
      this.selectedInstanceId = -1;
      this.selectedObject = null;
      if (this.transformControls) {
        this.transformControls.detach();
      }
      this.onSelectionChange(null);
      this._updateShaderUniforms();
      return;
    }

    const object = hit.object;
    const instanceId = hit.instanceId !== undefined ? hit.instanceId : -1;

    // If it's an instanced mesh, get the pad data
    if (instanceId >= 0 && object.userData.idMap) {
      const padData = object.userData.idMap[instanceId];
      if (padData) {
        this.selectedInstanceId = instanceId;
        this.selectedObject = object;

        // Create a dummy object at the instance position for TransformControls
        const dummy = new THREE.Object3D();
        object.getMatrixAt(instanceId, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

        this.transformControls.attach(dummy);
        this.transformControls.userData.instanceId = instanceId;
        this.transformControls.userData.instanceMesh = object;
        this.transformControls.userData.dummy = dummy;

        const selectionData = {
          id: padData.id,
          type: "pad",
          position: [dummy.position.x, dummy.position.y, dummy.position.z],
          size: padData.size.slice(),
          area: padData.size[0] * padData.size[1],
          instanceId,
          object,
        };
        this.onSelectionChange(selectionData);
      }
    } else if (object.userData.type === "trace") {
      // Regular mesh (trace)
      this.selectedInstanceId = -1;
      this.selectedObject = object;
      this.transformControls.attach(object);

      const selectionData = {
        id: object.userData.id || "trace",
        type: "trace",
        position: [object.position.x, object.position.y, object.position.z],
        width: object.userData.width ?? 0,
        area: 0, // Traces don't have pad-like area
        instanceId: -1,
        object,
      };
      this.onSelectionChange(selectionData);
    } else if (object.userData.exportable && (object.userData.type === "ic" || object.userData.type === "component" || object.userData.type === "connector" || object.userData.type === "capacitor" || object.userData.type === "via")) {
      // ICs and other components (standard meshes)
      this.selectedInstanceId = -1;
      this.selectedObject = object;
      this.transformControls.attach(object);

      const selectionData = {
        id: object.userData.id || object.userData.type || "component",
        type: object.userData.type,
        position: [object.position.x, object.position.y, object.position.z],
        size: object.userData.size || [0, 0, 0],
        area: 0,
        instanceId: -1,
        object,
      };
      this.onSelectionChange(selectionData);
    } else {
      // Unhandled type – ignore
    }

    this._updateShaderUniforms();
  }

  /**
   * Update shader uniforms for all copper materials.
   */
  _updateShaderUniforms() {
    this.engine.scene.traverse((obj) => {
      const mat = obj.material;
      if (mat && mat.uniforms) {
        if (mat.uniforms.uHoveredInstanceId) {
          mat.uniforms.uHoveredInstanceId.value = this.hoveredInstanceId;
        }
        if (mat.uniforms.uSelectedInstanceId) {
          mat.uniforms.uSelectedInstanceId.value = this.selectedInstanceId;
        }
      }
    });
  }

  /**
   * Handle mouse move for hover detection.
   */
  _onMouseMove(event) {
    this._updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);

    const objects = this._getInteractableObjects();
    const hits = this.raycaster.intersectObjects(objects, true);

    if (hits.length > 0) {
      this._updateHover(hits[0]);
    } else {
      if (this.hoveredInstanceId !== -1) {
        this.hoveredInstanceId = -1;
        this._updateShaderUniforms();
      }
    }
  }

  /**
   * Handle click for selection.
   */
  _onClick(event) {
    this._updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);

    const objects = this._getInteractableObjects();
    const hits = this.raycaster.intersectObjects(objects, true);

    let bestHit = null;
    if (hits.length > 0) {
      // Prefer pads (InstancedMesh) over traces and other geometry when overlapping
      bestHit =
        hits.find((h) => h.object.userData.type === "pads_copper") ||
        hits.find(
          (h) =>
            h.object.userData.type === "ic" ||
            h.object.userData.type === "component" ||
            h.object.userData.type === "connector" ||
            h.object.userData.type === "capacitor" ||
            h.object.userData.type === "via"
        ) ||
        hits[0];
      this._updateSelection(bestHit);
    } else {
      // Click on empty space: deselect
      this._updateSelection(null);
    }
  }

  /**
   * Handle transform control changes (while dragging).
   */
  _onTransformChange() {
    // While dragging, continuously emit updated selection so UI stays in sync
    this._onTransformDrag();
  }

  /**
   * Handle transform control object change (after drag ends).
   */
  _onTransformDrag() {
    if (!this.transformControls.object) return;

    const dummy = this.transformControls.userData.dummy;
    const instanceMesh = this.transformControls.userData.instanceMesh;
    const instanceId = this.transformControls.userData.instanceId;

    if (dummy && instanceMesh && instanceId >= 0) {
      // Lock Y position to board surface
      dummy.position.y = 0.8;

      // Update instance matrix
      dummy.updateMatrix();
      instanceMesh.setMatrixAt(instanceId, dummy.matrix);
      instanceMesh.instanceMatrix.needsUpdate = true;
      // Keep bounds up to date for reliable raycasting/culling after edits
      instanceMesh.computeBoundingBox();
      instanceMesh.computeBoundingSphere();

      // Update idMap position
      if (instanceMesh.userData.idMap && instanceMesh.userData.idMap[instanceId]) {
        instanceMesh.userData.idMap[instanceId].position = [
          dummy.position.x,
          dummy.position.y,
          dummy.position.z,
        ];
      }

      // Notify React
      const padData = instanceMesh.userData.idMap[instanceId];
      if (padData) {
        this.onSelectionChange({
          id: padData.id,
          type: "pad",
          position: [dummy.position.x, dummy.position.y, dummy.position.z],
          area: padData.size[0] * padData.size[1],
          size: padData.size.slice(),
          instanceId,
          object: instanceMesh,
        });
      }
    } else if (this.selectedObject && this.selectedObject.userData.type === "trace") {
      // Handle trace movement
      this.selectedObject.position.y = 0.81; // Lock to board surface

      this.onSelectionChange({
        id: this.selectedObject.userData.id || "trace",
        type: "trace",
        position: [
          this.selectedObject.position.x,
          this.selectedObject.position.y,
          this.selectedObject.position.z,
        ],
        width: this.selectedObject.userData.width ?? 0,
        area: 0,
        instanceId: -1,
        object: this.selectedObject,
      });
    }
  }

  /**
   * Cleanup: remove event listeners and dispose controls.
   */
  dispose() {
    const canvas = this.engine.renderer.domElement;
    canvas.removeEventListener("mousemove", this._onMouseMove);
    canvas.removeEventListener("click", this._onClick);

    if (this.transformControls) {
      this.transformControls.removeEventListener("change", this._onTransformChange);
      this.transformControls.removeEventListener("objectChange", this._onTransformDrag);
      this.transformControls.dispose();
      if (this.engine.scene) {
        this.engine.scene.remove(this.transformControls);
      }
    }
  }
}
