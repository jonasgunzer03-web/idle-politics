/** FNV-1a (32 Bit) als 8-stellige Hex-Zahl. Erkennt Tippfehler und abgeschnittene Codes. */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
