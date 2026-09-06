import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSpoolFilters } from './useSpoolFilters';
import { mockSpools } from '../../api/mock/spools';

// mockSpools: Galaxy Black (Prusament, PLA, glitter, 720g remaining)
//             Signal Orange (Bambu Lab, PETG, contains_carbon_fiber, 310g remaining)
//             Sakura Pink (Polymaker, PLA, matte, 880g remaining)
const lowStockThresholdG = 400;

describe('useSpoolFilters', () => {
  it('returns all spools with no filters or search applied', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    expect(result.current.filteredSpools).toHaveLength(3);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('filters by search query across brand, materialName, and materialType', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, 'bambu'));
    expect(result.current.filteredSpools.map((s) => s.id)).toEqual(['spool-signal-orange']);
  });

  it('filters by material type', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    act(() => result.current.toggleMaterialType('PLA'));
    expect(result.current.filteredSpools.map((s) => s.id).sort()).toEqual([
      'spool-galaxy-black',
      'spool-sakura-pink',
    ]);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('filters by tag', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    act(() => result.current.toggleTag('matte'));
    expect(result.current.filteredSpools.map((s) => s.id)).toEqual(['spool-sakura-pink']);
  });

  it('filters by brand', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    act(() => result.current.setBrand('Polymaker'));
    expect(result.current.filteredSpools.map((s) => s.id)).toEqual(['spool-sakura-pink']);
  });

  it('filters by low stock relative to the workspace threshold', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    act(() => result.current.toggleLowStockOnly());
    expect(result.current.filteredSpools.map((s) => s.id)).toEqual(['spool-signal-orange']);
  });

  it('combines multiple filters (AND) and search', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, 'pla'));
    act(() => result.current.toggleMaterialType('PLA'));
    act(() => result.current.toggleTag('glitter'));
    expect(result.current.filteredSpools.map((s) => s.id)).toEqual(['spool-galaxy-black']);
  });

  it('resetFilters clears all active filters', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    act(() => result.current.toggleMaterialType('PLA'));
    act(() => result.current.toggleLowStockOnly());
    expect(result.current.activeFilterCount).toBe(2);

    act(() => result.current.resetFilters());
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filteredSpools).toHaveLength(3);
  });

  it('derives available facets from the given spools', () => {
    const { result } = renderHook(() => useSpoolFilters(mockSpools, lowStockThresholdG, ''));
    expect(result.current.availableMaterialTypes.sort()).toEqual(['PETG', 'PLA']);
    expect(result.current.availableBrands.sort()).toEqual(['Bambu Lab', 'Polymaker', 'Prusament']);
    expect(result.current.availableTags.sort()).toEqual([
      'contains_carbon_fiber',
      'glitter',
      'matte',
    ]);
  });
});
