import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createBoard } from "./Board";
import { createPads } from "../primitives/Pads";
import { createTrace } from "../primitives/Traces";
import { InteractionManager } from "../interaction/InteractionManager";

/**
 * Engine
 * -------
 * Single source of truth for the Three.js world.
 * - Owns scene / camera / renderer / controls
 * - Manages render loop (start/stop)
 * - Handles resize (ResizeObserver when available, window resize fallback)
 * - Responsible for full WebGL cleanup via dispose()
 */
export class Engine {
  constructor(container) {
    if (!container) {
      throw new Error("Engine requires a valid container DOM element.");
    }

    this.container = container;
    this.scene = new THREE.Scene();

    // Dark PCB workbench background
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor(0x1e1e1e, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Initial size based on container
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(60, 60, 80);

    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // Orbit controls for basic navigation
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Basic lighting so geometry is visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(40, 80, 40);
    this.scene.add(directionalLight);

    // Simple world-space grid to visualize scale/origin
    const grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    grid.position.y = -0.001; // Slightly below origin to avoid overlap with board
    this.scene.add(grid);

    // Keep reference to current board and components for replacement / cleanup
    this.board = null;
    this.padsGroup = null;
    this.traces = [];
    this.components = [];
    this.interactionManager = null;

    // Internal state
    this._animationFrameId = null;
    this._resizeObserver = null;
    this._isDisposed = false;

    // Bind methods once so we can add/remove listeners safely
    this._animate = this._animate.bind(this);
    this._handleWindowResize = this._handleWindowResize.bind(this);

    this._setupResizeHandling();
  }

  /**
   * Add or replace instanced SMD pads.
   * padArray: Array<{ id?, position: [x,y,z], size: [w,h] }>
   */
  addPads(padArray) {
    if (this.padsGroup) {
      this.scene.remove(this.padsGroup);
      this._disposeObject(this.padsGroup);
      this.padsGroup = null;
    }

    const group = createPads(padArray);
    this.padsGroup = group;
    this.scene.add(group);
  }

  /**
   * Add multiple traces.
   * traceArray: Array<{ start: [x,y,z], end: [x,y,z], width: number }>
   */
  addTraces(traceArray) {
    // Dispose previous traces
    if (this.traces.length) {
      this.traces.forEach((t) => {
        this.scene.remove(t);
        this._disposeObject(t);
      });
      this.traces = [];
    }

    traceArray.forEach((t) => {
      const mesh = createTrace(t.start, t.end, t.width, t.raw);
      if (mesh) {
        this.traces.push(mesh);
        this.scene.add(mesh);
      }
    });
  }

  /**
   * Add a single 3D component (IC, connector, capacitor, via, etc).
   * component: { type, id, position: [x,y,z], size?: [w,h,t], rotation?: [rx,ry,rz], radius?: number }
   */
  addComponent(component) {
    if (!component) return;

    const { type, id, position = [0, 0, 0], size = [4, 2, 1], rotation, radius } = component;

    let mesh;
    if (type === "via") {
      const boardThickness =
        this.board?.userData?.boardConfig?.thickness != null
          ? this.board.userData.boardConfig.thickness
          : 1.6;
      const r = radius || (size[0] || 0.4);
      const h = boardThickness + 0.4;
      const geo = new THREE.CylinderGeometry(r, r, h, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xd0d0d0,
        metalness: 0.8,
        roughness: 0.3,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
    } else {
      const [w, h, t] = size;
      const geo = new THREE.BoxGeometry(w, t || 1, h);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.2,
        roughness: 0.7,
      });
      mesh = new THREE.Mesh(geo, mat);
    }

    mesh.position.set(position[0], position[1], position[2]);
    if (rotation && rotation.length === 3) {
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    }

    mesh.userData.id = id;
    mesh.userData.type = type || "component";
    mesh.userData.size = size;
    mesh.userData.exportable = true;
    mesh.userData.raw = component.raw || component;

    this.scene.add(mesh);
    this.components.push(mesh);
  }

