import { useEffect, useState } from 'react';
import type { ActiveTab, Application } from '../types';
import { calculateSkillMatch, isRawanGhosting } from '../utils/calculations';
import { PlusIcon } from './Icons';

interface PlaygroundHeroProps {
  applications: readonly Application[];
  kaptenSkills: readonly string[];
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenManualModal: () => void;
}

interface PointerTilt {
  x: number;
  y: number;
}

function formatLiveDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatLiveTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function PlaygroundHero({
  applications,
  kaptenSkills,
  activeTab,
  onChangeTab,
  onOpenManualModal,
}: PlaygroundHeroProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [tilt, setTilt] = useState<PointerTilt>({ x: 0, y: 0 });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeCount = applications.filter(
    (app) =>
      app.status === 'APPLIED' ||
      app.status === 'SCREENING' ||
      app.status === 'INTERVIEW'
  ).length;

  const ghostingCount = applications.filter((app) => isRawanGhosting(app)).length;

  const avgSkillMatch =
    applications.length > 0
      ? Math.round(
          applications.reduce(
            (sum, app) =>
              sum + calculateSkillMatch(app.requiredSkills, kaptenSkills).score,
            0
          ) / applications.length
        )
      : 0;

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Math.max(-1, Math.min(1, relX * 2)),
      y: Math.max(-1, Math.min(1, relY * 2)),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const stageStyle = {
    '--tilt-x': `${(tilt.y * -14).toFixed(2)}deg`,
    '--tilt-y': `${(tilt.x * 16).toFixed(2)}deg`,
    '--shift-x': `${(tilt.x * 14).toFixed(1)}px`,
    '--shift-y': `${(tilt.y * 12).toFixed(1)}px`,
  } as React.CSSProperties;

  return (
    <section
      className="pg-hero"
      aria-label="Command center Playground OS"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={stageStyle}
    >
      <div className="pg-hero-copy">
        <div className="pg-hero-eyebrow-row">
          <span className="pg-sticker-tag">PLAYGROUND OS // v5.0</span>
          <span className="pg-date-pill">
            <span className="pg-live-dot" aria-hidden="true" />
            <span>
              {formatLiveDate(now)} • {formatLiveTime(now)} WIB
            </span>
          </span>
        </div>

        <h1 className="pg-hero-title">
          Halo Kapten,
          <span className="pg-title-outline">saatnya amankan offer.</span>
        </h1>

        <p className="pg-hero-subtitle">
          Ruang kendali pencarian magang: ukur kecocokan skill, kawal status
          pipeline tanpa ghosting, dan bandingkan tawaran terbaik secara objektif.
        </p>

        <div className="pg-hero-actions">
          <button
            type="button"
            className="btn-primary pg-cta-main"
            onClick={onOpenManualModal}
          >
            <PlusIcon size={16} />
            <span>Catat Lamaran Baru</span>
          </button>

          <button
            type="button"
            className={`btn-outline ${activeTab === 'pipeline' ? 'pg-active-jump' : ''}`}
            onClick={() => onChangeTab('pipeline')}
          >
            Buka War Room ({applications.length})
          </button>

          <button
            type="button"
            className={`btn-outline ${activeTab === 'comparator' ? 'pg-active-jump' : ''}`}
            onClick={() => onChangeTab('comparator')}
          >
            Cek Offer Comparator
          </button>
        </div>
      </div>

      <div className="pg-hero-stage" aria-hidden="true">
        <div className="pg-orbit-ring pg-orbit-outer" />
        <div className="pg-orbit-ring pg-orbit-inner" />

        <div className="pg-sculpture">
          <div className="pg-cube">
            <div className="pg-face pg-front">AM</div>
            <div className="pg-face pg-back">OS</div>
            <div className="pg-face pg-right">CV</div>
            <div className="pg-face pg-left">HR</div>
            <div className="pg-face pg-top">GO</div>
            <div className="pg-face pg-bottom">IT</div>
          </div>
          <div className="pg-orb pg-orb-cobalt" />
          <div className="pg-orb pg-orb-coral" />
          <div className="pg-prism-lime" />
        </div>

        <div className="pg-float-chip pg-chip-top">
          <span className="pg-chip-label">Pipeline Aktif</span>
          <strong>{activeCount} posisi</strong>
        </div>

        <div className="pg-float-chip pg-chip-right">
          <span className="pg-chip-label">Rata-rata Match</span>
          <strong>{avgSkillMatch}%</strong>
        </div>

        <div
          className={`pg-float-chip pg-chip-bottom ${
            ghostingCount > 0 ? 'is-warning' : ''
          }`}
        >
          <span className="pg-chip-label">Radar Ghosting</span>
          <strong>{ghostingCount > 0 ? `${ghostingCount} waspada` : 'Aman'}</strong>
        </div>
      </div>
    </section>
  );
}