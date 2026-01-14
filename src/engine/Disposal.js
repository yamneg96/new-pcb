export function disposeEngine(scene) {
  scene.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;

    object.geometry.dispose();

    if (object.material.isMaterial) {
      cleanMaterial(object.material);
    } else {
      for (const material of object.material) cleanMaterial(material);
    }
  });
}

function cleanMaterial(material) {
  material.dispose();
  for (const key of Object.keys(material)) {
    if (material[key] && material[key].isTexture) material[key].dispose();
  }
}

export function disposeScene(scene) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}