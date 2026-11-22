import type { DataSource, JobListing } from '../types';

const REMOTIVE_API_URL =
  'https://remotive.com/api/remote-jobs?category=software-dev&limit=30';
const LOCAL_FALLBACK_URL = '/magang-fallback.json';

interface RawJobsResponse {
  jobs?: unknown;
}

function isJobListing(item: unknown): item is JobListing {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as Record<string, unknown>;

  return (
    typeof record.id === 'number' &&
    typeof record.title === 'string' &&
    typeof record.company_name === 'string' &&
    typeof record.category === 'string'
  );
}

function normalizeJobListing(item: unknown): JobListing | null {
  if (!isJobListing(item)) return null;
  const record = item as unknown as Record<string, unknown>;

  const rawTags = Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : [];

  return {
    id: item.id,
    title: item.title,
    company_name: item.company_name,
    category: item.category || 'Software Development',
    candidate_required_location:
      typeof record.candidate_required_location === 'string' &&
      record.candidate_required_location.trim().length > 0
        ? record.candidate_required_location
        : 'Remote',
    salary:
      typeof record.salary === 'string' && record.salary.trim().length > 0
        ? record.salary
        : 'Kompetitif / Tidak dicantumkan',
    tags: rawTags.length > 0 ? rawTags : ['Software Development'],
    url: typeof record.url === 'string' ? record.url : undefined,
  };
}

export async function fetchJobs(
  source: DataSource,
  signal: AbortSignal
): Promise<JobListing[]> {
  const endpoint = source === 'remotive' ? REMOTIVE_API_URL : LOCAL_FALLBACK_URL;

  const response = await fetch(endpoint, { signal });
  if (!response.ok) {
    throw new Error(`Gagal memuat data lowongan (HTTP ${response.status}).`);
  }

  const data: unknown = await response.json();
  const payload = data as RawJobsResponse;

  if (!Array.isArray(payload.jobs)) {
    throw new Error('Format dataset lowongan tidak sesuai ekspektasi.');
  }

  return payload.jobs
    .map(normalizeJobListing)
    .filter((job): job is JobListing => job !== null);
}