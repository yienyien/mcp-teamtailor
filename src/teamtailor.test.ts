import { describe, it, expect, vi, beforeEach } from "vitest";
import https from "https";
import { TeamtailorClient } from "./teamtailor.js";

/**
 * Mock https.request to capture the URL and resolve with a given JSON body.
 */
function mockRequest(resolveWith: unknown) {
  const json = JSON.stringify(resolveWith);
  vi.mocked(https.request).mockImplementation((url, options, callback) => {
    const res = {
      statusCode: 200,
      on: (event: string, fn: (chunk?: string) => void) => {
        if (event === "data") fn(json);
        if (event === "end") setTimeout(fn, 0);
        return res;
      },
    };
    const req = {
      on: () => req,
      end: () => {
        if (typeof callback === "function") callback(res as never);
      },
    };
    return req as never;
  });
}

describe("TeamtailorClient", () => {
  const baseUrl = "https://api.teamtailor.com/v1";
  const apiKey = "test-key";

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(https, "request");
  });

  describe("listJobs", () => {
    it("builds GET /jobs URL with pagination and filter", async () => {
      mockRequest({
        data: [{ id: "1", type: "jobs", attributes: { title: "QA Engineer (FR)" } }],
        meta: { "record-count": 1, "page-count": 1 },
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      await client.listJobs({
        page: 2,
        perPage: 20,
        filter: { status: "published" },
      });

      expect(https.request).toHaveBeenCalledTimes(1);
      const [url] = vi.mocked(https.request).mock.calls[0];
      expect(String(url)).toBe(
        "https://api.teamtailor.com/v1/jobs?page%5Bnumber%5D=2&page%5Bsize%5D=20&filter%5Bstatus%5D=published"
      );
    });

    it("returns data and meta from the API", async () => {
      const jobs = [
        { id: "42", type: "jobs", attributes: { title: "QA Engineer (FR)", status: "open" } },
      ];
      mockRequest({ data: jobs, meta: { "record-count": 1, "page-count": 1 } });

      const client = new TeamtailorClient(baseUrl, apiKey);
      const result = await client.listJobs();

      expect(result.data).toEqual(jobs);
      expect(result.meta).toEqual({ "record-count": 1, "page-count": 1 });
    });
  });

  describe("getJob", () => {
    it("builds GET /jobs/:id URL", async () => {
      mockRequest({
        data: { id: "123", type: "jobs", attributes: { title: "QA Engineer (FR)" } },
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      await client.getJob("123");

      const [url] = vi.mocked(https.request).mock.calls[0];
      expect(String(url)).toBe("https://api.teamtailor.com/v1/jobs/123");
    });
  });

  describe("listJobApplications", () => {
    it("builds GET /job-applications with filter[job-id]", async () => {
      mockRequest({
        data: [],
        meta: { "record-count": 0, "page-count": 0 },
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      await client.listJobApplications({
        page: 1,
        perPage: 30,
        filter: { jobId: "456" },
        include: "candidate",
      });

      const [urlOrPath] = vi.mocked(https.request).mock.calls[0];
      const url = typeof urlOrPath === "string" ? new URL(urlOrPath) : urlOrPath;
      expect(url.searchParams.get("filter[job-id]")).toBe("456");
      expect(url.searchParams.get("include")).toBe("candidate");
      expect(url.searchParams.get("page[number]")).toBe("1");
      expect(url.searchParams.get("page[size]")).toBe("30");
    });

    it("returns data from the API", async () => {
      const applications = [
        {
          id: "1",
          type: "job-applications",
          attributes: { "created-at": "2024-01-01" },
          relationships: { candidate: { data: { id: "10", type: "candidates" } } },
        },
      ];
      mockRequest({ data: applications, meta: { "record-count": 1, "page-count": 1 } });

      const client = new TeamtailorClient(baseUrl, apiKey);
      const result = await client.listJobApplications({ filter: { jobId: "456" } });

      expect(result.data).toEqual(applications);
    });
  });

  describe("getCandidatesForJob", () => {
    it("fetches job applications with jobId and include=candidate", async () => {
      mockRequest({
        data: [
          {
            id: "1",
            type: "job-applications",
            relationships: { candidate: { data: { id: "10", type: "candidates" } } },
          },
        ],
        included: [
          {
            type: "candidates",
            id: "10",
            attributes: { "first-name": "Jane", "last-name": "Doe", email: "jane@example.com" },
          },
        ],
        meta: { "record-count": 1, "page-count": 1 },
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      const result = await client.getCandidatesForJob("456");

      expect(result.applications).toHaveLength(1);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].id).toBe("10");
      expect(result.candidates[0].attributes["first-name"]).toBe("Jane");
      expect(https.request).toHaveBeenCalledTimes(1);
      const [urlOrPath] = vi.mocked(https.request).mock.calls[0];
      const url = typeof urlOrPath === "string" ? new URL(urlOrPath) : urlOrPath;
      expect(url.searchParams.get("filter[job-id]")).toBe("456");
      expect(url.searchParams.get("include")).toBe("candidate");
    });

    it("fallback: when response has no included, fetches each candidate via getCandidate()", async () => {
      const jobApplicationsResponse = {
        data: [
          {
            id: "1",
            type: "job-applications",
            relationships: { candidate: { data: { id: "10", type: "candidates" } } },
          },
          {
            id: "2",
            type: "job-applications",
            relationships: { candidate: { data: { id: "20", type: "candidates" } } },
          },
        ],
        meta: { "record-count": 2, "page-count": 1 },
      };
      const candidate10 = {
        id: "10",
        type: "candidates",
        attributes: { "first-name": "Jane", "last-name": "Doe", email: "jane@example.com" },
      };
      const candidate20 = {
        id: "20",
        type: "candidates",
        attributes: { "first-name": "John", "last-name": "Smith", email: "john@example.com" },
      };

      let callCount = 0;
      vi.mocked(https.request).mockImplementation((urlOrPath, _options, callback) => {
        const url = typeof urlOrPath === "string" ? new URL(urlOrPath) : urlOrPath;
        const path = url.pathname;

        if (path === "/v1/job-applications" || (path.endsWith("/job-applications") && !path.match(/\/\d+$/))) {
          const json = JSON.stringify(jobApplicationsResponse);
          const res = {
            statusCode: 200,
            on: (event: string, fn: (chunk?: string) => void) => {
              if (event === "data") fn(json);
              if (event === "end") setTimeout(fn, 0);
              return res;
            },
          };
          const req = {
            on: () => req,
            end: () => {
              if (typeof callback === "function") callback(res as never);
            },
          };
          return req as never;
        }

        const candidateIdMatch = path.match(/\/candidates\/(\d+)$/);
        if (candidateIdMatch) {
          const id = candidateIdMatch[1];
          const body = id === "10" ? { data: candidate10 } : id === "20" ? { data: candidate20 } : { data: null };
          const json = JSON.stringify(body);
          const res = {
            statusCode: 200,
            on: (event: string, fn: (chunk?: string) => void) => {
              if (event === "data") fn(json);
              if (event === "end") setTimeout(fn, 0);
              return res;
            },
          };
          const req = {
            on: () => req,
            end: () => {
              if (typeof callback === "function") callback(res as never);
            },
          };
          return req as never;
        }

        throw new Error(`Unexpected request path: ${path}`);
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      const result = await client.getCandidatesForJob("456");

      expect(result.applications).toHaveLength(2);
      expect(result.candidates).toHaveLength(2);
      expect(result.candidates[0].id).toBe("10");
      expect(result.candidates[0].attributes["first-name"]).toBe("Jane");
      expect(result.candidates[1].id).toBe("20");
      expect(result.candidates[1].attributes["first-name"]).toBe("John");
      expect(https.request).toHaveBeenCalledTimes(3); // 1 job-applications + 2 getCandidate
    });

    it("fallback: swallows getCandidate errors and still returns applications and other candidates", async () => {
      const jobApplicationsResponse = {
        data: [
          {
            id: "1",
            type: "job-applications",
            relationships: { candidate: { data: { id: "10", type: "candidates" } } },
          },
          {
            id: "2",
            type: "job-applications",
            relationships: { candidate: { data: { id: "20", type: "candidates" } } },
          },
        ],
        meta: { "record-count": 2, "page-count": 1 },
      };
      const candidate20 = {
        id: "20",
        type: "candidates",
        attributes: { "first-name": "John", "last-name": "Smith", email: "john@example.com" },
      };

      vi.mocked(https.request).mockImplementation((urlOrPath, _options, callback) => {
        const url = typeof urlOrPath === "string" ? new URL(urlOrPath) : urlOrPath;
        const path = url.pathname;

        if (path === "/v1/job-applications" || (path.endsWith("/job-applications") && !path.match(/\/\d+$/))) {
          const json = JSON.stringify(jobApplicationsResponse);
          const res = {
            statusCode: 200,
            on: (event: string, fn: (chunk?: string) => void) => {
              if (event === "data") fn(json);
              if (event === "end") setTimeout(fn, 0);
              return res;
            },
          };
          const req = {
            on: () => req,
            end: () => {
              if (typeof callback === "function") callback(res as never);
            },
          };
          return req as never;
        }

        const candidateIdMatch = path.match(/\/candidates\/(\d+)$/);
        if (candidateIdMatch) {
          const id = candidateIdMatch[1];
          if (id === "10") {
            let errorHandler!: (e: Error) => void;
            const req = {
              on: (event: string, fn: (e?: Error) => void) => {
                if (event === "error") errorHandler = fn as (e: Error) => void;
                return req;
              },
              end: () => {
                setTimeout(() => errorHandler(new Error("Network error")), 0);
              },
            };
            return req as never;
          }
          const json = JSON.stringify({ data: candidate20 });
          const res = {
            statusCode: 200,
            on: (event: string, fn: (chunk?: string) => void) => {
              if (event === "data") fn(json);
              if (event === "end") setTimeout(fn, 0);
              return res;
            },
          };
          const req = {
            on: () => req,
            end: () => {
              if (typeof callback === "function") callback(res as never);
            },
          };
          return req as never;
        }

        throw new Error(`Unexpected request path: ${path}`);
      });

      const client = new TeamtailorClient(baseUrl, apiKey);
      const result = await client.getCandidatesForJob("456");

      expect(result.applications).toHaveLength(2);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].id).toBe("20");
      expect(result.candidates[0].attributes["first-name"]).toBe("John");
      expect(https.request).toHaveBeenCalledTimes(3); // 1 job-applications + 2 getCandidate (one fails, swallowed)
    });
  });

  describe("listCandidates", () => {
    it("uses page[number] and page[size] for pagination", async () => {
      mockRequest({ data: [] });

      const client = new TeamtailorClient(baseUrl, apiKey);
      await client.listCandidates({ page: 1, perPage: 10 });

      const [urlOrPath] = vi.mocked(https.request).mock.calls[0];
      const url = typeof urlOrPath === "string" ? new URL(urlOrPath) : urlOrPath;
      expect(url.searchParams.get("page[number]")).toBe("1");
      expect(url.searchParams.get("page[size]")).toBe("10");
    });
  });
});
