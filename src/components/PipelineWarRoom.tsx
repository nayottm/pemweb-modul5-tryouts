import { useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { Application, ApplicationStatus } from '../types';
import {
  calculateSkillMatch,
  formatDateTimeShort,
  formatRupiah,
  getCompanyInitials,
  getDaysSinceUpdate,
  getMatchTier,
  isRawanGhosting,
} from '../utils/calculations';
import { STATUS_LABELS } from '../utils/stateMachine';
import { ClockIcon, SearchIcon, TrashIcon } from './Icons';

type PipelineSortOption = 'newest' | 'interview-soon' | 'offer-highest';

interface PipelineWarRoomProps {
  applications: readonly Application[];
  kaptenSkills: readonly string[];
  onOpenDetail: (id: string) => void;
  onSimulateGhosting: (id: string) => void;
  onDeleteApplication: (id: string) => void;
  onGoExplore: () => void;
  onOpenManualModal: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const ALL_STATUSES: readonly ApplicationStatus[] = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'GHOSTED',
];

export function PipelineWarRoom({
  applications,
  kaptenSkills,
  onOpenDetail,
  onSimulateGhosting,
  onDeleteApplication,
  onGoExplore,
  onOpenManualModal,
  searchInputRef,
}: PipelineWarRoomProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [onlyGhosting, setOnlyGhosting] = useState(false);
  const [sortBy, setSortBy] = useState<PipelineSortOption>('newest');

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications
      .filter((app) => {
        if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
        if (onlyGhosting && !isRawanGhosting(app)) return false;
        if (!query) return true;

        return (
          app.company.toLowerCase().includes(query) ||
          app.role.toLowerCase().includes(query) ||
          (app.cvVersion?.toLowerCase().includes(query) ?? false)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'offer-highest') {
          return (b.salaryOffer ?? 0) - (a.salaryOffer ?? 0);
        }
        if (sortBy === 'interview-soon') {
          const timeA = a.interviewDateTime
            ? new Date(a.interviewDateTime).getTime()
            : Number.POSITIVE_INFINITY;
          const timeB = b.interviewDateTime
            ? new Date(b.interviewDateTime).getTime()
            : Number.POSITIVE_INFINITY;
          return timeA - timeB;
        }
        return (
          new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
        );
      });
  }, [applications, searchQuery, statusFilter, onlyGhosting, sortBy]);

  if (applications.length === 0) {
    return (
      <section className="state-box">
        <h3>Pipeline lamaran masih kosong</h3>
        <p>
          Simpan lowongan dari Eksplorasi Lowongan atau catat lamaran secara manual
          untuk mulai melacak progres magang Kapten.
        </p>
        <div className="state-actions">
          <button type="button" className="btn-primary" onClick={onGoExplore}>
            Jelajahi Lowongan
          </button>
          <button type="button" className="btn-outline" onClick={onOpenManualModal}>
            Catat Lamaran Manual
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pipeline-section" aria-label="War room pipeline lamaran">
      <div className="pipeline-controls">
        <div className="search-field">
          <SearchIcon size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            className="text-input has-icon"
            placeholder="Cari perusahaan, posisi, atau versi CV..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Cari lamaran di pipeline"
          />
          <span className="kbd-hint">/</span>
        </div>

        <select
          className="select-input"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as 'ALL' | ApplicationStatus)
          }
          aria-label="Filter berdasarkan status"
        >
          <option value="ALL">Semua Status</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <select
          className="select-input"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as PipelineSortOption)}
          aria-label="Urutkan lamaran"
        >
          <option value="newest">Terbaru Diperbarui</option>
          <option value="interview-soon">Jadwal Interview Terdekat</option>
          <option value="offer-highest">Offer Tertinggi</option>
        </select>

        <label className={`toggle-pill ${onlyGhosting ? 'is-active' : ''}`}>
          <input
            type="checkbox"
            checked={onlyGhosting}
            onChange={(event) => setOnlyGhosting(event.target.checked)}
          />
          <span>Hanya Rawan Ghosting</span>
        </label>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="state-box">
          <h3>Tidak ada lamaran sesuai filter aktif</h3>
          <p>Coba longgarkan filter status atau matikan filter Rawan Ghosting.</p>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setOnlyGhosting(false);
            }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="pipeline-list">
          {filteredApplications.map((app) => {
            const match = calculateSkillMatch(app.requiredSkills, kaptenSkills);
            const tier = getMatchTier(match.score);
            const ghostingRisk = isRawanGhosting(app);
            const doneCount = app.checklist.filter((item) => item.done).length;
            const totalChecklist = app.checklist.length;
            const daysIdle = getDaysSinceUpdate(app.lastUpdatedAt);
            const canSimulate =
              app.status === 'APPLIED' || app.status === 'SCREENING';

            return (
              <article
                key={app.id}
                className={`pipeline-row status-accent-${app.status.toLowerCase()}`}
              >
                <div className="pipeline-main">
                  <div className="pipeline-identity">
                    <span className="company-stamp" aria-hidden="true">
                      {getCompanyInitials(app.company)}
                    </span>
                    <div>
                      <div className="pipeline-title-line">
                        <h3>{app.role}</h3>
                        <span className={`status-badge st-${app.status.toLowerCase()}`}>
                          {STATUS_LABELS[app.status]}
                        </span>
                        {ghostingRisk && (
                          <span className="ghosting-badge">
                            Rawan Ghosting ({daysIdle} hari)
                          </span>
                        )}
                      </div>
                      <p className="pipeline-sub">
                        <strong>{app.company}</strong> — {app.workMode}
                        {app.cvVersion ? ` • CV: ${app.cvVersion}` : ''}
                        {app.interviewDateTime
                          ? ` • Interview: ${formatDateTimeShort(app.interviewDateTime)}`
                          : ''}
                        {app.salaryOffer
                          ? ` • Offer: ${formatRupiah(app.salaryOffer)}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="pipeline-metrics">
                    <span className={`match-badge tier-${tier}`}>
                      {match.score}% Match
                    </span>
                    <span className="checklist-pill">
                      Checklist {doneCount}/{totalChecklist}
                    </span>
                  </div>
                </div>

                <div className="pipeline-actions">
                  <button
                    type="button"
                    className="btn-solid"
                    onClick={() => onOpenDetail(app.id)}
                  >
                    Kelola War Room
                  </button>

                  {canSimulate && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => onSimulateGhosting(app.id)}
                      title="Mundurkan lastUpdatedAt sebanyak 15 hari untuk uji Rawan Ghosting"
                    >
                      <ClockIcon size={14} />
                      <span>Simulasi +15 Hari</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-danger-ghost"
                    onClick={() => onDeleteApplication(app.id)}
                    aria-label={`Hapus lamaran ${app.company}`}
                  >
                    <TrashIcon size={15} />
                    <span>Hapus</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}