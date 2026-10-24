import { useId, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Checkbox } from '../../components/Checkbox';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Field } from '../../components/Field';
import { Select } from '../../components/Select';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
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
  const headingId = useId();

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
    <Card as="section" padding="lg" aria-labelledby={headingId}>
      <Text variant="title" as="h2" id={headingId} className={styles.heading}>
        Members
      </Text>

      {membersQuery.isError && <ErrorMessage message={membersQuery.error.message} />}

      {members && (
        <ul className={styles.roster}>
          {members.map((member) => (
            <Card as="li" key={member.userId} padding="sm" className={styles.row}>
              <div className={styles.identity}>
                <Text as="span" className={styles.name}>
                  {member.name}
                </Text>
                <Text variant="meta" className={styles.email}>
                  {member.email}
                </Text>
              </div>

              {canChangeRoles && member.role !== 'owner' ? (
                <Select
                  size="sm"
                  aria-label={`Role for ${member.name}`}
                  className={styles.roleSelect}
                  value={member.role}
                  onChange={(event) =>
                    handleRoleChange(member, event.target.value as 'admin' | 'member')
                  }
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </Select>
              ) : (
                <Badge>{member.role}</Badge>
              )}

              {member.role === 'member' && canManage ? (
                <div className={styles.permissions}>
                  {PERMISSION_KEYS.map((key) => (
                    <Checkbox
                      key={key}
                      className={styles.permission}
                      checked={member.filamentPermissions?.[key] ?? false}
                      onChange={(event) =>
                        handlePermissionToggle(member, key, event.target.checked)
                      }
                    >
                      {key}
                    </Checkbox>
                  ))}
                </div>
              ) : (
                <Text variant="meta" className={styles.permissionsSummary}>
                  {member.role === 'member'
                    ? PERMISSION_KEYS.filter((key) => member.filamentPermissions?.[key]).join(
                        ', ',
                      ) || 'No access'
                    : 'Full access'}
                </Text>
              )}

              {canManage && member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoving(member)}
                  aria-label={`Remove ${member.name}`}
                >
                  Remove
                </Button>
              )}
            </Card>
          ))}
        </ul>
      )}

      {canManage && (
        <form className={styles.inviteForm} onSubmit={handleInvite}>
          <Field label="Invite by email" className={styles.inviteField}>
            <TextInput
              type="email"
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder="someone@example.com"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" loading={inviteMember.isPending} disabled={!draftEmail.trim()}>
            {inviteMember.isPending ? 'Inviting…' : 'Invite'}
          </Button>
        </form>
      )}
      {inviteMember.isError && <ErrorMessage message={inviteMember.error.message} />}
      {updateRole.isError && <ErrorMessage message={updateRole.error.message} />}
      {updatePermissions.isError && <ErrorMessage message={updatePermissions.error.message} />}

      {removing && (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          confirmLabel="Remove"
          pendingLabel="Removing…"
          pending={removeMember.isPending}
          error={removeMember.error?.message}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        >
          <p>They will lose access to this workspace immediately.</p>
        </ConfirmDialog>
      )}
    </Card>
  );
}
