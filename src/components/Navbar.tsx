import { useRef } from 'react';
import type { ActiveTab, ThemeMode } from '../types';
import { DownloadIcon, MoonIcon, PlusIcon, SunIcon, UploadIcon } from './Icons';

interface NavbarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  totalApplications: number;
  totalOffers: number;
  onOpenManualModal: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export function Navbar({
  activeTab,
  onChangeTab,
  totalApplications,
  totalOffers,
  onOpenManualModal,
  theme,
  onToggleTheme,
  onExportBackup,
  onImportBackup,
}: NavbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportBackup(file);
      event.target.value = '';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-monogram" aria-hidden="true">AM</span>
          <div className="brand-copy">
            <span className="brand-title">Aku Mw Magang</span>
            <span className="brand-sub">War Room Lamaran Kapten</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Navigasi utama">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'explore' ? 'is-active' : ''}`}
            onClick={() => onChangeTab('explore')}
          >
            Eksplorasi Lowongan
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'pipeline' ? 'is-active' : ''}`}
            onClick={() => onChangeTab('pipeline')}
          >
            Pipeline Lamaran
            <span className="nav-count">{totalApplications}</span>
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'comparator' ? 'is-active' : ''}`}
            onClick={() => onChangeTab('comparator')}
          >
            Bandingkan Offer
            <span className="nav-count">{totalOffers}</span>
          </button>
        </nav>

        <div className="topbar-actions">
          <button
            type="button"
            className="icon-tool-btn"
            onClick={onExportBackup}
            title="Ekspor backup JSON"
            aria-label="Ekspor backup JSON"
          >
            <DownloadIcon />
          </button>
          <button
            type="button"
            className="icon-tool-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Impor backup JSON"
            aria-label="Impor backup JSON"
          >
            <UploadIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            className="icon-tool-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
            aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>

          <button type="button" className="btn-primary btn-chamfer" onClick={onOpenManualModal}>
            <PlusIcon size={15} />
            <span>Catat Lamaran</span>
          </button>
        </div>
      </div>
    </header>
  );
}