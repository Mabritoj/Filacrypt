import { useState } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ErrorMessage } from '../../components/ErrorMessage';
import {
  useMembers,
  useInviteMember,
  useUpdateMemberRole,
  useUpdateMemberPermissions,
  useRemoveMember,
} from '../../api/members';
import type { FilamentPermissions, WorkspaceMember, WorkspaceRole } from '../../api/types';
import styles from './MembersSection.module.css';

export interface MembersSectionProps {
  workspaceId: string;
  callerRole: WorkspaceRole;
}

const PERMISSION_KEYS: (keyof FilamentPermissions)[] = ['create', 'read', 'update', 'delete'];

const ROLE_RANK: Record<WorkspaceRole, number> = { owner: 0, admin: 1, member: 2 };

export function MembersSection({ workspaceId, callerRole }: MembersSectionProps) {
  const [draftEmail, setDraftEmail] = useState('');
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);

  const membersQuery = useMembers(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const updatePermissions = useUpdateMemberPermissions(workspaceId);
  const removeMember = useRemoveMember(workspaceId);

  const canManage = callerRole === 'owner' || callerRole === 'admin';
  const canChangeRoles = callerRole === 'owner';

  const members = membersQuery.data
    ? [...membersQuery.data].sort((a, b) => {
        const rankDiff = ROLE_RANK[a.role] - ROLE_RANK[b.role];
        return rankDiff !== 0 ? rankDiff : a.joinedAt.localeCompare(b.joinedAt);
      })
    : undefined;

  function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!draftEmail.trim()) return;
    inviteMember.mutate({ email: draftEmail.trim() }, { onSuccess: () => setDraftEmail('') });
  }

  function handlePermissionToggle(
    member: WorkspaceMember,
    key: keyof FilamentPermissions,
    value: boolean,
  ) {
    updatePermissions.mutate({ userId: member.userId, filamentPermissions: { [key]: value } });
  }

  function handleRoleChange(member: WorkspaceMember, role: 'admin' | 'member') {
    updateRole.mutate({ userId: member.userId, role });
  }

  function confirmRemove() {
    if (!removing) return;
    removeMember.mutate({ userId: removing.userId }, { onSuccess: () => setRemoving(null) });
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Members</h2>

      {membersQuery.isError && <ErrorMessage message={membersQuery.error.message} />}

      {members && (
        <ul className={styles.roster}>
          {members.map((member) => (
            <li key={member.userId} className={styles.row}>
              <div className={styles.identity}>
                <span className={styles.name}>{member.name}</span>
                <span className={styles.email}>{member.email}</span>
              </div>

              {canChangeRoles && member.role !== 'owner' ? (
                <select
                  aria-label={`Role for ${member.name}`}
                  className={styles.roleSelect}
                  value={member.role}
                  onChange={(event) =>
                    handleRoleChange(member, event.target.value as 'admin' | 'member')
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <span className={styles.roleLabel}>{member.role}</span>
              )}

              {member.role === 'member' && canManage ? (
                <div className={styles.permissions}>
                  {PERMISSION_KEYS.map((key) => (
                    <label key={key} className={styles.permissionToggle}>
                      <input
                        type="checkbox"
                        aria-label={key}
                        checked={member.filamentPermissions?.[key] ?? false}
                        onChange={(event) =>
                          handlePermissionToggle(member, key, event.target.checked)
                        }
                      />
                      {key}
                    </label>
                  ))}
                </div>
              ) : member.role === 'member' ? (
                <span className={styles.permissionsSummary}>
                  {PERMISSION_KEYS.filter((key) => member.filamentPermissions?.[key]).join(', ') ||
                    'No access'}
                </span>
              ) : (
                <span className={styles.permissionsSummary}>Full access</span>
              )}

              {canManage && member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  onClick={() => setRemoving(member)}
                  aria-label={`Remove ${member.name}`}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form className={styles.inviteForm} onSubmit={handleInvite}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Invite by email</span>
            <input
              type="email"
              aria-label="Email"
              className={styles.input}
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder="someone@example.com"
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={inviteMember.isPending || !draftEmail.trim()}
          >
            {inviteMember.isPending ? 'Inviting…' : 'Invite'}
          </Button>
        </form>
      )}
      {inviteMember.isError && <ErrorMessage message={inviteMember.error.message} />}
      {updateRole.isError && <ErrorMessage message={updateRole.error.message} />}
      {updatePermissions.isError && <ErrorMessage message={updatePermissions.error.message} />}

      {removing && (
        <Modal title={`Remove ${removing.name}?`} onCancel={() => setRemoving(null)}>
          <p>They will lose access to this workspace immediately.</p>
          {removeMember.isError && <ErrorMessage message={removeMember.error.message} />}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove} disabled={removeMember.isPending}>
              {removeMember.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
