import { useState } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import type { DeletionImpactWorkspace, WorkspaceResolution } from '../../api/user';
import styles from './DeletionImpactModal.module.css';

export interface DeletionImpactModalProps {
  workspaces: DeletionImpactWorkspace[];
  onResolved: (resolutions: Record<string, WorkspaceResolution>) => void;
  onCancel: () => void;
}

export function DeletionImpactModal({
  workspaces,
  onResolved,
  onCancel,
}: DeletionImpactModalProps) {
  const [choices, setChoices] = useState<Record<string, WorkspaceResolution>>({});

  const allResolved = workspaces.every((workspace) => {
    const choice = choices[workspace.workspaceId];
    if (!choice) return false;
    if (choice.action === 'reassign') return choice.newOwnerId !== '';
    return true;
  });

  function setDelete(workspaceId: string) {
    setChoices((prev) => ({ ...prev, [workspaceId]: { action: 'delete' } }));
  }

  function setReassign(workspaceId: string, newOwnerId: string) {
    setChoices((prev) => ({ ...prev, [workspaceId]: { action: 'reassign', newOwnerId } }));
  }

  return (
    <Modal title="Before you go — resolve ownership" onCancel={onCancel}>
      <p>You own the following workspaces with other members. Choose what happens to each one.</p>

      {workspaces.map((workspace) => {
        const choice = choices[workspace.workspaceId];
        return (
          <fieldset key={workspace.workspaceId} className={styles.workspace}>
            <legend className={styles.workspaceName}>{workspace.name}</legend>

            <label className={styles.option}>
              <input
                type="radio"
                name={`resolution-${workspace.workspaceId}`}
                onChange={() =>
                  setReassign(
                    workspace.workspaceId,
                    choice?.action === 'reassign' ? choice.newOwnerId : '',
                  )
                }
                checked={choice?.action === 'reassign'}
              />
              Reassign to
              <select
                disabled={choice?.action !== 'reassign'}
                value={choice?.action === 'reassign' ? choice.newOwnerId : ''}
                onChange={(event) => setReassign(workspace.workspaceId, event.target.value)}
              >
                <option value="" disabled>
                  Choose a member
                </option>
                {workspace.members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.option}>
              <input
                type="radio"
                name={`resolution-${workspace.workspaceId}`}
                onChange={() => setDelete(workspace.workspaceId)}
                checked={choice?.action === 'delete'}
              />
              Delete this workspace — removes it and every other member&apos;s access
            </label>
          </fieldset>
        );
      })}

      <div className={styles.modalActions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" disabled={!allResolved} onClick={() => onResolved(choices)}>
          Continue
        </Button>
      </div>
    </Modal>
  );
}
