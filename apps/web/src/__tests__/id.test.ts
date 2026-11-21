import { describe, expect, it } from 'vitest';
import { generateId } from '../utils/id';

describe('generateId (HTTP-safe)', () => {
  it('gera identificadores únicos com o prefixo informado', () => {
    const first = generateId('dev', 16);
    const second = generateId('dev', 16);

    expect(first.startsWith('dev_')).toBe(true);
    expect(first).toHaveLength(20);
    expect(first).not.toBe(second);
  });
});
