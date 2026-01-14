export const copperFragment = `
  uniform float uHovered;
  uniform float uSelected;
  varying vec2 vUv;

  void main() {
    // Procedural Brushed Copper [cite: 21]
    vec3 baseCopper = vec3(0.72, 0.45, 0.20); 
    float grain = fract(sin(vUv.x * 150.0) * 43758.5453);
    vec3 color = baseCopper * (0.88 + 0.12 * grain);

    // Interaction Uniforms [cite: 23, 24]
    if (uSelected > 0.5) {
      color = mix(color, vec3(1.0, 0.9, 0.4), 0.6); // Golden Selection
    } else if (uHovered > 0.5) {
      color += vec3(0.15, 0.15, 0.15); // Emissive Highlight
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;