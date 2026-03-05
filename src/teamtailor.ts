import https from 'https';
import { URL } from 'url';

export interface Candidate {
  id: string;
  type: 'candidates';
  attributes: {
    createdAt?: string; // date
    updatedAt?: string; // date
    email?: string;
    connected?: boolean;
    'consent-future-jobs-at'?: string; // date, read only
    'consent-given-future-jobs'?: boolean; // write only
    'facebook-id'?: string;
    'facebook-profile'?: string; // read only, html version
    'first-name'?: string;
    internal?: boolean;
    'last-name'?: string;
    'linkedin-profile'?: string; // read only, html version
    'linkedin-uid'?: string;
    'linkedin-url'?: string;
    merge?: boolean; // write only
    'original-resume'?: string; // read only, signed URL
    phone?: string;
    picture?: string;
    pitch?: string;
    'referring-site'?: string; // read only
    'referring-url'?: string;
    referred: boolean; // read only
    resume?: string;
    sourced?: boolean;
    'setConsent-expiration'?: boolean; // write only
    tags?: string[];
    unsubscribed?: boolean;
    'send-welcome-message'?: boolean; // create only
  };
}

export interface ListCandidatesParams {
  page?: number;
  perPage?: number;
  filter?: {
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }
}

export interface Job {
  id: string;
  type: 'jobs';
  links?: Record<string, string>;
  attributes: {
    title?: string;
    pitch?: string;
    body?: string;
    'apply-button-text'?: string;
    'created-at'?: string;
    'end-date'?: string | null;
    'human-status'?: string;
    internal?: boolean;
    picture?: unknown;
    pinned?: boolean;
    'start-date'?: string | null;
    status?: string;
    tags?: string[];
    'external-application-url'?: string | null;
    'remote-status'?: string;
  };
  relationships?: Record<string, unknown>;
}

export interface JobApplication {
  id: string;
  type: 'job-applications';
  links?: Record<string, string>;
  attributes: {
    'created-at'?: string;
    'cover-letter'?: string;
    'updated-at'?: string;
    'rejected-at'?: string | null;
    'referring-url'?: string | null;
    'referring-site'?: string | null;
    sourced?: boolean;
    'changed-stage-at'?: string;
  };
  relationships?: {
    candidate?: { data?: { id: string; type: string } };
    job?: { data?: { id: string; type: string } };
    stage?: { links?: unknown };
    'reject-reason'?: { links?: unknown };
  };
}

export interface ListJobsParams {
  page?: number;
  perPage?: number;
  filter?: {
    status?: string;
    feed?: string;
    department?: string;
    role?: string;
    locations?: string;
    regions?: string;
  };
  include?: string;
  sort?: string;
}

export interface ListJobApplicationsParams {
  page?: number;
  perPage?: number;
  filter?: {
    jobId?: string;
    'stage-type'?: string;
    'created-at'?: { from?: string; to?: string };
    'updated-at'?: { from?: string; to?: string };
    'changed-stage-at'?: { from?: string; to?: string };
  };
  include?: string;
  sort?: string;
}

/**
 * A simple client for the Teamtailor API.
 */
