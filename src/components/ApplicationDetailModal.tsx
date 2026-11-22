import { useRef, useState } from 'react';
import type {
  Application,
  ApplicationStatus,
  TransitionPayload,
  WorkMode,
} from '../types';
import {
  calculateSkillMatch,
  formatDateTimeFull,
  formatRupiah,
  getCompanyInitials,
  getMatchTier,
  isRawanGhosting,
} from '../utils/calculations';
import {
  getAllowedNextStatuses,
  getStageIndex,
  isFinalStatus,
  PIPELINE_STAGES,
  STATUS_LABELS,
} from '../utils/stateMachine';
import { CloseIcon, ClockIcon, TrashIcon } from './Icons';
import { InterviewPrepTimer } from './InterviewPrepTimer';

interface ApplicationDetailModalProps {
  application: Application;
  kaptenSkills: readonly string[];
  onClose: () => void;
  onTransitionStatus: (
    appId: string,
    targetStatus: ApplicationStatus,
    payload?: TransitionPayload
  ) => void;
  onAddChecklistItem: (appId: string, text: string) => void;
  onToggleChecklistItem: (appId: string, itemId: string) => void;
  onDeleteChecklistItem: (appId: string, itemId: string) => void;
  onAddManualNote: (appId: string, note: string) => void;
  onSimulateGhosting: (appId: string) => void;
  onDeleteApplication: (appId: string) => void;
}

