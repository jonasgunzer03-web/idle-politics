import { formatDuration, formatNumber } from './format';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [7.9, '7'],
    [999, '999'],
    [1234, '1.234'],
    [9999.99, '9.999'],
    [10_000, '10,0 Tsd.'],
    [12_400, '12,4 Tsd.'],
    [12_499, '12,4 Tsd.'],
    [999_999, '999,9 Tsd.'],
    [3_200_000, '3,2 Mio.'],
    [1_500_000_000, '1,5 Mrd.'],
    [2_100_000_000_000, '2,1 Bio.'],
    [4e15, '4,0 Brd.'],
    [999.9e15, '999,9 Brd.'],
    [1.2e18, '1,2e18'],
    [3.45e120, '3,5e120'],
  ])('%d → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('rundet beim Aufrunden korrekt in die nächste Einheit', () => {
    expect(formatNumber(999_960, { rounding: 'round' })).toBe('1,0 Mio.');
    expect(formatNumber(9_999.6, { rounding: 'round' })).toBe('10,0 Tsd.');
  });

  it('zeigt Nachkommastellen für kleine Werte nur auf Wunsch', () => {
    expect(formatNumber(0.3, { smallDecimals: 1, rounding: 'round' })).toBe('0,3');
    expect(formatNumber(2, { smallDecimals: 1 })).toBe('2');
    expect(formatNumber(9.99, { smallDecimals: 1, rounding: 'round' })).toBe('10');
    expect(formatNumber(1.05, { smallDecimals: 1 })).toBe('1');
    expect(formatNumber(1.25, { smallDecimals: 1 })).toBe('1,2');
  });

  it('rundet auf Wunsch auf (Fehlbeträge)', () => {
    expect(formatNumber(0.37, { rounding: 'ceil' })).toBe('1');
    expect(formatNumber(12, { rounding: 'ceil' })).toBe('12');
    expect(formatNumber(12_401, { rounding: 'ceil' })).toBe('12,5 Tsd.');
    expect(formatNumber(999_951, { rounding: 'ceil' })).toBe('1,0 Mio.');
  });

  it('zeigt nie „-0“', () => {
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.4)).toBe('0');
    expect(formatNumber(-0.04, { smallDecimals: 1, rounding: 'round' })).toBe('0');
    expect(formatNumber(0, { signed: true })).toBe('0');
  });

  it('formatiert Vorzeichen', () => {
    expect(formatNumber(12, { signed: true })).toBe('+12');
    expect(formatNumber(-1234)).toBe('−1.234');
  });

  it('fängt NaN und Infinity ab', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('0');
  });

  it('vermeidet Gleitkommafehler beim Abrunden', () => {
    expect(formatNumber(1.1 * 10_000)).toBe('11,0 Tsd.');
  });
});

describe('formatDuration', () => {
  it('formatiert Sekunden, Minuten und Stunden', () => {
    expect(formatDuration(45_000)).toBe('45 Sek.');
    expect(formatDuration(5 * 60_000)).toBe('5 Min.');
    expect(formatDuration(2 * 3_600_000 + 5 * 60_000)).toBe('2 Std. 5 Min.');
    expect(formatDuration(8 * 3_600_000)).toBe('8 Std.');
    expect(formatDuration(-5)).toBe('0 Sek.');
  });
});
