// Deutsche Zahlenformatierung für das Spiel.
// Unter 10.000: ganze Zahl mit Tausenderpunkt (1.234).
// Darüber: eine Nachkommastelle mit Einheit (12,4 Tsd., 3,2 Mio., 1,5 Mrd., 2,1 Bio., 4,0 Brd.).
// Ab 1 Trillion: wissenschaftliche Schreibweise (1,2e18).

const UNITS: readonly { value: number; label: string }[] = [
  { value: 1e15, label: 'Brd.' },
  { value: 1e12, label: 'Bio.' },
  { value: 1e9, label: 'Mrd.' },
  { value: 1e6, label: 'Mio.' },
  { value: 1e3, label: 'Tsd.' },
];

const SCIENTIFIC_FROM = 1e18;
const COMPACT_FROM = 10_000;

export interface FormatOptions {
  /**
   * 'floor' (Standard) rundet ab: Man sieht nie mehr, als man hat.
   * 'round' rundet kaufmännisch, sinnvoll für Raten und Kosten.
   */
  rounding?: 'floor' | 'round';
  /** Nachkommastellen für Werte unter 10 (z. B. Raten wie 0,3/s). Standard: 0. */
  smallDecimals?: number;
  /** Vorzeichen „+“ bei positiven Werten anzeigen. */
  signed?: boolean;
}

function roundTo(value: number, decimals: number, mode: 'floor' | 'round'): number {
  const f = Math.pow(10, decimals);
  // Kleiner Zuschlag gegen Gleitkommafehler wie 1,1 · 10 = 10,999999
  const scaled = value * f;
  const r = mode === 'floor' ? Math.floor(scaled + 1e-9) : Math.round(scaled);
  return r / f;
}

function groupThousands(intString: string): string {
  return intString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fixedGerman(value: number, decimals: number): string {
  const [intPart = '0', frac] = value.toFixed(decimals).split('.');
  const grouped = groupThousands(intPart);
  return frac === undefined ? grouped : `${grouped},${frac}`;
}

function formatAbs(abs: number, opts: Required<FormatOptions>): string {
  if (abs >= SCIENTIFIC_FROM) {
    const [mantissa = '0', exponent = '0'] = abs.toExponential(1).split('e');
    const exp = exponent.replace('+', '');
    return `${mantissa.replace('.', ',')}e${exp}`;
  }
  if (abs >= COMPACT_FROM) {
    for (const unit of UNITS) {
      if (abs >= unit.value) {
        const scaled = roundTo(abs / unit.value, 1, opts.rounding);
        // Beim Aufrunden kann 999,96 Tsd. zu 1.000,0 Tsd. werden → nächste Einheit
        const bigger = UNITS[UNITS.indexOf(unit) - 1];
        if (scaled >= 1000 && bigger) return formatAbs(bigger.value, opts);
        if (scaled >= 1000 && !bigger) return formatAbs(SCIENTIFIC_FROM, opts);
        return `${fixedGerman(scaled, 1)} ${unit.label}`;
      }
    }
  }
  if (abs < 10 && opts.smallDecimals > 0) {
    const r = roundTo(abs, opts.smallDecimals, opts.rounding);
    if (r >= 10) return fixedGerman(r, 0);
    return fixedGerman(r, Number.isInteger(r) ? 0 : opts.smallDecimals);
  }
  const r = roundTo(abs, 0, opts.rounding);
  if (r >= COMPACT_FROM) return formatAbs(r, opts);
  return fixedGerman(r, 0);
}

export function formatNumber(value: number, options: FormatOptions = {}): string {
  const opts: Required<FormatOptions> = {
    rounding: options.rounding ?? 'floor',
    smallDecimals: options.smallDecimals ?? 0,
    signed: options.signed ?? false,
  };
  if (!Number.isFinite(value)) return '0';
  const text = formatAbs(Math.abs(value), opts);
  // Wird der Betrag zu 0 gerundet, nie „-0“ oder „+0“ zeigen
  const isZero = /^0(,0+)?$/.test(text);
  if (isZero) return text;
  if (value < 0) return `−${text}`;
  return opts.signed ? `+${text}` : text;
}

/** Dauer in Worten, z. B. „2 Std. 5 Min.“ oder „45 Sek.“. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
  if (m > 0) return `${m} Min.`;
  return `${s} Sek.`;
}
