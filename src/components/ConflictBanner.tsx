import type { InterviewConflict } from '../types';
import { formatDateTimeShort } from '../utils/calculations';
import { AlertIcon } from './Icons';

interface ConflictBannerProps {
  conflicts: readonly InterviewConflict[];
  onInspectApplication: (id: string) => void;
}

export function ConflictBanner({
  conflicts,
  onInspectApplication,
}: ConflictBannerProps) {
  if (conflicts.length === 0) return null;

  return (
    <section className="conflict-banner" role="alert" aria-live="polite">
      <div className="conflict-icon-wrap">
        <AlertIcon size={20} />
      </div>
      <div className="conflict-body">
        <strong className="conflict-heading">
          Jadwal Interview Bentrok ({conflicts.length} konflik terdeteksi)
        </strong>
        <ul className="conflict-list">
          {conflicts.map((conflict) => (
            <li key={conflict.id} className="conflict-item">
              <button
                type="button"
                className="conflict-link"
                onClick={() => onInspectApplication(conflict.appA.id)}
              >
                {conflict.appA.company} ({formatDateTimeShort(conflict.appA.interviewDateTime ?? '')})
              </button>{' '}
              dan{' '}
              <button
                type="button"
                className="conflict-link"
                onClick={() => onInspectApplication(conflict.appB.id)}
              >
                {conflict.appB.company} ({formatDateTimeShort(conflict.appB.interviewDateTime ?? '')})
              </button>{' '}
              berselisih {conflict.diffMinutes} menit (kurang dari 60 menit).
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}