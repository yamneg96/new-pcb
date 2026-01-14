import { createPads } from "../primitives/Pads";
import { createTrace } from "../primitives/Traces";

export const PersistenceManager = {
  // Serialization: Export to JSON [cite: 32]
  serialize: (scene) => {
    const data = {
      board: { width: 100, height: 80, thickness: 1.6 },
      components: []
    };

    scene.traverse((obj) => {
      if (obj.userData.exportable) {
        data.components.push({
          id: obj.userData.id,
          type: obj.userData.type,
          pos: obj.position.toArray(),
          size: obj.userData.size,
          points: obj.userData.points,
          width: obj.userData.width
        });
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pcb_layout.json";
    link.click();
  },

  // Hydration: Reconstruct from JSON [cite: 43]
  hydrate: (json, scene, material) => {
    // Clear existing components first for strict memory management [cite: 13]
    const toRemove = [];
    scene.traverse(obj => { if(obj.userData.exportable) toRemove.push(obj); });
    toRemove.forEach(obj => {
      obj.geometry.dispose();
      obj.material.dispose();
      scene.remove(obj);
    });

    const data = JSON.parse(json);
    
    // Rebuild Pads [cite: 16]
    const padsData = data.components.filter(c => c.type === "smd_rect");
    if (padsData.length) {
      const pads = createPads(padsData, material);
      pads.userData.exportable = true;
      scene.add(pads);
    }

    // Rebuild Traces [cite: 17, 18]
    data.components.filter(c => c.type === "path").forEach(t => {
      const trace = createTrace(t, material);
      trace.userData.exportable = true;
      scene.add(trace);
    });
  }
};