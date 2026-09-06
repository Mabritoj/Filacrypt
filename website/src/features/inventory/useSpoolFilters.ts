import { useMemo, useState } from 'react';
import type { MaterialTag, MaterialType, Spool } from '../../api/types';

export interface SpoolFilters {
  materialTypes: MaterialType[];
  tags: MaterialTag[];
  colors: string[];
  brand: string | null;
  lowStockOnly: boolean;
}

const emptyFilters: SpoolFilters = {
  materialTypes: [],
  tags: [],
  colors: [],
  brand: null,
  lowStockOnly: false,
};

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function matchesSearch(spool: Spool, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = `${spool.brand} ${spool.materialName} ${spool.materialType}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function useSpoolFilters(spools: Spool[], lowStockThresholdG: number, searchQuery: string) {
  const [filters, setFilters] = useState<SpoolFilters>(emptyFilters);

  const availableMaterialTypes = useMemo(
    () => Array.from(new Set(spools.map((spool) => spool.materialType))).sort(),
    [spools],
  );

  const availableTags = useMemo(
    () => Array.from(new Set(spools.flatMap((spool) => spool.tags))).sort(),
    [spools],
  );

  const availableColors = useMemo(
    () =>
      Array.from(
        new Set(spools.map((spool) => spool.colorHex).filter((hex): hex is string => Boolean(hex))),
      ),
    [spools],
  );

  const availableBrands = useMemo(
    () => Array.from(new Set(spools.map((spool) => spool.brand))).sort(),
    [spools],
  );

  const filteredSpools = useMemo(() => {
    return spools.filter((spool) => {
      if (!matchesSearch(spool, searchQuery)) return false;
      if (filters.materialTypes.length > 0 && !filters.materialTypes.includes(spool.materialType)) {
        return false;
      }
      if (filters.tags.length > 0 && !filters.tags.some((tag) => spool.tags.includes(tag))) {
        return false;
      }
      if (
        filters.colors.length > 0 &&
        !(spool.colorHex && filters.colors.includes(spool.colorHex))
      ) {
        return false;
      }
      if (filters.brand && spool.brand !== filters.brand) return false;
      if (filters.lowStockOnly && spool.remainingWeightG >= lowStockThresholdG) return false;
      return true;
    });
  }, [spools, searchQuery, filters, lowStockThresholdG]);

  const activeFilterCount =
    filters.materialTypes.length +
    filters.tags.length +
    filters.colors.length +
    (filters.brand ? 1 : 0) +
    (filters.lowStockOnly ? 1 : 0);

  return {
    filters,
    filteredSpools,
    availableMaterialTypes,
    availableTags,
    availableColors,
    availableBrands,
    activeFilterCount,
    toggleMaterialType: (materialType: MaterialType) =>
      setFilters((prev) => ({
        ...prev,
        materialTypes: toggleInArray(prev.materialTypes, materialType),
      })),
    toggleTag: (tag: MaterialTag) =>
      setFilters((prev) => ({ ...prev, tags: toggleInArray(prev.tags, tag) })),
    toggleColor: (hex: string) =>
      setFilters((prev) => ({ ...prev, colors: toggleInArray(prev.colors, hex) })),
    setBrand: (brand: string | null) => setFilters((prev) => ({ ...prev, brand })),
    toggleLowStockOnly: () => setFilters((prev) => ({ ...prev, lowStockOnly: !prev.lowStockOnly })),
    resetFilters: () => setFilters(emptyFilters),
  };
}
