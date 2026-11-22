import { useState } from 'react';
import type { Application, ApplicationStatus } from '../types';
import { isRawanGhosting } from '../utils/calculations';
import { STATUS_LABELS } from '../utils/stateMachine';

interface StatsStripProps {
  applications: readonly Application[];
}

type ChartScope = 'all' | 'active' | 'closed';

const STAGE_ORDER: readonly ApplicationStatus[] = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'GHOSTED',
  'REJECTED',
];

const ACTIVE_SET: ReadonlySet<ApplicationStatus> = new Set([
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
]);

const CLOSED_SET: ReadonlySet<ApplicationStatus> = new Set([
  'OFFER',
  'GHOSTED',
  'REJECTED',
]);

export function StatsStrip({ applications }: StatsStripProps) {
  const [chartScope, setChartScope] = useState<ChartScope>('all');
  const [hoveredStatus, setHoveredStatus] = useState<ApplicationStatus | null>(
    null
  );

  // 100% Derived State (tanpa useState terpisah untuk angka metrik)
  const totalLamaran = applications.length;

  const aktifPipeline = applications.filter(
    (app) =>
      app.status === 'APPLIED' ||
      app.status === 'SCREENING' ||
      app.status === 'INTERVIEW'
  ).length;

  const respondedCount = applications.filter(
    (app) =>
      app.status === 'SCREENING' ||
      app.status === 'INTERVIEW' ||
      app.status === 'OFFER' ||
      app.status === 'REJECTED'
  ).length;

  const interviewCount = applications.filter(
    (app) =>
      app.status === 'INTERVIEW' ||
      app.status === 'OFFER' ||
      Boolean(app.interviewDateTime)
  ).length;

  const ghostingCount = applications.filter((app) => isRawanGhosting(app)).length;
  const offerCount = applications.filter((app) => app.status === 'OFFER').length;

  const responseRate =
    totalLamaran > 0 ? Math.round((respondedCount / totalLamaran) * 100) : 0;
  const interviewRate =
    totalLamaran > 0 ? Math.round((interviewCount / totalLamaran) * 100) : 0;

  // Ring progress calculation untuk Response Rate
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - responseRate / 100);

  // Segmented bar (10 blok) untuk Interview Rate
  const filledBlocks = Math.round(interviewRate / 10);

  // Derived data untuk Grafik Distribusi Pipeline SVG
  const visibleStages = STAGE_ORDER.filter((status) => {
    if (chartScope === 'active') return ACTIVE_SET.has(status);
    if (chartScope === 'closed') return CLOSED_SET.has(status);
    return true;
  });

  const chartSeries = visibleStages.map((status) => {
    const count = applications.filter((app) => app.status === status).length;
    const percentage =
      totalLamaran > 0 ? Math.round((count / totalLamaran) * 100) : 0;
    return { status, label: STATUS_LABELS[status], count, percentage };
  });

  const maxChartCount = Math.max(1, ...chartSeries.map((item) => item.count));
  const activeHoverItem =
    chartSeries.find((item) => item.status === hoveredStatus) ?? null;

  return (
    <section className="pg-metrics-hub" aria-label="Statistik dan grafik pipeline">
      <div className="pg-bento-metrics">
        {/* 1. Total Lamaran — Oversized Typographic Panel */}
        <article className="pg-metric-card pg-card-total">
          <div className="pg-metric-top">
            <span className="pg-metric-label">Total lamaran</span>
            <span className="pg-mini-pill">{aktifPipeline} aktif</span>
          </div>
          <strong className="pg-big-num">{totalLamaran}</strong>
          <p className="pg-metric-foot">Tercatat di war room Kapten</p>
        </article>

        {/* 2. Response Rate — Circular SVG Gauge */}
        <article className="pg-metric-card pg-card-response">
          <div className="pg-ring-layout">
            <div>
              <span className="pg-metric-label">Response rate</span>
              <strong className="pg-med-num">{responseRate}%</strong>
              <p className="pg-metric-foot">
                {respondedCount} dari {totalLamaran} diproses
              </p>
            </div>
            <svg
              className="pg-gauge-svg"
              viewBox="0 0 68 68"
              aria-hidden="true"
            >
              <circle className="pg-gauge-bg" cx="34" cy="34" r={ringRadius} />
              <circle
                className="pg-gauge-arc"
                cx="34"
                cy="34"
                r={ringRadius}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
          </div>
        </article>

        {/* 3. Interview Rate — Layered Segmented Bars */}
        <article className="pg-metric-card pg-card-interview">
          <div className="pg-metric-top">
            <span className="pg-metric-label">Interview rate</span>
            <strong className="pg-med-num">{interviewRate}%</strong>
          </div>
          <div
            className="pg-segment-bar"
            role="img"
            aria-label={`Interview rate ${interviewRate} persen`}
          >
            {Array.from({ length: 10 }).map((_, index) => (
              <span
                key={index}
                className={`pg-segment-unit ${
                  index < filledBlocks ? 'is-filled' : ''
                }`}
              />
            ))}
          </div>
          <p className="pg-metric-foot">{interviewCount} masuk tahap wawancara</p>
        </article>

        {/* 4. Rawan Ghosting — Irregular Coral Sticker Panel */}
        <article
          className={`pg-metric-card pg-card-ghosting ${
            ghostingCount > 0 ? 'has-warning' : ''
          }`}
        >
          <div className="pg-metric-top">
            <span className="pg-metric-label">Rawan ghosting</span>
            <span className="pg-tag-rotated">&gt;14 HARI</span>
          </div>
          <strong className="pg-big-num">{ghostingCount}</strong>
          <p className="pg-metric-foot">Applied/Screening tanpa kabar</p>
        </article>

        {/* 5. Offer Diterima — Lime Positive Badge Card */}
        <article
          className={`pg-metric-card pg-card-offer ${
            offerCount >= 2 ? 'is-ready' : ''
          }`}
        >
          <div className="pg-metric-top">
            <span className="pg-metric-label">Offer diterima</span>
            <span className="pg-mini-pill is-lime">
              {offerCount >= 2 ? 'Siap adu skor' : 'Target ≥ 2'}
            </span>
          </div>
          <strong className="pg-big-num">{offerCount}</strong>
          <p className="pg-metric-foot">
            {offerCount >= 2
              ? 'Bandingkan di Offer Comparator'
              : 'Kumpulkan minimal 2 offer'}
          </p>
        </article>
      </div>

      {/* Interactive SVG Pipeline Activity Distribution */}
      <div className="pg-chart-panel">
        <div className="pg-chart-head">
          <div>
            <h2 className="pg-chart-title">Distribusi Status Pipeline</h2>
            <p className="pg-chart-sub">
              {activeHoverItem
                ? `${activeHoverItem.label}: ${activeHoverItem.count} lamaran (${activeHoverItem.percentage}% dari total)`
                : 'Arahkan kursor atau fokus ke batang untuk detail jumlah tiap tahap.'}
            </p>
          </div>

          <div className="pg-scope-switch" role="group" aria-label="Filter grup status grafik">
            <button
              type="button"
              className={`pg-scope-btn ${chartScope === 'all' ? 'is-active' : ''}`}
              onClick={() => setChartScope('all')}
            >
              Semua Tahap
            </button>
            <button
              type="button"
              className={`pg-scope-btn ${chartScope === 'active' ? 'is-active' : ''}`}
              onClick={() => setChartScope('active')}
            >
              Aktif
            </button>
            <button
              type="button"
              className={`pg-scope-btn ${chartScope === 'closed' ? 'is-active' : ''}`}
              onClick={() => setChartScope('closed')}
            >
              Hasil Akhir
            </button>
          </div>
        </div>

        <div className="pg-svg-chart-wrap">
          <svg
            className="pg-svg-chart"
            viewBox={`0 0 ${Math.max(chartSeries.length * 108, 360)} 150`}
            role="img"
            aria-label="Grafik batang jumlah lamaran per status"
          >
            <line
              x1="12"
              y1="116"
              x2={Math.max(chartSeries.length * 108, 360) - 12}
              y2="116"
              className="pg-axis-line"
            />
            {chartSeries.map((item, idx) => {
              const slotWidth = 108;
              const barWidth = 54;
              const x = idx * slotWidth + 26;
              const barHeight =
                item.count === 0
                  ? 8
                  : Math.max(16, Math.round((item.count / maxChartCount) * 84));
              const y = 116 - barHeight;
              const isHovered = hoveredStatus === item.status;

              return (
                <g
                  key={item.status}
                  className={`pg-bar-group pg-bar-${item.status.toLowerCase()} ${
                    isHovered ? 'is-hovered' : ''
                  }`}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredStatus(item.status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  onFocus={() => setHoveredStatus(item.status)}
                  onBlur={() => setHoveredStatus(null)}
                >
                  <title>
                    {`${item.label}: ${item.count} lamaran (${item.percentage}%)`}
                  </title>
                  <rect
                    x={x + 4}
                    y={y + 4}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    className="pg-bar-shadow"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    className="pg-bar-rect"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    className="pg-bar-count"
                  >
                    {item.count}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y="136"
                    textAnchor="middle"
                    className="pg-bar-label"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Alternatif aksesibel non-warna untuk pengguna screen reader / colorblind */}
        <ul className="pg-chart-legend" aria-label="Ringkasan angka per status">
          {chartSeries.map((item) => (
            <li key={item.status} className="pg-legend-pill">
              <span className={`pg-legend-swatch st-dot-${item.status.toLowerCase()}`} />
              <span>{item.label}:</span>
              <strong>{item.count}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}