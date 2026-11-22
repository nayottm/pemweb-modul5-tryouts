import { useRef, useState } from 'react';
import type { Application, WorkMode } from '../types';
import { isDuplicateApplication } from '../utils/calculations';
import { CloseIcon } from './Icons';

export interface ManualApplicationInput {
  company: string;
  role: string;
  workMode: WorkMode;
  status: 'WISHLIST' | 'APPLIED';
  requiredSkills: string[];
  cvVersion?: string;
  appliedDate?: string;
}

interface ManualApplicationModalProps {
  applications: readonly Application[];
  onClose: () => void;
  onSubmit: (data: ManualApplicationInput) => void;
}

interface FormErrors {
  company?: string;
  role?: string;
  skills?: string;
  cvVersion?: string;
  appliedDate?: string;
}

export function ManualApplicationModal({
  applications,
  onClose,
  onSubmit,
}: ManualApplicationModalProps) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>('Remote');
  const [status, setStatus] = useState<'WISHLIST' | 'APPLIED'>('WISHLIST');
  const [skillsText, setSkillsText] = useState('');
  const [cvVersion, setCvVersion] = useState('');
  const [appliedDate, setAppliedDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const companyRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef<HTMLInputElement | null>(null);
  const skillsRef = useRef<HTMLInputElement | null>(null);
  const cvVersionRef = useRef<HTMLInputElement | null>(null);
  const appliedDateRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const trimmedCompany = company.trim();
    const trimmedRole = role.trim();
    const parsedSkills = skillsText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (!trimmedCompany) {
      nextErrors.company = 'Nama perusahaan wajib diisi.';
    }
    if (!trimmedRole) {
      nextErrors.role = 'Posisi / role magang wajib diisi.';
    }
    if (
      trimmedCompany &&
      trimmedRole &&
      isDuplicateApplication(applications, trimmedCompany, trimmedRole)
    ) {
      nextErrors.company =
        'Lamaran untuk perusahaan dan posisi yang sama sudah tercatat.';
    }
    if (parsedSkills.length === 0) {
      nextErrors.skills =
        'Masukkan minimal 1 required skill (pisahkan dengan koma).';
    }
    if (status === 'APPLIED') {
      if (!cvVersion.trim()) {
        nextErrors.cvVersion = 'Versi CV wajib diisi untuk status Applied.';
      }
      if (!appliedDate.trim()) {
        nextErrors.appliedDate = 'Tanggal melamar wajib diisi untuk status Applied.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.company) {
        companyRef.current?.focus();
      } else if (nextErrors.role) {
        roleRef.current?.focus();
      } else if (nextErrors.skills) {
        skillsRef.current?.focus();
      } else if (nextErrors.cvVersion) {
        cvVersionRef.current?.focus();
      } else if (nextErrors.appliedDate) {
        appliedDateRef.current?.focus();
      }
      return;
    }

    onSubmit({
      company: trimmedCompany,
      role: trimmedRole,
      workMode,
      status,
      requiredSkills: parsedSkills,
      cvVersion: status === 'APPLIED' ? cvVersion.trim() : undefined,
      appliedDate: status === 'APPLIED' ? appliedDate.trim() : undefined,
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-form-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-sheet modal-compact">
        <div className="modal-header">
          <div>
            <h2 id="manual-form-title">Catat Lamaran Manual</h2>
            <p className="modal-sub">
              Simpan target magang di luar katalog langsung ke pipeline Kapten.
            </p>
          </div>
          <button
            type="button"
            className="icon-tool-btn"
            onClick={onClose}
            aria-label="Tutup form"
          >
            <CloseIcon />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="manual-company">Nama Perusahaan</label>
            <input
              id="manual-company"
              ref={companyRef}
              type="text"
              className={`text-input ${errors.company ? 'has-error' : ''}`}
              placeholder="Contoh: Garuda FinTech"
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                if (errors.company) setErrors((prev) => ({ ...prev, company: undefined }));
              }}
            />
            {errors.company && <span className="field-error">{errors.company}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="manual-role">Posisi / Role</label>
            <input
              id="manual-role"
              ref={roleRef}
              type="text"
              className={`text-input ${errors.role ? 'has-error' : ''}`}
              placeholder="Contoh: Frontend Engineering Intern"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
              }}
            />
            {errors.role && <span className="field-error">{errors.role}</span>}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="manual-mode">Mode Kerja</label>
              <select
                id="manual-mode"
                className="select-input"
                value={workMode}
                onChange={(event) => setWorkMode(event.target.value as WorkMode)}
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">Onsite</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="manual-status">Status Awal</label>
              <select
                id="manual-status"
                className="select-input"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'WISHLIST' | 'APPLIED')
                }
              >
                <option value="WISHLIST">Wishlist</option>
                <option value="APPLIED">Applied</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="manual-skills">Required Skills (pisahkan koma)</label>
            <input
              id="manual-skills"
              ref={skillsRef}
              type="text"
              className={`text-input ${errors.skills ? 'has-error' : ''}`}
              placeholder="React, TypeScript, CSS, Docker"
              value={skillsText}
              onChange={(event) => {
                setSkillsText(event.target.value);
                if (errors.skills) setErrors((prev) => ({ ...prev, skills: undefined }));
              }}
            />
            {errors.skills && <span className="field-error">{errors.skills}</span>}
          </div>

          {status === 'APPLIED' && (
            <div className="conditional-box">
              <p className="conditional-title">Detail pengiriman berkas (wajib untuk Applied)</p>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="manual-cv">Versi CV</label>
                  <input
                    id="manual-cv"
                    ref={cvVersionRef}
                    type="text"
                    className={`text-input ${errors.cvVersion ? 'has-error' : ''}`}
                    placeholder="Kapten-CV-v2.pdf"
                    value={cvVersion}
                    onChange={(event) => {
                      setCvVersion(event.target.value);
                      if (errors.cvVersion) {
                        setErrors((prev) => ({ ...prev, cvVersion: undefined }));
                      }
                    }}
                  />
                  {errors.cvVersion && (
                    <span className="field-error">{errors.cvVersion}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="manual-date">Tanggal Melamar</label>
                  <input
                    id="manual-date"
                    ref={appliedDateRef}
                    type="date"
                    className={`text-input ${errors.appliedDate ? 'has-error' : ''}`}
                    value={appliedDate}
                    onChange={(event) => {
                      setAppliedDate(event.target.value);
                      if (errors.appliedDate) {
                        setErrors((prev) => ({ ...prev, appliedDate: undefined }));
                      }
                    }}
                  />
                  {errors.appliedDate && (
                    <span className="field-error">{errors.appliedDate}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Lamaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}