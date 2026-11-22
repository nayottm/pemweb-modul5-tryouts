import type { Application } from '../types';
import { isRawanGhosting } from '../utils/calculations';

interface StatsStripProps {
  applications: readonly Application[];
}

export function StatsStrip({ applications }: StatsStripProps) {
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

  return (
    <section className="hero-ledger" aria-label="Ringkasan statistik lamaran">
      <div className="ledger-cell">
        <span className="ledger-label">Total lamaran</span>
        <strong className="ledger-value">{totalLamaran}</strong>
        <span className="ledger-meta">{aktifPipeline} aktif di pipeline</span>
      </div>

      <div className="ledger-cell">
        <span className="ledger-label">Response rate</span>
        <strong className="ledger-value">{responseRate}%</strong>
        <span className="ledger-meta">
          {respondedCount} dari {totalLamaran} diproses
        </span>
      </div>

      <div className="ledger-cell">
        <span className="ledger-label">Interview rate</span>
        <strong className="ledger-value">{interviewRate}%</strong>
        <span className="ledger-meta">{interviewCount} masuk wawancara</span>
      </div>

      <div className={`ledger-cell ${ghostingCount > 0 ? 'is-alert' : ''}`}>
        <span className="ledger-label">Rawan ghosting</span>
        <strong className="ledger-value">{ghostingCount}</strong>
        <span className="ledger-meta">&gt; 14 hari tanpa kabar</span>
      </div>

      <div className={`ledger-cell ${offerCount >= 2 ? 'is-positive' : ''}`}>
        <span className="ledger-label">Offer diterima</span>
        <strong className="ledger-value">{offerCount}</strong>
        <span className="ledger-meta">
          {offerCount >= 2 ? 'Siap dibandingkan' : 'Butuh minimal 2 offer'}
        </span>
      </div>
    </section>
  );
}