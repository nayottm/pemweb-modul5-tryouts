export type WorkMode = 'Remote' | 'Hybrid' | 'Onsite';

export type ApplicationStatus =
  | 'WISHLIST'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'GHOSTED';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  workMode: WorkMode;
  status: ApplicationStatus;
  requiredSkills: string[];
  cvVersion?: string;
  appliedDate?: string;
  interviewDateTime?: string;
  salaryOffer?: number;
  lastUpdatedAt: string;
  checklist: ChecklistItem[];
  activityLogs: ActivityLog[];
}

export interface JobListing {
  id: number;
  title: string;
  company_name: string;
  category: string;
  candidate_required_location: string;
  salary: string;
  tags: string[];
  url?: string;
}

export type DataSource = 'remotive' | 'local';
export type ActiveTab = 'explore' | 'pipeline' | 'comparator';
export type ThemeMode = 'light' | 'dark';

export interface SkillMatchResult {
  score: number;
  matched: string[];
  missing: string[];
}

export interface InterviewConflict {
  id: string;
  appA: Application;
  appB: Application;
  diffMinutes: number;
}

export interface OfferScoreBreakdown {
  application: Application;
  salaryOffer: number;
  salaryNormalized: number;
  salaryPoints: number;
  workModeScore: number;
  workModePoints: number;
  skillMatch: number;
  matchedCount: number;
  totalSkills: number;
  skillPoints: number;
  totalScore: number;
}

export interface TransitionPayload {
  cvVersion?: string;
  appliedDate?: string;
  interviewDateTime?: string;
  salaryOffer?: number;
  workMode?: WorkMode;
}

export interface PendingUndo {
  application: Application;
  originalIndex: number;
}

export interface BackupPayload {
  exportedAt: string;
  kaptenSkills: string[];
  applications: Application[];
}