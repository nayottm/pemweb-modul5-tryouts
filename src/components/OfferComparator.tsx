import { useState } from 'react';
import type { Application } from '../types';
import { compareTwoOffers, formatRupiah } from '../utils/calculations';
import { TrophyIcon } from './Icons';

interface OfferComparatorProps {
  applications: readonly Application[];
  kaptenSkills: readonly string[];
  onGoPipeline: () => void;
}

export function OfferComparator({
  applications,
  kaptenSkills,
  onGoPipeline,
}: OfferComparatorProps) {
  const offers = applications.filter((app) => app.status === 'OFFER');

  const [selectedAId, setSelectedAId] = useState<string>('');
  const [selectedBId, setSelectedBId] = useState<string>('');

  if (offers.length < 2) {
    return (
      <section className="state-box">
        <h3>Butuh minimal 2 Offer untuk dibandingkan</h3>
        <p>
          Saat ini Kapten memiliki <strong>{offers.length}</strong> lamaran berstatus
          Offer. Pindahkan minimal 2 lamaran hingga tahap Offer di Pipeline Lamaran
          untuk mengaktifkan Offer Comparator.
        </p>
        <button type="button" className="btn-primary" onClick={onGoPipeline}>
          Buka Pipeline Lamaran
        </button>
      </section>
    );
  }

  const offerA = offers.find((item) => item.id === selectedAId) ?? offers[0];
  const offerB =
    offers.find((item) => item.id === selectedBId && item.id !== offerA.id) ??
    offers.find((item) => item.id !== offerA.id) ??
    offers[1];

  const { breakdownA, breakdownB } = compareTwoOffers(
    offerA,
    offerB,
    kaptenSkills
  );

  const scoreDiff = breakdownA.totalScore - breakdownB.totalScore;
  const winner: 'A' | 'B' | 'TIE' =
    Math.abs(scoreDiff) < 0.05 ? 'TIE' : scoreDiff > 0 ? 'A' : 'B';

  const cards = [
    { key: 'A' as const, data: breakdownA, isWinner: winner === 'A' },
    { key: 'B' as const, data: breakdownB, isWinner: winner === 'B' },
  ];

  return (
    <section className="comparator-section" aria-label="Bandingkan offer magang">
      <div className="comparator-header">
        <div>
          <h2>Bandingkan Offer Magang</h2>
          <p className="panel-desc">
            Bobot penilaian: Uang Saku 50% • Mode Kerja 25% (Remote 100, Hybrid 75,
            Onsite 50) • Kecocokan Skill 25%
          </p>
        </div>

        <div className="comparator-selectors">
          <label className="selector-wrap">
            <span>Offer A</span>
            <select
              className="select-input"
              value={offerA.id}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedAId(nextId);
                if (nextId === offerB.id) {
                  setSelectedBId(offerA.id);
                }
              }}
            >
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.company} — {offer.role}
                </option>
              ))}
            </select>
          </label>

          <span className="vs-badge" aria-hidden="true">
            vs
          </span>

          <label className="selector-wrap">
            <span>Offer B</span>
            <select
              className="select-input"
              value={offerB.id}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedBId(nextId);
                if (nextId === offerA.id) {
                  setSelectedAId(offerB.id);
                }
              }}
            >
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.company} — {offer.role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="comparator-grid">
        {cards.map(({ key, data, isWinner }) => (
          <article
            key={key}
            className={`offer-sheet ${isWinner ? 'is-recommended' : ''}`}
          >
            <div className="offer-sheet-head">
              <div>
                <h3>{data.application.company}</h3>
                <p className="offer-role">{data.application.role}</p>
              </div>
              {isWinner && (
                <span className="winner-seal">
                  <TrophyIcon size={14} />
                  <span>Rekomendasi Terbaik</span>
                </span>
              )}
              {winner === 'TIE' && (
                <span className="tie-seal">Skor Seimbang</span>
              )}
            </div>

            <div className="metric-breakdown">
              <div className="metric-row">
                <div className="metric-top">
                  <span className="metric-name">Uang Saku / Bulan</span>
                  <strong className="metric-val">
                    {formatRupiah(data.salaryOffer)}
                  </strong>
                  <span className="metric-pts">
                    {data.salaryPoints.toFixed(1)} / 50
                  </span>
                </div>
                <div className="metric-bar-track">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${data.salaryNormalized}%` }}
                  />
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-top">
                  <span className="metric-name">Mode Kerja</span>
                  <strong className="metric-val">
                    {data.application.workMode} ({data.workModeScore})
                  </strong>
                  <span className="metric-pts">
                    {data.workModePoints.toFixed(1)} / 25
                  </span>
                </div>
                <div className="metric-bar-track">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${data.workModeScore}%` }}
                  />
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-top">
                  <span className="metric-name">Kecocokan Skill</span>
                  <strong className="metric-val">
                    {data.skillMatch}% ({data.matchedCount} dari {data.totalSkills}{' '}
                    skill)
                  </strong>
                  <span className="metric-pts">
                    {data.skillPoints.toFixed(1)} / 25
                  </span>
                </div>
                <div className="metric-bar-track">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${data.skillMatch}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="offer-total-box">
              <span>Total Skor Berbobot</span>
              <strong>{data.totalScore.toFixed(1)}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}