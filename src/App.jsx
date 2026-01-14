import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Engine } from "./engine/Engine";
import Sidebar from "./ui/Sidebar";
import MenuBar from "./ui/MenuBar";
import { serializeBoard } from "./persistence/serialize";
import { loadBoard } from "./persistence/hydrate";

/**
 * App
 * ----
 * Thin React wrapper responsible ONLY for:
 * - Owning the DOM container ref
 * - Creating / starting the Engine on mount
 * - Stopping / disposing the Engine on unmount
 *
 * All Three.js world logic lives inside Engine and downstream modules.
 */
export default function App() {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new Engine(container);
    engineRef.current = engine;

    // Initialize default FR4 board
    engine.setBoard({ width: 100, height: 80, thickness: 1.6 });

    // Dummy pad grid for visual/perf verification
    const pads = [];
    const gridSize = 10;
    const spacing = 6;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i - gridSize / 2) * spacing;
        const z = (j - gridSize / 2) * spacing;
        pads.push({
          id: `pad_${i}_${j}`,
          position: [x, 0.8, z],
          size: [2, 3],
        });
      }
    }
    engine.addPads(pads);

    // Simple demo traces
    engine.addTraces([
      { start: [-20, 0.81, -20], end: [20, 0.81, 20], width: 1.0 },
      { start: [-20, 0.81, 20], end: [20, 0.81, -20], width: 0.7 },
    ]);

    // Setup interaction with selection callback
    engine.setupInteraction((selection) => {
      const newSelection = selection ? { ...selection } : null;
      setSelected(newSelection);
    });

    engine.start();

    // React 18 StrictMode: effects may run twice in dev.
    // This cleanup is idempotent because Engine.dispose() guards internally.
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  const handlePropertyUpdate = (update) => {
    if (!selected || !engineRef.current) return;
    const current = selected;

    // Pad instance on InstancedMesh
    if (current.type === "pad" && current.object && current.instanceId != null && current.instanceId >= 0) {
      const instanceMesh = current.object;
      const instanceId = current.instanceId;
      const dummy = new THREE.Object3D();

      instanceMesh.getMatrixAt(instanceId, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      if (typeof update.x === "number") dummy.position.x = update.x;
      if (typeof update.z === "number") dummy.position.z = update.z;
      // Lock to board surface
      dummy.position.y = 0.8;

      let width = current.size ? current.size[0] : dummy.scale.x;
      let height = current.size ? current.size[1] : dummy.scale.y;

      if (typeof update.width === "number") width = update.width;
      if (typeof update.height === "number") height = update.height;

      dummy.scale.set(width, height, dummy.scale.z);

      dummy.updateMatrix();
      instanceMesh.setMatrixAt(instanceId, dummy.matrix);
      instanceMesh.instanceMatrix.needsUpdate = true;

      if (instanceMesh.userData.idMap && instanceMesh.userData.idMap[instanceId]) {
        instanceMesh.userData.idMap[instanceId].position = [
          dummy.position.x,
          dummy.position.y,
          dummy.position.z,
        ];
        instanceMesh.userData.idMap[instanceId].size = [width, height];
      }

      setSelected({
        ...current,
        position: [dummy.position.x, dummy.position.y, dummy.position.z],
        size: [width, height],
        area: width * height,
      });
    } else if (current.type === "trace" && current.object) {
      const trace = current.object;

      if (typeof update.x === "number") trace.position.x = update.x;
      if (typeof update.z === "number") trace.position.z = update.z;
      trace.position.y = 0.81;

      setSelected({
        ...current,
        position: [trace.position.x, trace.position.y, trace.position.z],
      });
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      <MenuBar
        onExport={() => {
          if (!engineRef.current) return;
          const data = serializeBoard(engineRef.current);
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "pcb_design.json";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
        onImport={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        onLoadDemo={() => {
          if (!engineRef.current) return;
          const engine = engineRef.current;

          const demo = {
            board: { width: 120, height: 90, thickness: 1.6 },
            components: [],
          };

          // Simple CPU-socket-like pad grid
          const gridX = 14;
          const gridZ = 14;
          const spacing = 4;
          for (let i = 0; i < gridX; i++) {
            for (let j = 0; j < gridZ; j++) {
              const x = (i - gridX / 2) * spacing;
              const z = (j - gridZ / 2) * spacing;
              demo.components.push({
                type: "pad",
                id: `cpu_pad_${i}_${j}`,
                position: [x, 0.8, z],
                size: [1.6, 1.6],
              });
            }
          }

          // A couple of demo traces
          demo.components.push(
            {
              type: "trace",
              id: "demo_trace_1",
              start: [-25, 0.81, -25],
              end: [25, 0.81, 25],
              width: 0.8,
            },
            {
              type: "trace",
              id: "demo_trace_2",
              start: [-25, 0.81, 25],
              end: [25, 0.81, -25],
              width: 0.6,
            }
          );

          loadBoard(engine, demo);
          setSelected(null);
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (!file || !engineRef.current) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const text = event.target?.result;
              if (!text) return;
              const data = JSON.parse(text);
              loadBoard(engineRef.current, data);
              setSelected(null);
            } catch {
              // Swallow parse errors for now; could surface toast in future
            } finally {
              // Reset input so same file can be chosen again if needed
              e.target.value = "";
            }
          };
          reader.readAsText(file);
        }}
      />

      <div ref={mountRef} className="h-full w-full" />
      <Sidebar selected={selected} onUpdate={handlePropertyUpdate} />
    </div>
  );
}