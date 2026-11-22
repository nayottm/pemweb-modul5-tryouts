import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { Application, DataSource, JobListing } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { fetchJobs } from '../services/jobService';
import {
  calculateSkillMatch,
  getCompanyInitials,
  getMatchTier,
  isDuplicateApplication,
} from '../utils/calculations';
import { AlertIcon, CheckIcon, SearchIcon } from './Icons';

type JobSortOption = 'match-desc' | 'match-asc' | 'company-asc';

interface JobExplorerProps {
  kaptenSkills: readonly string[];
  applications: readonly Application[];
  dataSource: DataSource;
  onChangeDataSource: (source: DataSource) => void;
  onSaveToWishlist: (job: JobListing) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function JobExplorer({
  kaptenSkills,
  applications,
  dataSource,
  onChangeDataSource,
  onSaveToWishlist,
  searchInputRef,
}: JobExplorerProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<JobSortOption>('match-desc');

  const debouncedKeyword = useDebounce(keyword, 400);
  const isDebouncing = keyword !== debouncedKeyword;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadJobs = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await fetchJobs(dataSource, controller.signal);
        if (active) {
          setJobs(result);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (active) {
          const message =
            err instanceof Error
              ? err.message
              : 'Terjadi gangguan jaringan saat mengambil lowongan.';
          setErrorMessage(message);
          setJobs([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadJobs();

    return () => {
      active = false;
      controller.abort();
    };
  }, [dataSource, retryToken]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const job of jobs) {
      if (job.category) unique.add(job.category);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const enrichedJobs = useMemo(() => {
    const query = debouncedKeyword.trim().toLowerCase();

    return jobs
      .map((job) => ({
        job,
        match: calculateSkillMatch(job.tags, kaptenSkills),
        alreadyApplied: isDuplicateApplication(
          applications,
          job.company_name,
          job.title
        ),
      }))
      .filter(({ job }) => {
        const matchesCategory =
          selectedCategory === 'ALL' || job.category === selectedCategory;
        if (!matchesCategory) return false;

        if (!query) return true;
        return (
          job.title.toLowerCase().includes(query) ||
          job.company_name.toLowerCase().includes(query) ||
          job.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'match-desc') return b.match.score - a.match.score;
        if (sortBy === 'match-asc') return a.match.score - b.match.score;
        return a.job.company_name.localeCompare(b.job.company_name);
      });
  }, [jobs, kaptenSkills, applications, debouncedKeyword, selectedCategory, sortBy]);

  return (
    <section className="explorer-stage" aria-label="Daftar lowongan magang">
      <div className="toolbar-grid">
        <div className="search-field">
          <SearchIcon size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            className="text-input has-icon"
            placeholder="Cari posisi, perusahaan, atau skill..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Cari lowongan"
          />
          <span className="kbd-hint" title="Tekan / untuk fokus cepat">
            {isDebouncing ? '...' : '/'}
          </span>
        </div>

        <select
          className="select-input"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          aria-label="Filter kategori lowongan"
        >
          <option value="ALL">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          className="select-input"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as JobSortOption)}
          aria-label="Urutkan lowongan"
        >
          <option value="match-desc">Match Tertinggi</option>
          <option value="match-asc">Match Terendah</option>
          <option value="company-asc">Nama Perusahaan (A-Z)</option>
        </select>
      </div>

      <div className="stage-meta-row">
        <span>
          Menampilkan <strong>{enrichedJobs.length}</strong> dari {jobs.length} lowongan
          {debouncedKeyword.trim() ? ` untuk "${debouncedKeyword.trim()}"` : ''}
        </span>
        <span className="source-pill">
          Sumber: {dataSource === 'remotive' ? 'Remotive Live API' : 'Dataset Magang ID'}
        </span>
      </div>

      {isLoading ? (
        <div className="job-grid" aria-busy="true" aria-label="Memuat lowongan">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="job-sheet is-skeleton">
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-85 h-lg" />
              <div className="skeleton-tags">
                <span className="skeleton-pill" />
                <span className="skeleton-pill" />
                <span className="skeleton-pill" />
              </div>
              <div className="skeleton-line w-60" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="state-box is-error" role="alert">
          <AlertIcon size={24} />
          <h3>Koneksi ke sumber lowongan terputus</h3>
          <p>{errorMessage}</p>
          <div className="state-actions">
            <button
              type="button"
              className="btn-solid"
              onClick={() => setRetryToken((prev) => prev + 1)}
            >
              Coba Lagi
            </button>
            {dataSource === 'remotive' && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => onChangeDataSource('local')}
              >
                Gunakan Dataset Fallback Lokal
              </button>
            )}
          </div>
        </div>
      ) : enrichedJobs.length === 0 ? (
        <div className="state-box">
          <h3>Tidak ada lowongan yang cocok</h3>
          <p>
            Ubah kata kunci pencarian atau pilih kategori lain untuk melihat lowongan
            yang tersedia.
          </p>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setKeyword('');
              setSelectedCategory('ALL');
            }}
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="job-grid">
          {enrichedJobs.map(({ job, match, alreadyApplied }) => {
            const tier = getMatchTier(match.score);

            return (
              <article key={job.id} className="job-sheet">
                <div className="job-sheet-top">
                  <div className="company-cluster">
                    <span className="company-stamp" aria-hidden="true">
                      {getCompanyInitials(job.company_name)}
                    </span>
                    <div>
                      <p className="company-name">{job.company_name}</p>
                      <p className="company-loc">{job.candidate_required_location}</p>
                    </div>
                  </div>

                  <span className={`match-badge tier-${tier}`}>
                    {match.score}% Match
                  </span>
                </div>

                <h3 className="job-title">{job.title}</h3>

                <div
                  className="match-meter"
                  aria-label={`Tingkat kecocokan skill ${match.score} persen`}
                >
                  <div
                    className={`match-meter-fill tier-${tier}`}
                    style={{ width: `${match.score}%` }}
                  />
                </div>

                <div className="skill-tag-group">
                  {match.matched.map((skill) => (
                    <span key={`m-${skill}`} className="tag-matched">
                      {skill}
                    </span>
                  ))}
                  {match.missing.map((skill) => (
                    <span
                      key={`x-${skill}`}
                      className="tag-missing"
                      title="Belum ada di Profil Skill Kapten"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="job-sheet-footer">
                  <div className="salary-block">
                    <span className="salary-label">Estimasi kompensasi</span>
                    <strong className="salary-value">{job.salary}</strong>
                  </div>

                  <button
                    type="button"
                    className={alreadyApplied ? 'btn-disabled' : 'btn-primary'}
                    disabled={alreadyApplied}
                    onClick={() => onSaveToWishlist(job)}
                  >
                    {alreadyApplied ? (
                      <>
                        <CheckIcon size={14} />
                        <span>Sudah Dilamar</span>
                      </>
                    ) : (
                      <span>Simpan ke Wishlist</span>
                    )}
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