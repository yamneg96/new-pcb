/**
 * serializeBoard
 * ---------------
 * Extracts the current PCB state from the engine into a JSON-serializable object.
 *
 * Schema:
 * {
 *   board: { width: number, height: number, thickness: number },
 *   components: [
 *     { type: "pad", id: string, position: [x,y,z], size: [w,h] },
 *     { type: "trace", id?: string, start: [x,y,z], end: [x,y,z], width: number }
 *   ]
 * }
 */
export function serializeBoard(engine) {
  const result = {
    board: { width: 100, height: 80, thickness: 1.6 },
    components: [],
  };

  // Board dimensions
  if (engine.board && engine.board.userData && engine.board.userData.boardConfig) {
    result.board = { ...engine.board.userData.boardConfig };
  }

  // Pads (InstancedMesh)
  if (engine.padsGroup) {
    const padsMesh = engine.padsGroup.children.find(
      (c) => c.userData && c.userData.type === "pads_copper"
    );
    if (padsMesh && padsMesh.userData && padsMesh.userData.idMap) {
      const idMap = padsMesh.userData.idMap;
      Object.keys(idMap).forEach((key) => {
        const pad = idMap[key];
        if (!pad) return;
        result.components.push({
          type: "pad",
          id: pad.id,
          position: pad.position,
          size: pad.size,
        });
      });
    }
  }

  // Traces
  if (Array.isArray(engine.traces)) {
    engine.traces.forEach((trace) => {
      if (!trace || !trace.userData) return;
      const { start, end, width } = trace.userData;
      if (!start || !end || width == null) return;

      result.components.push({
        type: "trace",
        id: trace.userData.id || undefined,
        start,
        end,
        width,
      });
    });
  }

  return result;
}

