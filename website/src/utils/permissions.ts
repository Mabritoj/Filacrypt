import type { FilamentPermissions, Workspace } from '../api/types';

/**
 * Mirrors the backend's assertFilamentPermission (layers/common/src/workspace-auth)
 * -- owner/admin get implicit full access, a `member` is checked against the
 * granted filamentPermissions. Was hand-duplicated across InventoryHome.tsx
 * and FilamentDetail.tsx; centralized here so the three call sites (and the
 * backend rule) can't drift apart.
 */
export function canFilament(
  workspace: Workspace | undefined,
  action: keyof FilamentPermissions,
): boolean {
  return (
    workspace?.callerRole === 'owner' ||
    workspace?.callerRole === 'admin' ||
    Boolean(workspace?.callerFilamentPermissions?.[action])
  );
}