  /**
   * Create or replace the FR4 board in the scene.
   * Passing a new config will dispose the old board geometry/material.
   */
  setBoard(config) {
    // Remove previous board if present
    if (this.board) {
      this.scene.remove(this.board);
      if (this.board.geometry) this.board.geometry.dispose();
      if (this.board.material) {
        if (Array.isArray(this.board.material)) {
          this.board.material.forEach((m) => m && m.dispose && m.dispose());
        } else if (this.board.material.dispose) {
          this.board.material.dispose();
        }
      }
      this.board = null;
    }

    const board = createBoard(config);
    this.board = board;
    this.scene.add(board);

    // Optionally frame camera to new board
    this.frameToBoard();
  }

  /**
   * Helper to dispose a single object (geometry + material).
   */
  _disposeObject(obj) {
    if (!obj) return;
    if (obj.geometry) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m && m.dispose && m.dispose());
      } else if (obj.material.dispose) {
        obj.material.dispose();
      }
    }
  }

  /**
   * Frame camera to look at the current board (or origin if missing).
   */
  frameToBoard() {
    if (!this.camera) return;

    const board = this.board;
    const box = new THREE.Box3();
    if (board) {
      box.setFromObject(board);
    } else {
      box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(100, 10, 80));
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxExtent = Math.max(size.x, size.z);
    const fov = (this.camera.fov * Math.PI) / 180;
    const distance = (maxExtent * 0.7) / Math.tan(fov / 2);

    this.camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    this.camera.lookAt(center);
    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.update();
    }
  }

  /**
   * Private render loop.
   */
  _animate() {
    if (this._isDisposed) return;

    // Advance time uniform for any ShaderMaterials using uTime
    if (!this._timeStart) {
      this._timeStart = performance.now();
    }
    const elapsed = (performance.now() - this._timeStart) / 1000;
    this.scene.traverse((obj) => {
      const mat = obj.material;
      const applyTime = (m) => {
        if (m && m.uniforms && m.uniforms.uTime) {
          m.uniforms.uTime.value = elapsed;
        }
      };
      if (Array.isArray(mat)) {
        mat.forEach(applyTime);
      } else {
        applyTime(mat);
      }
    });

    this._animationFrameId = window.requestAnimationFrame(this._animate);
    if (this.controls) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Begin the render loop.
   */
  start() {
    if (this._isDisposed) return;
    if (this._animationFrameId != null) return; // already running
    this._animate();
  }

  /**
   * Stop the render loop.
   */
  stop() {
    if (this._animationFrameId != null) {
      window.cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  /**
   * Resize camera / renderer to match container.
   */
  resize() {
    if (!this.container || this._isDisposed) return;

    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * Internal: setup ResizeObserver or window resize fallback.
   */
  _setupResizeHandling() {
    // Prefer ResizeObserver if available
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this._resizeObserver.observe(this.container);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", this._handleWindowResize);
    }
  }

  _handleWindowResize() {
    this.resize();
  }

  /**
   * Initialize interaction manager with selection callback.
   */
  setupInteraction(onSelectionChange) {
    if (this.interactionManager) {
      this.interactionManager.dispose();
    }
    this.interactionManager = new InteractionManager(this, onSelectionChange);
  }

  /**
   * Full cleanup: stop loop, remove listeners/observers,
   * dispose of all geometries/materials and renderer resources.
   */
  dispose() {
    if (this._isDisposed) return;
    this._isDisposed = true;

    // Stop render loop
    this.stop();

    // Dispose interaction manager
    if (this.interactionManager) {
      this.interactionManager.dispose();
      this.interactionManager = null;
    }

    // Tear down resize handling
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._handleWindowResize);
    }

    // Dispose of all geometries / materials
    this.scene.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m && m.dispose && m.dispose());
        } else if (obj.material.dispose) {
          obj.material.dispose();
        }
      }
    });

    // Dispose controls
    if (this.controls && this.controls.dispose) {
      this.controls.dispose();
    }

    // Dispose renderer and remove canvas
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    // Allow GC
    this.container = null;
  }
}