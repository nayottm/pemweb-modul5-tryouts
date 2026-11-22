import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActiveTab,
  Application,
  ApplicationStatus,
  BackupPayload,
  DataSource,
  JobListing,
  PendingUndo,
  ThemeMode,
  TransitionPayload,
} from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  createId,
  findInterviewConflicts,
  formatDateTimeShort,
  formatRupiah,
  inferWorkMode,
  isDuplicateApplication,
  isValidBackupPayload,
} from './utils/calculations';
import { canTransitionStatus, STATUS_LABELS } from './utils/stateMachine';
import { Navbar } from './components/Navbar';
import { ConflictBanner } from './components/ConflictBanner';
import { PlaygroundHero } from './components/PlaygroundHero';
import { StatsStrip } from './components/StatsStrip';
import { SkillProfile } from './components/SkillProfile';
import { JobExplorer } from './components/JobExplorer';
import {
  ManualApplicationModal,
  type ManualApplicationInput,
} from './components/ManualApplicationModal';
import { PipelineWarRoom } from './components/PipelineWarRoom';
import { ApplicationDetailModal } from './components/ApplicationDetailModal';
import { OfferComparator } from './components/OfferComparator';
import { UndoToast } from './components/UndoToast';

const DEFAULT_SKILLS: string[] = ['React', 'TypeScript', 'CSS'];
const UNDO_WINDOW_MS = 5000;