export class TeamtailorClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * @param baseUrl  The base URL for your Teamtailor API (e.g. https://api.teamtailor.com/v1)
   * @param apiKey Your Teamtailor API key (must have Admin scope to read candidates)
   */
  constructor( baseUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * List candidates, with optional pagination or filters.
   */
  async listCandidates(params: ListCandidatesParams = {}): Promise<Candidate[]> {
    const url = new URL(`${this.baseUrl}/candidates`);

    this.addJsonApiPagination(url, params.page, params.perPage);

    if (params?.filter?.createdAfter) {
      url.searchParams.append('filter[created-at][from]', params.filter.createdAfter);
    }

    if (params?.filter?.createdBefore) {
      url.searchParams.append('filter[created-at][to]', params.filter.createdBefore);
    }

    if (params?.filter?.updatedAfter) {
      url.searchParams.append('filter[updated-at][from]', params.filter.updatedAfter);
    }

    if (params?.filter?.updatedBefore) {
      url.searchParams.append('filter[updated-at][to]', params.filter.updatedBefore);
    }

    const body = await this.request<{ data: Candidate[] }>(url);
    return body.data;
  }

  /**
   * Get a single candidate by their ID.
   */
  async getCandidate(
    id: number,
  ): Promise<Candidate> {
    const url = new URL(`${this.baseUrl}/candidates/${id}`);

    const body = await this.request<{ data: Candidate }>(url);
    return body.data;
  }

  /**
   * List jobs with optional pagination and filters.
   * Use filter.status e.g. "published", "all" (Admin/Internal). Filter by title client-side to find e.g. "QA Engineer (FR)".
   */
  async listJobs(params: ListJobsParams = {}): Promise<{ data: Job[]; meta?: { 'record-count'?: number; 'page-count'?: number }; links?: Record<string, string> }> {
    const url = new URL(`${this.baseUrl}/jobs`);
    this.addJsonApiPagination(url, params.page, params.perPage);

    if (params?.filter?.status) {
      url.searchParams.append('filter[status]', params.filter.status);
    }
    if (params?.filter?.feed) {
      url.searchParams.append('filter[feed]', params.filter.feed);
    }
    if (params?.filter?.department) {
      url.searchParams.append('filter[department]', params.filter.department);
    }
    if (params?.filter?.role) {
      url.searchParams.append('filter[role]', params.filter.role);
    }
    if (params?.filter?.locations) {
      url.searchParams.append('filter[locations]', params.filter.locations);
    }
    if (params?.filter?.regions) {
      url.searchParams.append('filter[regions]', params.filter.regions);
    }
    if (params?.include) {
      url.searchParams.append('include', params.include);
    }
    if (params?.sort) {
      url.searchParams.append('sort', params.sort);
    }

    return this.request<{ data: Job[]; meta?: { 'record-count'?: number; 'page-count'?: number }; links?: Record<string, string> }>(url);
  }

  /**
   * Get a single job by ID.
   */
  async getJob(id: string): Promise<Job> {
    const url = new URL(`${this.baseUrl}/jobs/${id}`);
    const body = await this.request<{ data: Job }>(url);
    return body.data;
  }

  /**
   * List job applications, optionally filtered by job ID (filter[job-id]=xxx).
   * Use include=candidate to get candidate data in the same response.
   */
  async listJobApplications(params: ListJobApplicationsParams = {}): Promise<{ data: JobApplication[]; meta?: { 'record-count'?: number; 'page-count'?: number }; links?: Record<string, string> }> {
    const url = new URL(`${this.baseUrl}/job-applications`);
    this.addJsonApiPagination(url, params.page, params.perPage);

    if (params?.filter?.jobId) {
      url.searchParams.append('filter[job-id]', params.filter.jobId);
    }
    if (params?.filter?.['stage-type']) {
      url.searchParams.append('filter[stage-type]', params.filter['stage-type']);
    }
    const created = params?.filter?.['created-at'];
    if (created?.from) url.searchParams.append('filter[created-at][from]', created.from);
    if (created?.to) url.searchParams.append('filter[created-at][to]', created.to);
    const updated = params?.filter?.['updated-at'];
    if (updated?.from) url.searchParams.append('filter[updated-at][from]', updated.from);
    if (updated?.to) url.searchParams.append('filter[updated-at][to]', updated.to);
    const changed = params?.filter?.['changed-stage-at'];
    if (changed?.from) url.searchParams.append('filter[changed-stage-at][from]', changed.from);
    if (changed?.to) url.searchParams.append('filter[changed-stage-at][to]', changed.to);
    if (params?.include) {
      url.searchParams.append('include', params.include);
    }
    if (params?.sort) {
      url.searchParams.append('sort', params.sort);
    }

    return this.request<{ data: JobApplication[]; meta?: { 'record-count'?: number; 'page-count'?: number }; links?: Record<string, string> }>(url);
  }

  /**
   * Get all candidates who applied to a given job (by job ID).
   * Fetches job applications with include=candidate and returns the list of candidates.
   * Handles pagination automatically up to a limit.
   */
  async getCandidatesForJob(jobId: string, options?: { perPage?: number; maxCandidates?: number }): Promise<{ candidates: Candidate[]; applications: JobApplication[] }> {
    const perPage = Math.min(options?.perPage ?? 30, 30);
    const maxCandidates = options?.maxCandidates ?? 500;
    const applications: JobApplication[] = [];
    const candidateIds = new Set<string>();
    const candidates: Candidate[] = [];
    let page = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await this.listJobApplications({
        page,
        perPage,
        filter: { jobId },
        include: 'candidate',
      });
      applications.push(...res.data);

      // Parse included candidates if present (JSON:API include)
      const inc = (res as { included?: Array<{ type: string; id: string; attributes?: Record<string, unknown> }> }).included;
      if (inc) {
        for (const ref of res.data) {
          const candRef = ref.relationships?.candidate?.data;
          if (candRef?.id && !candidateIds.has(candRef.id)) {
            candidateIds.add(candRef.id);
            const includedCandidate = inc.find((r) => r.type === 'candidates' && r.id === candRef.id);
            if (includedCandidate) {
              candidates.push({
                id: includedCandidate.id,
                type: 'candidates',
                attributes: (includedCandidate.attributes || {}) as Candidate['attributes'],
              });
            }
          }
        }
      } else {
        // Fallback: collect candidate ids from relationships and fetch candidates one by one (or leave for caller to use application.candidate link)
        for (const app of res.data) {
          const candRef = app.relationships?.candidate?.data;
          if (candRef?.id && !candidateIds.has(candRef.id)) {
            candidateIds.add(candRef.id);
            try {
              const c = await this.getCandidate(Number(candRef.id));
              candidates.push(c);
            } catch {
              // skip if fetch fails
            }
          }
        }
      }

      if (res.data.length < perPage || candidates.length >= maxCandidates) break;
      if (res.meta && res.meta['page-count'] !== undefined && page >= (res.meta['page-count'] ?? 0)) break;
      page++;
    }

    return { candidates, applications };
  }

  private addJsonApiPagination(url: URL, page?: number, perPage?: number): void {
    if (page !== undefined) {
      url.searchParams.append('page[number]', String(page));
    }
    if (perPage !== undefined) {
      url.searchParams.append('page[size]', String(Math.min(perPage, 30)));
    }
  }

  private request<T>(url: URL): Promise<T> {
    const options: https.RequestOptions = {
      method: 'GET',
      headers: {
        'Authorization': `Token token=${this.apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-Api-Version': '20240404',
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(raw) as T);
            } catch (err) {
              reject(new Error(`Invalid JSON: ${err}`));
            }
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${raw}`)
            );
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }
}
