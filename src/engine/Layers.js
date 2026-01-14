/**
 * Layering system for PCB rendering.
 *
 * Instead of offsetting geometry in world space (which can cause issues at scale),
 * we rely on OpenGL polygon offset to bias depth values and avoid z-fighting.
 */

export const PCB_LAYERS = {
  TOP_COPPER: "TOP_COPPER",
  BOTTOM_COPPER: "BOTTOM_COPPER",
  SILKSCREEN: "SILKSCREEN",
};

// Polygon offset presets per logical layer.
export const LAYER_POLYGON_OFFSETS = {
  [PCB_LAYERS.TOP_COPPER]: {
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  },
  [PCB_LAYERS.BOTTOM_COPPER]: {
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  },
  [PCB_LAYERS.SILKSCREEN]: {
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  },
};

/**
 * Apply polygon offset settings for a given logical PCB layer
 * onto an existing material instance.
 */
export function applyLayerPolygonOffset(material, layerKey) {
  if (!material || !layerKey) return material;

  const preset = LAYER_POLYGON_OFFSETS[layerKey];
  if (!preset) return material;

  material.polygonOffset = true;
  material.polygonOffsetFactor = preset.polygonOffsetFactor;
  material.polygonOffsetUnits = preset.polygonOffsetUnits;

  return material;
}