export default function App() {
  const [kaptenSkills, setKaptenSkills] = useLocalStorage<string[]>(
    'amm_kapten_skills',
    DEFAULT_SKILLS
  );
  const [applications, setApplications] = useLocalStorage<Application[]>(
    'amm_applications',
    []
  );
  const [theme, setTheme] = useLocalStorage<ThemeMode>('amm_theme', 'light');

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [dataSource, setDataSource] = useState<DataSource>('remotive');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(5);

  const undoTimeoutRef = useRef<number | null>(null);
  const undoIntervalRef = useRef<number | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const exploreSearchRef = useRef<HTMLInputElement | null>(null);
  const pipelineSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTypingField || isManualModalOpen || selectedAppId !== null) return;

      event.preventDefault();
      if (activeTab === 'explore') {
        exploreSearchRef.current?.focus();
      } else if (activeTab === 'pipeline') {
        pipelineSearchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isManualModalOpen, selectedAppId]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current !== null) {
        window.clearTimeout(undoTimeoutRef.current);
      }
      if (undoIntervalRef.current !== null) {
        window.clearInterval(undoIntervalRef.current);
      }
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    setNoticeMessage(message);
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNoticeMessage(null);
      noticeTimeoutRef.current = null;
    }, 3500);
  }, []);

  const clearUndoTimers = useCallback(() => {
    if (undoTimeoutRef.current !== null) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    if (undoIntervalRef.current !== null) {
      window.clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }
  }, []);

  const interviewConflicts = useMemo(
    () => findInterviewConflicts(applications),
    [applications]
  );

  const totalOffers = useMemo(
    () => applications.filter((app) => app.status === 'OFFER').length,
    [applications]
  );

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === selectedAppId) ?? null,
    [applications, selectedAppId]
  );

  const handleAddSkill = (skill: string) => {
    setKaptenSkills((prev) => [...prev, skill]);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setKaptenSkills((prev) => prev.filter((item) => item !== skillToRemove));
  };

  const handleSaveFromCatalog = (job: JobListing) => {
    if (isDuplicateApplication(applications, job.company_name, job.title)) {
      showNotice('Lowongan ini sudah tercatat di pipeline lamaran.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newApplication: Application = {
      id: createId(),
      company: job.company_name,
      role: job.title,
      workMode: inferWorkMode(job.candidate_required_location),
      status: 'WISHLIST',
      requiredSkills: [...job.tags],
      lastUpdatedAt: nowIso,
      checklist: [],
      activityLogs: [
        {
          id: createId(),
          timestamp: nowIso,
          message: 'Disimpan ke Wishlist dari Eksplorasi Lowongan.',
        },
      ],
    };

    setApplications((prev) => [newApplication, ...prev]);
    showNotice(`${job.company_name} ditambahkan ke Wishlist.`);
  };

  const handleCreateManualApplication = (input: ManualApplicationInput) => {
    const nowIso = new Date().toISOString();
    const initialMessage =
      input.status === 'APPLIED'
        ? `Lamaran dicatat sebagai Applied (CV: ${input.cvVersion ?? '-'}, tanggal ${input.appliedDate ?? '-'}).`
        : 'Lamaran dicatat secara manual ke Wishlist.';

    const newApplication: Application = {
      id: createId(),
      company: input.company,
      role: input.role,
      workMode: input.workMode,
      status: input.status,
      requiredSkills: input.requiredSkills,
      cvVersion: input.cvVersion,
      appliedDate: input.appliedDate,
      lastUpdatedAt: nowIso,
      checklist: [],
      activityLogs: [
        {
          id: createId(),
          timestamp: nowIso,
          message: initialMessage,
        },
      ],
    };

    setApplications((prev) => [newApplication, ...prev]);
    setIsManualModalOpen(false);
    setActiveTab('pipeline');
    showNotice(`Lamaran ${input.company} berhasil disimpan.`);
  };

  const handleTransitionStatus = (
    appId: string,
    targetStatus: ApplicationStatus,
    payload?: TransitionPayload
  ) => {
    const nowIso = new Date().toISOString();

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        if (!canTransitionStatus(app.status, targetStatus)) return app;

        let logMessage = `Status berpindah dari ${STATUS_LABELS[app.status]} ke ${STATUS_LABELS[targetStatus]}.`;

        if (targetStatus === 'APPLIED' && payload?.cvVersion) {
          logMessage = `Lamaran dikirim (CV: ${payload.cvVersion}, tanggal ${payload.appliedDate ?? '-'}).`;
        } else if (targetStatus === 'INTERVIEW' && payload?.interviewDateTime) {
          logMessage = `Pindah ke Interview (jadwal ${formatDateTimeShort(payload.interviewDateTime)}).`;
        } else if (targetStatus === 'OFFER' && payload?.salaryOffer) {
          logMessage = `Offer diterima: ${formatRupiah(payload.salaryOffer)} (${payload.workMode ?? app.workMode}).`;
        } else if (app.status === 'GHOSTED' && targetStatus === 'SCREENING') {
          logMessage = 'HR kembali menghubungi — status dipulihkan dari Ghosted ke Screening.';
        }

        return {
          ...app,
          status: targetStatus,
          cvVersion: payload?.cvVersion ?? app.cvVersion,
          appliedDate: payload?.appliedDate ?? app.appliedDate,
          interviewDateTime:
            payload?.interviewDateTime ?? app.interviewDateTime,
          salaryOffer: payload?.salaryOffer ?? app.salaryOffer,
          workMode: payload?.workMode ?? app.workMode,
          lastUpdatedAt: nowIso,
          activityLogs: [
            {
              id: createId(),
              timestamp: nowIso,
              message: logMessage,
            },
            ...app.activityLogs,
          ],
        };
      })
    );
  };

  const handleAddChecklistItem = (appId: string, text: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              checklist: [
                ...app.checklist,
                { id: createId(), text, done: false },
              ],
            }
          : app
      )
    );
  };

  const handleToggleChecklistItem = (appId: string, itemId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              checklist: app.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
              ),
            }
          : app
      )
    );
  };

  const handleDeleteChecklistItem = (appId: string, itemId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              checklist: app.checklist.filter((item) => item.id !== itemId),
            }
          : app
      )
    );
  };

  const handleAddManualNote = (appId: string, note: string) => {
    const nowIso = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? {
              ...app,
              activityLogs: [
                {
                  id: createId(),
                  timestamp: nowIso,
                  message: `Catatan: ${note}`,
                },
                ...app.activityLogs,
              ],
            }
          : app
      )
    );
  };

  const handleSimulateGhosting = (appId: string) => {
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

    setApplications((prev) =>
      prev.map((app) => {
        if (
          app.id !== appId ||
          (app.status !== 'APPLIED' && app.status !== 'SCREENING')
        ) {
          return app;
        }
        const currentMs = new Date(app.lastUpdatedAt).getTime();
        const baseMs = Number.isNaN(currentMs) ? Date.now() : currentMs;
        const shiftedIso = new Date(baseMs - fifteenDaysMs).toISOString();

        return {
          ...app,
          lastUpdatedAt: shiftedIso,
          activityLogs: [
            {
              id: createId(),
              timestamp: new Date().toISOString(),
              message: 'Simulasi demo: lastUpdatedAt dimundurkan 15 hari.',
            },
            ...app.activityLogs,
          ],
        };
      })
    );
  };

  const handleDeleteApplication = (appId: string) => {
    const targetIndex = applications.findIndex((app) => app.id === appId);
    if (targetIndex === -1) return;

    const targetApp = applications[targetIndex];
    setApplications((prev) => prev.filter((app) => app.id !== appId));
    if (selectedAppId === appId) {
      setSelectedAppId(null);
    }

    clearUndoTimers();
    setPendingUndo({ application: targetApp, originalIndex: targetIndex });
    setUndoSecondsLeft(5);

    undoIntervalRef.current = window.setInterval(() => {
      setUndoSecondsLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    undoTimeoutRef.current = window.setTimeout(() => {
      clearUndoTimers();
      setPendingUndo(null);
    }, UNDO_WINDOW_MS);
  };

  const handleUndoDelete = () => {
    if (!pendingUndo) return;
    clearUndoTimers();

    const { application, originalIndex } = pendingUndo;
    setApplications((prev) => {
      if (prev.some((item) => item.id === application.id)) return prev;
      const next = [...prev];
      const insertAt = Math.min(Math.max(0, originalIndex), next.length);
      next.splice(insertAt, 0, application);
      return next;
    });

    setPendingUndo(null);
    showNotice(`Lamaran ${application.company} dipulihkan.`);
  };

  const handleDismissUndo = () => {
    clearUndoTimers();
    setPendingUndo(null);
  };

  const handleExportBackup = () => {
    const payload: BackupPayload = {
      exportedAt: new Date().toISOString(),
      kaptenSkills,
      applications,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aku-mw-magang-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Backup JSON berhasil diunduh.');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isValidBackupPayload(parsed)) {
          showNotice('File JSON tidak sesuai struktur backup Aku Mw Magang.');
          return;
        }
        setKaptenSkills(parsed.kaptenSkills);
        setApplications(parsed.applications);
        showNotice(`Impor berhasil: ${parsed.applications.length} lamaran dipulihkan.`);
      } catch {
        showNotice('Gagal membaca file JSON. Pastikan format file valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app-shell">
      <div className="canvas-grain" aria-hidden="true" />

      <Navbar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        totalApplications={applications.length}
        totalOffers={totalOffers}
        onOpenManualModal={() => setIsManualModalOpen(true)}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
        }
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <main className="main-container">
        <ConflictBanner
          conflicts={interviewConflicts}
          onInspectApplication={(id) => {
            setActiveTab('pipeline');
            setSelectedAppId(id);
          }}
        />

        <PlaygroundHero
          applications={applications}
          kaptenSkills={kaptenSkills}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenManualModal={() => setIsManualModalOpen(true)}
        />

        <StatsStrip applications={applications} />

        {activeTab === 'explore' && (
          <div className="workspace-split">
            <SkillProfile
              skills={kaptenSkills}
              onAddSkill={handleAddSkill}
              onRemoveSkill={handleRemoveSkill}
              dataSource={dataSource}
              onChangeDataSource={setDataSource}
            />
            <JobExplorer
              kaptenSkills={kaptenSkills}
              applications={applications}
              dataSource={dataSource}
              onChangeDataSource={setDataSource}
              onSaveToWishlist={handleSaveFromCatalog}
              searchInputRef={exploreSearchRef}
            />
          </div>
        )}

        {activeTab === 'pipeline' && (
          <PipelineWarRoom
            applications={applications}
            kaptenSkills={kaptenSkills}
            onOpenDetail={(id) => setSelectedAppId(id)}
            onSimulateGhosting={handleSimulateGhosting}
            onDeleteApplication={handleDeleteApplication}
            onGoExplore={() => setActiveTab('explore')}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            searchInputRef={pipelineSearchRef}
          />
        )}

        {activeTab === 'comparator' && (
          <OfferComparator
            applications={applications}
            kaptenSkills={kaptenSkills}
            onGoPipeline={() => setActiveTab('pipeline')}
          />
        )}
      </main>

      {isManualModalOpen && (
        <ManualApplicationModal
          applications={applications}
          onClose={() => setIsManualModalOpen(false)}
          onSubmit={handleCreateManualApplication}
        />
      )}

      {selectedApplication && (
        <ApplicationDetailModal
          key={selectedApplication.id}
          application={selectedApplication}
          kaptenSkills={kaptenSkills}
          onClose={() => setSelectedAppId(null)}
          onTransitionStatus={handleTransitionStatus}
          onAddChecklistItem={handleAddChecklistItem}
          onToggleChecklistItem={handleToggleChecklistItem}
          onDeleteChecklistItem={handleDeleteChecklistItem}
          onAddManualNote={handleAddManualNote}
          onSimulateGhosting={handleSimulateGhosting}
          onDeleteApplication={handleDeleteApplication}
        />
      )}

      {pendingUndo && (
        <UndoToast
          companyName={pendingUndo.application.company}
          secondsRemaining={undoSecondsLeft}
          onUndo={handleUndoDelete}
          onDismiss={handleDismissUndo}
        />
      )}

      {noticeMessage && !pendingUndo && (
        <div className="notice-toast" role="status" aria-live="polite">
          {noticeMessage}
        </div>
      )}
    </div>
  );
}