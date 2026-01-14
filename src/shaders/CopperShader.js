import * as THREE from "three";
import { applyLayerPolygonOffset, PCB_LAYERS } from "../engine/Layers";

/**
 * Factory for a brushed copper ShaderMaterial used for pads and traces.
 * Supports:
 * - InstancedMesh via instanceMatrix
 * - Interaction uniforms: uHovered, uSelected
 * - Time-based brushed effect via uTime
 */
export function createCopperMaterial(options = {}) {
  const {
    baseColor = new THREE.Color(0.72, 0.45, 0.2),
    hoverColor = new THREE.Color(1.0, 0.7, 0.3),
    selectedColor = new THREE.Color(1.0, 0.5, 0.0),
    layer = PCB_LAYERS.TOP_COPPER,
  } = options;

  const vertexShader = `
    attribute float instanceId;
    varying vec2 vUv;
    varying float vInstanceId;

    void main() {
      vUv = uv;
      vInstanceId = instanceId;

      #ifdef USE_INSTANCING
        vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
      #else
        vec4 worldPosition = vec4(position, 1.0);
      #endif

      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform float uHoveredInstanceId;
    uniform float uSelectedInstanceId;

    uniform vec3 uColor;
    uniform vec3 uHoverColor;
    uniform vec3 uSelectedColor;

    varying vec2 vUv;
    varying float vInstanceId;

    // Simple brushed effect using directional stripes and time
    float brushedNoise(vec2 uv, float time) {
      float stripes = sin((uv.x * 150.0) + time * 2.0);
      return 0.5 + 0.5 * stripes;
    }

    void main() {
      float grain = brushedNoise(vUv, uTime);
      vec3 base = uColor * (0.8 + 0.2 * grain);

      // Instance-level interaction states
      vec3 color = base;

      // Check if this instance is hovered (uHoveredInstanceId >= 0 means something is hovered)
      if (uHoveredInstanceId >= 0.0 && abs(vInstanceId - uHoveredInstanceId) < 0.5) {
        color = mix(color, uHoverColor, 0.5);
      }

      // Check if this instance is selected
      if (uSelectedInstanceId >= 0.0 && abs(vInstanceId - uSelectedInstanceId) < 0.5) {
        color = mix(color, uSelectedColor, 0.8);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uHoveredInstanceId: { value: -1 },
      uSelectedInstanceId: { value: -1 },
      uColor: { value: baseColor },
      uHoverColor: { value: hoverColor },
      uSelectedColor: { value: selectedColor },
    },
    transparent: false,
  });

  applyLayerPolygonOffset(material, layer);

  return material;
}

