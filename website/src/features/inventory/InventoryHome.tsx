import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpools } from '../../api/spools';
import { usePreferences } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import { AppHeader } from '../../components/AppHeader';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpool } from '../../components/LoadingSpool';
import { PageShell } from '../../components/PageShell';
import { useDismissablePanel } from '../../hooks/useDismissablePanel';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { formatWeight } from '../../utils/units';
import { canFilament } from '../../utils/permissions';
import { Button } from '../../components/Button';
import { FilterPanel } from './FilterPanel';
import { SpoolCard } from './SpoolCard';
import { useSpoolFilters } from './useSpoolFilters';
import styles from './InventoryHome.module.css';

const PAGE_SIZE = 6;

export function InventoryHome() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const preferences = usePreferences();
  const spoolsQuery = useSpools(workspaceId ?? '');
  const workspaceQuery = useWorkspace(workspaceId ?? '');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useDismissablePanel<HTMLDivElement>(filterOpen, () => setFilterOpen(false));

  const spoolsData = spoolsQuery.data;
  const spools = useMemo(() => spoolsData ?? [], [spoolsData]);
  const lowStockThresholdG = workspaceQuery.data?.lowStockThresholdG ?? 0;
  const workspace = workspaceQuery.data;
  const canAddSpool = canFilament(workspace, 'create');

  const {
    filters,
    filteredSpools,
    availableMaterialTypes,
    availableTags,
    availableColors,
    availableBrands,
    activeFilterCount,
    toggleMaterialType,
    toggleTag,
    toggleColor,
    setBrand,
    toggleLowStockOnly,
    resetFilters,
  } = useSpoolFilters(spools, lowStockThresholdG, search);

  const totalRemainingG = useMemo(
    () => spools.reduce((sum, spool) => sum + spool.remainingWeightG, 0),
    [spools],
  );
  const [totalRemainingValue, totalRemainingUnit] = formatWeight(
    totalRemainingG,
    preferences.weightUnit,
  ).split(' ');
  const brandCount = useMemo(() => new Set(spools.map((spool) => spool.brand)).size, [spools]);
  const lowStockCount = useMemo(
    () => spools.filter((spool) => spool.remainingWeightG < lowStockThresholdG).length,
    [spools, lowStockThresholdG],
  );

  const totalPages = Math.max(1, Math.ceil(filteredSpools.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedSpools = filteredSpools.slice(pageStart, pageStart + PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  if (spoolsQuery.isPending || workspaceQuery.isPending) {
    return (
      <PageShell centered header={<AppHeader />}>
        <LoadingSpool message="Loading inventory…" />
      </PageShell>
    );
  }

  if (spoolsQuery.isError || workspaceQuery.isError) {
    return (
      <PageShell centered header={<AppHeader />}>
        <ErrorMessage message="Something went wrong loading your inventory." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppHeader />

      <div className={styles.titleRow}>
        <h1 className={styles.title}>Inventory</h1>
        {canAddSpool && (
          <Button className={styles.scanButton} onClick={() => navigate('/scan')}>
            + Scan / Add spool
          </Button>
        )}
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statTile}>
          <div className={styles.statLabel}>Filament remaining</div>
          <div className={styles.statValue}>
            {totalRemainingValue}
            <span className={styles.statUnit}> {totalRemainingUnit}</span>
          </div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statLabel}>Brands</div>
          <div className={styles.statValue}>{brandCount}</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statLabel} data-danger="true">
            Low stock
          </div>
          <div className={styles.statValue} data-danger="true">
            {lowStockCount}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search brand, material, color…"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            aria-label="Search spools"
          />
        </div>
        <div className={styles.filterWrap} ref={filterRef}>
          <button
            type="button"
            className={styles.filterButton}
            onClick={() => setFilterOpen((value) => !value)}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className={styles.filterCount}>{activeFilterCount}</span>
            )}
          </button>
          {filterOpen && (
            <FilterPanel
              availableMaterialTypes={availableMaterialTypes}
              availableTags={availableTags}
              availableColors={availableColors}
              availableBrands={availableBrands}
              materialTypes={filters.materialTypes}
              tags={filters.tags}
              colors={filters.colors}
              brand={filters.brand}
              lowStockOnly={filters.lowStockOnly}
              onToggleMaterialType={toggleMaterialType}
              onToggleTag={toggleTag}
              onToggleColor={toggleColor}
              onSetBrand={setBrand}
              onToggleLowStockOnly={toggleLowStockOnly}
              onReset={resetFilters}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
      </div>

      {filteredSpools.length === 0 ? (
        <p className={styles.empty}>No spools match your search or filters.</p>
      ) : (
        <div className={styles.grid}>
          {paginatedSpools.map((spool) => (
            <SpoolCard
              key={spool.id}
              spool={spool}
              lowStockThresholdG={lowStockThresholdG}
              weightUnit={preferences.weightUnit}
              onClick={() => navigate(`/inventory/${spool.id}`)}
            />
          ))}
        </div>
      )}

      <div className={styles.pagination}>
        <span className={styles.pageSummary}>
          Showing {filteredSpools.length === 0 ? 0 : pageStart + 1}–
          {Math.min(pageStart + PAGE_SIZE, filteredSpools.length)} of {filteredSpools.length}
        </span>
        {totalPages > 1 && (
          <div className={styles.pageButtons}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={styles.pageButton}
                data-active={pageNumber === currentPage}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
