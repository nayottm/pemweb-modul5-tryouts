interface UndoToastProps {
  companyName: string;
  secondsRemaining: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({
  companyName,
  secondsRemaining,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-message">
        Lamaran <strong>{companyName}</strong> telah dihapus.
      </span>
      <div className="undo-actions">
        <button type="button" className="undo-btn" onClick={onUndo}>
          Undo ({secondsRemaining}d)
        </button>
        <button
          type="button"
          className="undo-dismiss"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
        >
          ×
        </button>
      </div>
    </div>
  );
}