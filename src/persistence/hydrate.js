/**
 * loadBoard (Advanced Version)
 * ---------------------------
 * Updated to handle the specific "pads", "vias", and path-based "traces" 
 * found in your advanced JSON.
 */
export function loadBoard(engine, jsonData) {
  if (!engine) return;

  const data = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
  if (!data) return;

  // 1. Rebuild the Board
  if (data.board) {
    engine.setBoard(data.board);
  }

  // Clear any previous components stored on engine
  if (Array.isArray(engine.components) && engine.components.length) {
    engine.components.forEach((c) => {
      engine.scene.remove(c);
      if (engine._disposeObject) engine._disposeObject(c);
    });
    engine.components = [];
  }

  // 2. Handle "pads" array (Advanced Format)
  const padsSource =
    data.pads ||
    (data.components ? data.components.filter((c) => c.type === "pad") : []);
  if (padsSource.length > 0) {
    engine.addPads(
      padsSource.map((p) => ({
        id: p.id,
        position: p.position,
        size: p.size,
      }))
    );
  }

  // 3. Handle "traces" array with "path" support
  const tracesSource =
    data.traces ||
    (data.components ? data.components.filter((c) => c.type === "trace") : []);
  const processedSegments = [];

  tracesSource.forEach((t) => {
    // If it's the advanced "path" format (array of points)
    if (t.path && t.path.length >= 2) {
      for (let i = 0; i < t.path.length - 1; i++) {
        processedSegments.push({
          start: t.path[i],
          end: t.path[i + 1],
          width: t.width || 0.5,
        });
      }
    }
    // Fallback for simple "start/end" format
    else if (t.start && t.end) {
      processedSegments.push({
        start: t.start,
        end: t.end,
        width: t.width || 0.5,
      });
    }
  });

  if (processedSegments.length > 0) {
    engine.addTraces(processedSegments);
  }

  // 4. Handle advanced "components" (ICs, connectors, capacitors, etc.)
  if (Array.isArray(data.components)) {
    data.components
      .filter((c) =>
        ["ic", "connector", "capacitor", "component"].includes(c.type)
      )
      .forEach((c) => {
        engine.addComponent({
          type: c.type || "component",
          id: c.id,
          position: c.position,
          size: c.size || [4, 2, 2],
          rotation: c.rotation,
        });
      });
  }

  // 5. Handle vias
  if (Array.isArray(data.vias)) {
    data.vias.forEach((v) => {
      engine.addComponent({
        type: "via",
        id: v.id,
        position: v.position,
        radius: v.radius || v.drill || 0.3,
        size: [v.radius || v.drill || 0.3, 0, 0],
      });
    });
  }
}

