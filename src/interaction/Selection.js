export const setHover = (material, state) => {
  material.uniforms.uHovered.value = state ? 1.0 : 0.0;
};

export const setSelected = (material, state) => {
  material.uniforms.uSelected.value = state ? 1.0 : 0.0;
};