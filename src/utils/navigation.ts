/**
 * Normalizes an angle to the range -180 to +180 degrees.
 * This is crucial for calculating the shortest rotation from the device heading
 * to the destination bearing.
 * @param angle The angle in degrees.
 * @returns The normalized angle in the range -180 to 180.
 */
export function normalizeAngle(angle: number): number {
  let a = ((angle + 180) % 360 + 360) % 360 - 180;
  return a;
}

/**
 * Placeholder for a function to compute the bearing between two GPS coordinates.
 * In a real application, this would use the Haversine formula.
 * For this demo, we use a fixed bearing.
 * @param p1 - Start point { lat: number, lon: number }
 * @param p2 - End point { lat: number, lon: number }
 * @returns The bearing in degrees from 0 to 360.
 */
export function bearingBetweenPoints(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): number {
  // This would be a proper haversine calculation in a real-world app
  console.log(p1, p2); // To satisfy TS compiler
  return 0; // Returning a default value
}
