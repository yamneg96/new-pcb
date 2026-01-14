/**
 * loadBoard (Universal Version)
 * -----------------------------
 * Hydrates the scene from a variety of JSON schemas.
 * - Supports pads/components/holes with `pos` or `position`
 * - Supports traces with `points`, `path`, or `start`/`end`
 */
export function loadBoard(engine, jsonData) {
  if (!engine) return;

  const data = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
  if (!data) return;

  // Helper: normalize 2D/3D positions into [x, y, z]
  const toVec3 = (p, defaultY = 0.8) => {
    if (Array.isArray(p)) {
      if (p.length === 3) return p;
      if (p.length === 2) return [p[0], defaultY, p[1]];
    }
    return [0, defaultY, 0];
  };

  // 1. Rebuild the Board if present
  if (data.board) {
    // Support both { width, height, thickness } and nested { dimensions: { ... } }
    const boardConfig =
      data.board.dimensions && (data.board.dimensions.width || data.board.dimensions.height)
        ? {
            width:
              data.board.dimensions.width ??
              data.board.width ??
              undefined,
            height:
              data.board.dimensions.height ??
              data.board.height ??
              undefined,
            thickness:
              data.board.dimensions.thickness ??
              data.board.thickness ??
              undefined,
          }
        : data.board;

    engine.setBoard(boardConfig);
  }

  // 2. Clear previous pads / traces / components
  if (engine.padsGroup) {
    engine.scene.remove(engine.padsGroup);
    if (engine._disposeObject) engine._disposeObject(engine.padsGroup);
    engine.padsGroup = null;
  }

  if (Array.isArray(engine.traces) && engine.traces.length) {
    engine.traces.forEach((t) => {
      engine.scene.remove(t);
      if (engine._disposeObject) engine._disposeObject(t);
    });
    engine.traces = [];
  }

  if (Array.isArray(engine.components) && engine.components.length) {
    engine.components.forEach((c) => {
      engine.scene.remove(c);
      if (engine._disposeObject) engine._disposeObject(c);
    });
    engine.components = [];
  }

  // 3. Pads (from `pads` array or components with type "pad")
  const padsSource = [];
  if (Array.isArray(data.pads)) {
    padsSource.push(...data.pads);
  }
  if (Array.isArray(data.components)) {
    padsSource.push(...data.components.filter((c) => c.type === "pad"));
  }

  if (padsSource.length > 0) {
    const padArray = padsSource.map((p, index) => {
      const pos = p.pos || p.position;
      const position = toVec3(pos, 0.8);

      const sizeSource =
        p.size || [p.w || p.width || 1, p.h || p.height || 1];
      const size = Array.isArray(sizeSource) ? sizeSource : [1, 1];

      return {
        id: p.id || `pad_${index}`,
        position,
        size,
        raw: p,
      };
    });

    engine.addPads(padArray);
  }

  // 4. Traces (supports `points`, `path`, or `start`/`end`)
  const tracesSource = [];
  if (Array.isArray(data.traces)) {
    tracesSource.push(...data.traces);
  }
  if (Array.isArray(data.components)) {
    tracesSource.push(...data.components.filter((c) => c.type === "trace"));
  }

  const processedSegments = [];

  tracesSource.forEach((t) => {
    const width = t.width || t.thickness || 0.5;

    // Advanced format: points: [[x,z], [x,z], ...]
    if (Array.isArray(t.points) && t.points.length >= 2) {
      for (let i = 0; i < t.points.length - 1; i++) {
        const start = toVec3(t.points[i], 0.81);
        const end = toVec3(t.points[i + 1], 0.81);
        processedSegments.push({
          start,
          end,
          width,
          raw: t,
        });
      }
    }
    // Path format: path: [[x,y,z] or [x,z], ...]
    else if (Array.isArray(t.path) && t.path.length >= 2) {
      for (let i = 0; i < t.path.length - 1; i++) {
        const start = toVec3(t.path[i], 0.81);
        const end = toVec3(t.path[i + 1], 0.81);
        processedSegments.push({
          start,
          end,
          width,
          raw: t,
        });
      }
    }
    // Simple format: start/end
    else if (t.start && t.end) {
      const start = toVec3(t.start, 0.81);
      const end = toVec3(t.end, 0.81);
      processedSegments.push({
        start,
        end,
        width,
        raw: t,
      });
    }
  });

  if (processedSegments.length > 0) {
    engine.addTraces(processedSegments);
  }

  // 5. Components (ICs, connectors, capacitors, vias, holes, etc.)
  const componentsSource = [];
  if (Array.isArray(data.components)) {
    componentsSource.push(...data.components);
  }
  if (Array.isArray(data.holes)) {
    componentsSource.push(...data.holes);
  }
  if (Array.isArray(data.vias)) {
    componentsSource.push(
      ...data.vias.map((v) => ({ ...v, type: v.type || "via" }))
    );
  }

  componentsSource.forEach((c) => {
    const rawType = c.type || "component";
    const type =
      rawType === "hole"
        ? "via" // treat holes as vias in current geometry model
        : rawType;

    const pos = c.pos || c.position;
    const position = toVec3(pos, 0.8);

    const size = Array.isArray(c.size) ? c.size : [4, 2, 2];

    engine.addComponent({
      type,
      id: c.id,
      position,
      size,
      rotation: c.rotation,
      radius: c.radius || c.drill,
      raw: c,
    });
  });
}

