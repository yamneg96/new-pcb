import * as THREE from "three";

const DEFAULT_BOARD_CONFIG = {
  width: 100,
  height: 80,
  thickness: 1.6,
};

/**
 * Creates an FR4 PCB substrate mesh.
 *
 * Geometry: BoxGeometry (width x thickness x height)
 * Material: Dark green FR4, rough, non-metallic.
 * Positioned at the origin (0, 0, 0), centered.
 */
export function createBoard(config = {}) {
  const { width, height, thickness } = { ...DEFAULT_BOARD_CONFIG, ...config };

  const geometry = new THREE.BoxGeometry(width, thickness, height);

  const material = new THREE.MeshStandardMaterial({
    color: 0x004d00, // Dark FR4 green
    roughness: 0.9,
    metalness: 0.05,
  });

  const board = new THREE.Mesh(geometry, material);
  // BoxGeometry is centered by default, so (0, 0, 0) is already correct.
  board.position.set(0, 0, 0);

  // Tag for future filtering / persistence
  board.userData.type = "board";
  board.userData.boardConfig = { width, height, thickness };

  return board;
}
