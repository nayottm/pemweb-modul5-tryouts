import { useState } from 'react';
import type { DataSource } from '../types';
import { normalizeText } from '../utils/calculations';
import { CloseIcon } from './Icons';

interface SkillProfileProps {
  skills: readonly string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  dataSource: DataSource;
  onChangeDataSource: (source: DataSource) => void;
}

export function SkillProfile({
  skills,
  onAddSkill,
  onRemoveSkill,
  dataSource,
  onChangeDataSource,
}: SkillProfileProps) {
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = skillInput.trim();

    if (!trimmed) {
      setError('Masukkan nama skill terlebih dahulu.');
      return;
    }

    const exists = skills.some(
      (item) => normalizeText(item) === normalizeText(trimmed)
    );
    if (exists) {
      setError(`Skill "${trimmed}" sudah ada di profil Kapten.`);
      return;
    }

    onAddSkill(trimmed);
    setSkillInput('');
    setError('');
  };

  return (
    <aside className="sidebar-panel" aria-label="Profil skill dan sumber data">
      <div className="panel-block">
        <div className="panel-head">
          <h2>Profil Skill Kapten</h2>
          <span className="mono-badge">{skills.length} skill</span>
        </div>
        <p className="panel-desc">
          Menghitung persentase kecocokan setiap lowongan secara langsung.
        </p>

        <form className="skill-form" onSubmit={handleSubmit} noValidate>
          <input
            type="text"
            className="text-input"
            placeholder="Tambah skill (mis. Docker)..."
            value={skillInput}
            onChange={(event) => {
              setSkillInput(event.target.value);
              if (error) setError('');
            }}
            aria-label="Tambah skill baru"
          />
          <button type="submit" className="btn-solid">
            Tambah
          </button>
        </form>

        {error && <p className="field-error">{error}</p>}

        <ul className="skill-chip-list">
          {skills.map((skill) => (
            <li key={skill} className="skill-chip">
              <span>{skill}</span>
              <button
                type="button"
                className="chip-remove"
                onClick={() => onRemoveSkill(skill)}
                aria-label={`Hapus skill ${skill}`}
              >
                <CloseIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-divider" />

      <div className="panel-block">
        <h3>Sumber Data Lowongan</h3>
        <div className="radio-stack" role="radiogroup" aria-label="Pilih sumber data lowongan">
          <label className={`source-option ${dataSource === 'remotive' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="job-source"
              checked={dataSource === 'remotive'}
              onChange={() => onChangeDataSource('remotive')}
            />
            <div>
              <strong>Remotive API (Live)</strong>
              <span>Remote software jobs global</span>
            </div>
          </label>

          <label className={`source-option ${dataSource === 'local' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="job-source"
              checked={dataSource === 'local'}
              onChange={() => onChangeDataSource('local')}
            />
            <div>
              <strong>Dataset Magang ID (Lokal)</strong>
              <span>15 lowongan tech Indonesia</span>
            </div>
          </label>
        </div>
      </div>
    </aside>
  );
}