import { colorFamily } from './color-family.js';

test.each([
  ['#000000', 'black'],
  ['#1a1a1a', 'black'],
  ['#ffffff', 'white'],
  ['#f8f8f8', 'white'],
  ['#808080', 'gray'],
  ['#ff0000', 'red'],
  ['#ffa500', 'orange'],
  ['#ffff00', 'yellow'],
  ['#00ff00', 'green'],
  ['#00ffff', 'cyan'],
  ['#0000ff', 'blue'],
  ['#800080', 'purple'],
  ['#ff69b4', 'pink'],
  ['#8b4513', 'brown'],
])('colorFamily(%s) is %s', (hex, expected) => {
  expect(colorFamily(hex)).toBe(expected);
});

test('colorFamily tolerates a missing leading hash', () => {
  expect(colorFamily('ff0000')).toBe('red');
});

test('colorFamily is case-insensitive', () => {
  expect(colorFamily('#8B4513')).toBe('brown');
});

test('colorFamily returns null for undefined', () => {
  expect(colorFamily(undefined)).toBeNull();
});

test.each(['#fff', 'not-a-colour', '#gggggg', ''])(
  'colorFamily returns null for malformed input %s',
  (hex) => {
    expect(colorFamily(hex)).toBeNull();
  },
);
