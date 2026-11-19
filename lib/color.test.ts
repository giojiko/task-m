import { describe, it, expect } from 'vitest';
import { inkColor } from './color';

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastOnWhite = (hex: string) => 1.05 / (lum(hex) + 0.05);

describe('inkColor', () => {
  it('darkens the old neon direction colors to readable text', () => {
    for (const c of ['#E5D936', '#1BEACD', '#06B59C', '#FFB800', '#AAB9C8']) {
      expect(contrastOnWhite(inkColor(c))).toBeGreaterThanOrEqual(4.2);
    }
  });
  it('leaves already dark colors unchanged', () => {
    expect(inkColor('#004584')).toBe('#004584');
    expect(inkColor('#071A2B')).toBe('#071A2B');
  });
  it('accepts short hex and passes through anything unknown', () => {
    expect(inkColor('#fff')).toMatch(/^#[0-9A-F]{6}$/);
    expect(inkColor('var(--accent)')).toBe('var(--accent)');
    expect(inkColor(undefined as unknown as string)).toBe(undefined);
  });
});
