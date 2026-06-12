export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Vibration API not supported");
    }
  }
}

export const VIBRATION = {
  tap: 50,
  success: [100, 50, 100, 50, 200],
  error: [100, 50, 100, 50, 100],
  heavy: [200],
  meeting: [400, 200, 400, 200, 400],
  death: [800, 200, 800]
};