export function ApplicationDetailModal({
  application,
  kaptenSkills,
  onClose,
  onTransitionStatus,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddManualNote,
  onSimulateGhosting,
  onDeleteApplication,
}: ApplicationDetailModalProps) {
  const allowedNext = getAllowedNextStatuses(application.status);
  const finalStatus = isFinalStatus(application.status);
  const currentStageIndex = getStageIndex(application.status);
  const ghostingRisk = isRawanGhosting(application);
  const match = calculateSkillMatch(application.requiredSkills, kaptenSkills);
  const tier = getMatchTier(match.score);

  const [selectedNext, setSelectedNext] = useState<ApplicationStatus | null>(
    allowedNext[0] ?? null
  );
  const [cvVersion, setCvVersion] = useState(application.cvVersion ?? '');
  const [appliedDate, setAppliedDate] = useState(
    application.appliedDate ?? new Date().toISOString().slice(0, 10)
  );
  const [interviewDateTime, setInterviewDateTime] = useState(
    application.interviewDateTime ?? ''
  );
  const [salaryOffer, setSalaryOffer] = useState(
    application.salaryOffer ? String(application.salaryOffer) : ''
  );
  const [offerWorkMode, setOfferWorkMode] = useState<WorkMode>(application.workMode);
  const [transitionError, setTransitionError] = useState('');

  const [checklistInput, setChecklistInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const cvRef = useRef<HTMLInputElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const interviewRef = useRef<HTMLInputElement | null>(null);
  const salaryRef = useRef<HTMLInputElement | null>(null);

  const doneCount = application.checklist.filter((item) => item.done).length;
  const totalChecklist = application.checklist.length;
  const checklistPct =
    totalChecklist > 0 ? Math.round((doneCount / totalChecklist) * 100) : 0;

  const handleConfirmTransition = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedNext) return;
    setTransitionError('');

    if (selectedNext === 'APPLIED') {
      if (!cvVersion.trim()) {
        setTransitionError('Versi CV wajib diisi sebelum pindah ke Applied.');
        cvRef.current?.focus();
        return;
      }
      if (!appliedDate.trim()) {
        setTransitionError('Tanggal melamar wajib diisi sebelum pindah ke Applied.');
        dateRef.current?.focus();
        return;
      }
      onTransitionStatus(application.id, 'APPLIED', {
        cvVersion: cvVersion.trim(),
        appliedDate: appliedDate.trim(),
      });
      setSelectedNext(null);
      return;
    }

    if (selectedNext === 'INTERVIEW') {
      if (!interviewDateTime.trim()) {
        setTransitionError('Jadwal interview (tanggal & jam) wajib diisi.');
        interviewRef.current?.focus();
        return;
      }
      onTransitionStatus(application.id, 'INTERVIEW', {
        interviewDateTime: interviewDateTime.trim(),
      });
      setSelectedNext(null);
      return;
    }

    if (selectedNext === 'OFFER') {
      const parsedSalary = Number(salaryOffer);
      if (!Number.isFinite(parsedSalary) || parsedSalary <= 0) {
        setTransitionError('Nominal uang saku / gaji harus lebih dari Rp 0.');
        salaryRef.current?.focus();
        return;
      }
      onTransitionStatus(application.id, 'OFFER', {
        salaryOffer: Math.round(parsedSalary),
        workMode: offerWorkMode,
      });
      setSelectedNext(null);
      return;
    }

    onTransitionStatus(application.id, selectedNext);
    setSelectedNext(null);
  };

  const handleChecklistSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = checklistInput.trim();
    if (!trimmed) return;
    onAddChecklistItem(application.id, trimmed);
    setChecklistInput('');
  };

  const handleNoteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onAddManualNote(application.id, trimmed);
    setNoteInput('');
  };

  const canSimulate =
    application.status === 'APPLIED' || application.status === 'SCREENING';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet modal-wide">
        <div className="detail-header">
          <div className="detail-identity">
            <span className="company-stamp is-lg" aria-hidden="true">
              {getCompanyInitials(application.company)}
            </span>
            <div>
              <h2 id="detail-modal-title">
                {application.role} — {application.company}
              </h2>
              <p className="modal-sub">
                Mode: {application.workMode}
                {application.cvVersion ? ` • CV: ${application.cvVersion}` : ''}
                {application.interviewDateTime
                  ? ` • Jadwal Interview: ${formatDateTimeFull(application.interviewDateTime)}`
                  : ''}
                {application.salaryOffer
                  ? ` • Offer: ${formatRupiah(application.salaryOffer)}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="detail-header-actions">
            <span className={`status-badge st-${application.status.toLowerCase()}`}>
              {STATUS_LABELS[application.status]}
            </span>
            <span className={`match-badge tier-${tier}`}>{match.score}% Match</span>
            {ghostingRisk && <span className="ghosting-badge">Rawan Ghosting</span>}

            {canSimulate && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => onSimulateGhosting(application.id)}
              >
                <ClockIcon size={14} />
                <span>Simulasi +15 Hari</span>
              </button>
            )}

            <button
              type="button"
              className="btn-danger-ghost"
              onClick={() => {
                onDeleteApplication(application.id);
                onClose();
              }}
            >
              <TrashIcon size={14} />
              <span>Hapus</span>
            </button>

            <button
              type="button"
              className="icon-tool-btn"
              onClick={onClose}
              aria-label="Tutup detail lamaran"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-col-left">
            <section className="detail-panel">
              <h3>Tahap Seleksi</h3>
              <ol className="stepper-track">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone =
                    currentStageIndex !== -1 && idx < currentStageIndex;
                  const isCurrent = application.status === stage;

                  return (
                    <li
                      key={stage}
                      className={`stepper-node ${isDone ? 'is-done' : ''} ${
                        isCurrent ? 'is-current' : ''
                      }`}
                    >
                      <span className="stepper-bar" />
                      <span className="stepper-label">
                        {idx + 1}. {STATUS_LABELS[stage]}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {finalStatus ? (
                <p className="final-status-note">
                  Status <strong>{STATUS_LABELS[application.status]}</strong> bersifat
                  final dan tidak dapat dipindahkan lagi.
                </p>
              ) : (
                <form
                  className="transition-box"
                  onSubmit={handleConfirmTransition}
                  noValidate
                >
                  <div className="transition-row">
                    <span className="transition-prompt">Pindahkan status ke:</span>
                    <div className="transition-buttons">
                      {allowedNext.map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          className={`stage-choice-btn ${
                            selectedNext === nextStatus ? 'is-selected' : ''
                          }`}
                          onClick={() => {
                            setSelectedNext(nextStatus);
                            setTransitionError('');
                          }}
                        >
                          {STATUS_LABELS[nextStatus]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedNext === 'APPLIED' && (
                    <div className="form-row-2">
                      <div className="form-group">
                        <label htmlFor="trans-cv">Versi CV</label>
                        <input
                          id="trans-cv"
                          ref={cvRef}
                          type="text"
                          className="text-input"
                          placeholder="Kapten-CV-v2.pdf"
                          value={cvVersion}
                          onChange={(event) => setCvVersion(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="trans-date">Tanggal Melamar</label>
                        <input
                          id="trans-date"
                          ref={dateRef}
                          type="date"
                          className="text-input"
                          value={appliedDate}
                          onChange={(event) => setAppliedDate(event.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {selectedNext === 'INTERVIEW' && (
                    <div className="form-group">
                      <label htmlFor="trans-interview">
                        Jadwal Interview (YYYY-MM-DDTHH:mm)
                      </label>
                      <input
                        id="trans-interview"
                        ref={interviewRef}
                        type="datetime-local"
                        className="text-input"
                        value={interviewDateTime}
                        onChange={(event) => setInterviewDateTime(event.target.value)}
                      />
                    </div>
                  )}

                  {selectedNext === 'OFFER' && (
                    <div className="form-row-2">
                      <div className="form-group">
                        <label htmlFor="trans-salary">Uang Saku / Gaji (Rp)</label>
                        <input
                          id="trans-salary"
                          ref={salaryRef}
                          type="number"
                          min={1}
                          step={100000}
                          className="text-input"
                          placeholder="5500000"
                          value={salaryOffer}
                          onChange={(event) => setSalaryOffer(event.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="trans-mode">Mode Kerja</label>
                        <select
                          id="trans-mode"
                          className="select-input"
                          value={offerWorkMode}
                          onChange={(event) =>
                            setOfferWorkMode(event.target.value as WorkMode)
                          }
                        >
                          <option value="Remote">Remote</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Onsite">Onsite</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {transitionError && (
                    <p className="field-error">{transitionError}</p>
                  )}

                  <div className="transition-submit-row">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!selectedNext}
                    >
                      Konfirmasi ke{' '}
                      {selectedNext ? STATUS_LABELS[selectedNext] : '...'}
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="detail-panel">
              <div className="panel-head">
                <h3>Daftar Persiapan</h3>
                <span className="mono-badge">
                  {doneCount} / {totalChecklist} selesai
                </span>
              </div>

              <div
                className="checklist-progress-track"
                role="progressbar"
                aria-valuenow={checklistPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="checklist-progress-fill"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>

              {application.checklist.length === 0 ? (
                <p className="empty-inline">
                  Belum ada tugas persiapan. Tambahkan item checklist di bawah.
                </p>
              ) : (
                <ul className="checklist-items">
                  {application.checklist.map((item) => (
                    <li
                      key={item.id}
                      className={`checklist-row ${item.done ? 'is-done' : ''}`}
                    >
                      <label className="checklist-label">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            onToggleChecklistItem(application.id, item.id)
                          }
                        />
                        <span>{item.text}</span>
                      </label>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() =>
                          onDeleteChecklistItem(application.id, item.id)
                        }
                        aria-label={`Hapus checklist ${item.text}`}
                      >
                        <CloseIcon size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form className="inline-add-form" onSubmit={handleChecklistSubmit}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Tambah tugas persiapan baru..."
                  value={checklistInput}
                  onChange={(event) => setChecklistInput(event.target.value)}
                  aria-label="Tugas persiapan baru"
                />
                <button type="submit" className="btn-solid">
                  Tambah
                </button>
              </form>
            </section>
          </div>

          <div className="detail-col-right">
            <InterviewPrepTimer />

            <section className="detail-panel">
              <h3>Riwayat Aktivitas</h3>

              <form className="inline-add-form" onSubmit={handleNoteSubmit}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Catat hasil follow-up atau insight HR..."
                  value={noteInput}
                  onChange={(event) => setNoteInput(event.target.value)}
                  aria-label="Tambah catatan aktivitas"
                />
                <button type="submit" className="btn-outline">
                  Catat
                </button>
              </form>

              <ol className="activity-timeline">
                {application.activityLogs.map((log) => (
                  <li key={log.id} className="activity-item">
                    <span className="activity-dot" aria-hidden="true" />
                    <div>
                      <time className="activity-time">
                        {formatDateTimeFull(log.timestamp)}
                      </time>
                      <p className="activity-msg">{log.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}