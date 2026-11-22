import type { ApplicationStatus } from '../types';

export const ALLOWED_TRANSITIONS: Readonly<Record<ApplicationStatus, readonly ApplicationStatus[]>> = {
  WISHLIST: ['APPLIED'],
  APPLIED: ['SCREENING', 'REJECTED', 'GHOSTED'],
  SCREENING: ['INTERVIEW', 'REJECTED', 'GHOSTED'],
  INTERVIEW: ['OFFER', 'REJECTED', 'GHOSTED'],
  GHOSTED: ['SCREENING'],
  OFFER: [],
  REJECTED: [],
};

export const STATUS_LABELS: Readonly<Record<ApplicationStatus, string>> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  GHOSTED: 'Ghosted',
};

export const PIPELINE_STAGES: readonly ApplicationStatus[] = [
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
];

export function getAllowedNextStatuses(current: ApplicationStatus): readonly ApplicationStatus[] {
  return ALLOWED_TRANSITIONS[current];
}

export function canTransitionStatus(
  from: ApplicationStatus,
  to: ApplicationStatus
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function getStageIndex(status: ApplicationStatus): number {
  return PIPELINE_STAGES.indexOf(status);
}