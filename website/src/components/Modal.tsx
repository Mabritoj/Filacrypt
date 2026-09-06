import type { ReactNode } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  title: string;
  children: ReactNode;
  onCancel: () => void;
}

export function Modal({ title, children }: ModalProps) {
  return (
    <div className={styles.backdrop} data-testid="modal-backdrop">
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
