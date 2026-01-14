export const copperVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Required for InstancedMesh support [cite: 16]
    vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
  }
`;