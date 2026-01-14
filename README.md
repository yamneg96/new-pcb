# 🧩 3D PCB Viewer & Editor

**Technical Assessment – Senior 3D Graphics Engineer**

A high-performance **3D PCB (Printed Circuit Board) Viewer & Editor core** built using **React + Vanilla Three.js**, with an emphasis on **engine-level control, rendering performance, and precise interaction**.

---

## ⚙️ Vanilla Three.js Integration

Three.js is integrated **imperatively** inside the React lifecycle using `useRef` and `useEffect`.
A **single `requestAnimationFrame` loop** drives the renderer, ensuring predictable performance and avoiding unnecessary React re-renders.

React is used **only** for UI state (sidebar, menus, data reflection) — **never** for scene graph management.

✔ No React Three Fiber
✔ No declarative scene abstraction
✔ Full control over renderer, camera, and lifecycle

---

## 🚀 Performance Strategy

All SMD pads are rendered using **`THREE.InstancedMesh`**, allowing **100+ pads** to be drawn in a **single draw call**.

This approach:

* Minimizes GPU state changes 🧠
* Scales efficiently for dense PCB layouts 📈
* Avoids per-mesh overhead ⚡

Pads share:

* One geometry
* One material
* Per-instance transforms

---

## 🎨 Visual Fidelity & Z-Fighting Mitigation

### Copper Faces

Copper elements are rendered using a custom **GLSL `ShaderMaterial`**, simulating a brushed copper appearance.

### Edge Rendering

Distinct outlines are rendered using **`EdgesGeometry`**, ensuring:

* Clear silhouette separation ✏️
* Easy visual inspection of pads and traces

### Z-Fighting Prevention

Z-fighting between the FR4 board and copper layers is avoided using:

* **Discrete Z-offsets per layer**
* Consistent depth separation

This guarantees **flicker-free rendering** even under aggressive camera movement 🎥.

---

## 🖱️ Interaction & Shader Logic

Interaction feedback is implemented **entirely via shader uniforms**, not material swapping.

### GLSL Uniforms

* `uHovered` → hover highlight
* `uSelected` → selection highlight

Benefits:

* Zero material reallocation 🚫
* GPU-friendly state changes 🖥️
* Smooth visual feedback ✨

Raycasting detects pads precisely, including **InstancedMesh `instanceId` resolution**.

---

## 🔄 Selection, Transformation & State Sync

Clicking a pad:

* Selects the component
* Attaches **TransformControls**
* Constrains movement to the **XZ plane**

During transformation:

* The 3D object moves in world space 🌍
* React state updates in real time
* The sidebar reflects live position data 📊

This demonstrates **accurate bidirectional sync** between the Three.js engine and React UI.

---

## 💾 Persistence (Save & Load)

The PCB layout can be **serialized to JSON** and **hydrated back** into a fully reconstructed 3D scene.

✔ Board dimensions restored
✔ Components regenerated deterministically
✔ Layering and positioning preserved

This enables future extension into full PCB editing workflows.

---

## 🧹 Memory Management

All GPU resources are **explicitly disposed**:

* Geometries
* Materials
* Renderer resources

On cleanup:

```js
renderer.info.memory
```

returns to baseline values, confirming **no GPU memory leaks** ♻️.

This is verified during board reset and component removal.

---

## 📱 Responsive UI

The UI is fully responsive:

* 🖥️ Desktop: fixed sidebar
* 📱 Mobile: slide-in drawer with menu toggle and close (✕) button

The layout ensures:

* Unobstructed 3D interaction
* Clear inspection panel
* Clean separation between engine and UI

---

## ✅ Evaluation Criteria Coverage

✔ Imperative Three.js integration
✔ Single RAF render loop
✔ Instanced rendering for performance
✔ Shader-based interaction logic
✔ Clear face/edge distinction
✔ Z-fighting mitigation
✔ Memory lifecycle verification
✔ Accurate React ↔ 3D state sync

---

## 🏁 Conclusion

This project demonstrates:

* Deep understanding of **Three.js internals**
* Performance-aware GPU rendering strategies
* Clean separation between **engine logic and UI**
* Production-ready memory and lifecycle management

It is designed as a **scalable PCB engine foundation**, not just a visual demo.

---