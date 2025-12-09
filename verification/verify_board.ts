import { BOARD_SIZE, BOARD_LAYOUT, BOARD_COORDINATES, ROW_LENGTH } from '../constants';
import { TileType } from '../types';

console.log('Verifying Board Configuration...');

// 1. Verify Sizes
if (BOARD_SIZE !== 216) {
  throw new Error(`Expected BOARD_SIZE to be 216, but got ${BOARD_SIZE}`);
}
if (BOARD_LAYOUT.length !== 216) {
  throw new Error(`Expected BOARD_LAYOUT length to be 216, but got ${BOARD_LAYOUT.length}`);
}
if (BOARD_COORDINATES.length !== 216) {
  throw new Error(`Expected BOARD_COORDINATES length to be 216, but got ${BOARD_COORDINATES.length}`);
}

console.log('✅ Size checks passed.');

// 2. Verify Start and Goal
if (BOARD_LAYOUT[0] !== TileType.START) {
  throw new Error(`Expected first tile to be START, but got ${BOARD_LAYOUT[0]}`);
}
if (BOARD_LAYOUT[215] !== TileType.GOAL) {
  throw new Error(`Expected last tile to be GOAL, but got ${BOARD_LAYOUT[215]}`);
}

console.log('✅ Start/Goal checks passed.');

// 3. Verify Coordinates Snake Pattern
// Check continuity: Each tile should be distance 1 away from the previous one
for (let i = 1; i < BOARD_SIZE; i++) {
  const prev = BOARD_COORDINATES[i - 1];
  const curr = BOARD_COORDINATES[i];

  const dx = Math.abs(curr.x - prev.x);
  const dy = Math.abs(curr.y - prev.y);

  const dist = dx + dy;
  if (dist !== 1) {
    throw new Error(`Discontinuity found at index ${i}: (${prev.x},${prev.y}) -> (${curr.x},${curr.y})`);
  }
}

console.log('✅ Coordinate continuity checks passed.');

// 4. Verify Row Width
// Check max X coordinate matches ROW_LENGTH - 1
const maxX = Math.max(...BOARD_COORDINATES.map(c => c.x));
if (maxX !== 11) { // 12 items: 0 to 11
    throw new Error(`Expected max X to be 11, got ${maxX}`);
}

console.log('✅ Row width checks passed.');

console.log('All verifications passed!');
