/**
 * Removes internal channel/system suffixes from NovaXS product names.
 * Keeps age ranges and product types intact.
 */

const CHANNEL_PATTERNS: RegExp[] = [
  // Remove {…} blocks containing technical terms
  /\{[^}]*?\b(?:OTA|OTAS|OCULTO|parksnet|API|B2[BC]|PNT|NET)\b[^}]*?\}\s*/gi,
  // Remove […] blocks containing technical terms
  /\[[^\]]*?\b(?:OTA|OTAS|OCULTO|parksnet|API|B2[BC]|PNT|NET)\b[^\]]*?\]\s*/gi,
  // Remove (…) blocks containing ONLY technical terms
  /\(\s*(?:OTA|OTAS|OCULTO|parksnet|API|B2[BC]|PNT|NET)\s*\)\s*/gi,
  /\s*[\-–—]\s*parksnet\b/gi,
  /\bparksnet\b/gi,
  /\bOTAS?\s*OCULTO?\s*[\-–—]?\s*/gi,
  /\bOTAS?\b\s*[\-–—]?\s*/gi,
  /\s*[\-–—]\s*API\b/gi,
  /\bAPI\b\s*[\-–—]?\s*/gi,
  /\s*[\-–—]\s*B2[BC]\b/gi,
  /\bB2[BC]\b\s*[\-–—]?\s*/gi,
  /\s*[\-–—]\s*NET\s*\d+/gi,
  /\bNET\s*\d+\b/gi,
  /\s+lojas\b/gi,
  /\bPNT\b\s*[\-–—]?\s*/gi,
];

export function cleanProductName(name: string): string {
  let cleaned = name;
  for (const pattern of CHANNEL_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Collapse multiple spaces/dashes and trim
  cleaned = cleaned
    .replace(/\s*[\-–—]\s*[\-–—]\s*/g, ' – ')
    .replace(/^\s*[\-–—]\s*/, '')
    .replace(/\s*[\-–—]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || name;
}
