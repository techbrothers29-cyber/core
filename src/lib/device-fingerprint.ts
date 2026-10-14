// Stable per-browser fingerprint stored in localStorage
const KEY = 'bo_cashier_device_fp';

export function getDeviceFingerprint(): string {
  let fp = localStorage.getItem(KEY);
  if (!fp) {
    fp = `${crypto.randomUUID()}-${Date.now()}`;
    localStorage.setItem(KEY, fp);
  }
  return fp;
}

export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Web';
}
