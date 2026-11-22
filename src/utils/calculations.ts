import type {
  Application,
  BackupPayload,
  InterviewConflict,
  OfferScoreBreakdown,
  SkillMatchResult,
  WorkMode,
} from '../types';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateApplication(
  applications: readonly Application[],
  company: string,
  role: string
): boolean {
  const targetCompany = normalizeText(company);
  const targetRole = normalizeText(role);

  return applications.some(
    (app) =>
      normalizeText(app.company) === targetCompany &&
      normalizeText(app.role) === targetRole
  );
}

export function calculateSkillMatch(
  requiredSkills: readonly string[],
  kaptenSkills: readonly string[]
): SkillMatchResult {
  const uniqueRequired: string[] = [];
  const seen = new Set<string>();

  for (const rawSkill of requiredSkills) {
    const trimmed = rawSkill.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      uniqueRequired.push(trimmed);
    }
  }

  if (uniqueRequired.length === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const kaptenSet = new Set(kaptenSkills.map((skill) => normalizeText(skill)));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of uniqueRequired) {
    if (kaptenSet.has(normalizeText(skill))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = Math.round((matched.length / uniqueRequired.length) * 100);
  return { score, matched, missing };
}

export function getMatchTier(score: number): 'high' | 'mid' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export function isRawanGhosting(
  application: Application,
  nowMs: number = Date.now()
): boolean {
  if (application.status !== 'APPLIED' && application.status !== 'SCREENING') {
    return false;
  }

  const updatedMs = new Date(application.lastUpdatedAt).getTime();
  if (Number.isNaN(updatedMs)) {
    return false;
  }

  return nowMs - updatedMs > FOURTEEN_DAYS_MS;
}

export function getDaysSinceUpdate(
  isoDate: string,
  nowMs: number = Date.now()
): number {
  const updatedMs = new Date(isoDate).getTime();
  if (Number.isNaN(updatedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - updatedMs) / (24 * 60 * 60 * 1000)));
}

export function findInterviewConflicts(
  applications: readonly Application[]
): InterviewConflict[] {
  const scheduled = applications.filter(
    (app): app is Application & { interviewDateTime: string } =>
      app.status === 'INTERVIEW' &&
      typeof app.interviewDateTime === 'string' &&
      app.interviewDateTime.trim().length > 0 &&
      !Number.isNaN(new Date(app.interviewDateTime).getTime())
  );

  const conflicts: InterviewConflict[] = [];

  for (let i = 0; i < scheduled.length; i += 1) {
    for (let j = i + 1; j < scheduled.length; j += 1) {
      const appA = scheduled[i];
      const appB = scheduled[j];
      const timeA = new Date(appA.interviewDateTime).getTime();
      const timeB = new Date(appB.interviewDateTime).getTime();
      const diffMs = Math.abs(timeA - timeB);

      if (diffMs < SIXTY_MINUTES_MS) {
        conflicts.push({
          id: `${appA.id}__${appB.id}`,
          appA,
          appB,
          diffMinutes: Math.round(diffMs / 60000),
        });
      }
    }
  }

  return conflicts;
}

export function getWorkModeScore(workMode: WorkMode): number {
  switch (workMode) {
    case 'Remote':
      return 100;
    case 'Hybrid':
      return 75;
    case 'Onsite':
      return 50;
  }
}

export function compareTwoOffers(
  offerA: Application,
  offerB: Application,
  kaptenSkills: readonly string[]
): { breakdownA: OfferScoreBreakdown; breakdownB: OfferScoreBreakdown } {
  const salaryA = offerA.salaryOffer ?? 0;
  const salaryB = offerB.salaryOffer ?? 0;
  const maxSalary = Math.max(salaryA, salaryB);

  const buildBreakdown = (app: Application): OfferScoreBreakdown => {
    const salaryOffer = app.salaryOffer ?? 0;
    const salaryNormalized = maxSalary > 0 ? (salaryOffer / maxSalary) * 100 : 0;
    const salaryPoints = salaryNormalized * 0.5;
    const workModeScore = getWorkModeScore(app.workMode);
    const workModePoints = workModeScore * 0.25;
    const match = calculateSkillMatch(app.requiredSkills, kaptenSkills);
    const skillPoints = match.score * 0.25;
    const totalScore = salaryPoints + workModePoints + skillPoints;

    return {
      application: app,
      salaryOffer,
      salaryNormalized,
      salaryPoints,
      workModeScore,
      workModePoints,
      skillMatch: match.score,
      matchedCount: match.matched.length,
      totalSkills: match.matched.length + match.missing.length,
      skillPoints,
      totalScore,
    };
  };

  return {
    breakdownA: buildBreakdown(offerA),
    breakdownB: buildBreakdown(offerB),
  };
}

export function inferWorkMode(location: string): WorkMode {
  const lower = location.toLowerCase();
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('onsite') || lower.includes('on-site')) return 'Onsite';
  return 'Remote';
}

export function getCompanyInitials(company: string): string {
  const parts = company
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (parts.length === 0) return 'AM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTimeShort(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateTimeFull(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidBackupPayload(raw: unknown): raw is BackupPayload {
  if (typeof raw !== 'object' || raw === null) return false;
  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.kaptenSkills) || !Array.isArray(candidate.applications)) {
    return false;
  }
  const skillsValid = candidate.kaptenSkills.every((item) => typeof item === 'string');
  const appsValid = candidate.applications.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const app = item as Record<string, unknown>;
    return (
      typeof app.id === 'string' &&
      typeof app.company === 'string' &&
      typeof app.role === 'string' &&
      typeof app.status === 'string' &&
      typeof app.workMode === 'string' &&
      Array.isArray(app.requiredSkills) &&
      Array.isArray(app.checklist) &&
      Array.isArray(app.activityLogs) &&
      typeof app.lastUpdatedAt === 'string'
    );
  });
  return skillsValid && appsValid;
}