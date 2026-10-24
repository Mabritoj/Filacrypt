import { describe, expect, it } from 'vitest';
import { humanizeEnum } from './format';

describe('humanizeEnum', () => {
  it('title-cases snake_case values', () => {
    expect(humanizeEnum('contains_carbon_fiber')).toBe('Contains Carbon Fiber');
    expect(humanizeEnum('in_use')).toBe('In Use');
  });

  it('leaves a single word capitalized', () => {
    expect(humanizeEnum('matte')).toBe('Matte');
  });
});
