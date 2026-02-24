/**
 * Calculates the Eye Aspect Ratio (EAR)
 * Formula: EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 */
export function calculateEAR(landmarks: any[]) {
  if (landmarks.length < 6) return 0;

  // Vertical distances
  const v1 = Math.sqrt(
    Math.pow(landmarks[1].x - landmarks[5].x, 2) +
    Math.pow(landmarks[1].y - landmarks[5].y, 2)
  );
  const v2 = Math.sqrt(
    Math.pow(landmarks[2].x - landmarks[4].x, 2) +
    Math.pow(landmarks[2].y - landmarks[4].y, 2)
  );

  // Horizontal distance
  const h = Math.sqrt(
    Math.pow(landmarks[0].x - landmarks[3].x, 2) +
    Math.pow(landmarks[0].y - landmarks[3].y, 2)
  );

  return (v1 + v2) / (2.0 * h);
}

// MediaPipe Face Mesh indices for eyes
// Left Eye: [33, 160, 158, 133, 153, 144]
// Right Eye: [362, 385, 387, 263, 373, 380]
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
