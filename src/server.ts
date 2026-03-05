import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TeamtailorClient } from "./teamtailor.js";

if (!process.env.TEAMTAILOR_API_KEY) {
  throw new Error("Missing TEAMTAILOR_API_KEY environment variable");
}

const client = new TeamtailorClient(
  process.env.TEAMTAILOR_URL || "https://api.teamtailor.com/v1",
  process.env.TEAMTAILOR_API_KEY as string
);

const server = new McpServer({
  name: "teamtailor",
  version: "0.0.2"
});

server.tool(
  "teamtailor_list_candidates",
  "List and filter candidates.",
  {
    pageSize: z.number().default(10),
    page: z.number().default(1),
    filter: z.object({
      createdAfter: z.string().optional(),
      createdBefore: z.string().optional(),
      updatedAfter: z.string().optional(),
      updatedBefore: z.string().optional(),
    }).optional(),
  },
  async ({ pageSize, page, filter}) => {
    const candidates = await client.listCandidates({ page, perPage: pageSize, filter });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(candidates),
        }
      ]
    }
  }
);

server.tool(
  "teamtailor_get_candidate",
  "Get a single candidate by their id.",
  {
    candidateId: z.number(),
  },
  async ({ candidateId }) => {
    const candidate = await client.getCandidate(candidateId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(candidate),
        }
      ]
    }
  }
);

server.tool(
  "teamtailor_list_jobs",
  "List jobs. Use this to find a job by title (e.g. 'QA Engineer (FR)') and get its id. Supports pagination and filters (status, department, etc.).",
  {
    pageSize: z.number().default(30),
    page: z.number().default(1),
    filter: z.object({
      status: z.enum(["published", "unlisted", "archived", "draft", "scheduled", "all"]).optional(),
      feed: z.string().optional(),
      department: z.string().optional(),
      role: z.string().optional(),
      locations: z.string().optional(),
      regions: z.string().optional(),
    }).optional(),
    include: z.string().optional(),
    sort: z.string().optional(),
  },
  async ({ pageSize, page, filter, include, sort }) => {
    const result = await client.listJobs({
      page,
      perPage: Math.min(pageSize, 30),
      filter: filter ?? undefined,
      include,
      sort,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        }
      ]
    }
  }
);

server.tool(
  "teamtailor_get_job",
  "Get a single job by its id.",
  {
    jobId: z.string(),
  },
  async ({ jobId }) => {
    const job = await client.getJob(jobId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(job),
        }
      ]
    }
  }
);

server.tool(
  "teamtailor_list_job_applications",
  "List job applications, optionally filtered by job id (filter[job-id]=xxx). Use this to get all applications for a given job. Supports include=candidate to get candidate data in the response.",
  {
    pageSize: z.number().default(30),
    page: z.number().default(1),
    jobId: z.string().optional().describe("Filter applications by job id (e.g. id of 'QA Engineer (FR)')"),
    include: z.string().optional().describe("Comma-separated relations to include, e.g. 'candidate', 'stage'"),
    stageType: z.enum(["Inbox", "In process", "Hired"]).optional(),
    sort: z.string().optional(),
  },
  async ({ pageSize, page, jobId, include, stageType, sort }) => {
    const result = await client.listJobApplications({
      page,
      perPage: Math.min(pageSize, 30),
      filter:
        jobId || stageType
          ? { ...(jobId ? { jobId } : {}), ...(stageType ? { "stage-type": stageType } : {}) }
          : undefined,
      include,
      sort,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        }
      ]
    }
  }
);

server.tool(
  "teamtailor_get_candidates_for_job",
  "Get all candidates who applied to a given job. Fetches job applications filtered by job id and returns both the list of candidates and the applications. Use after teamtailor_list_jobs to get the job id (e.g. for 'QA Engineer (FR)').",
  {
    jobId: z.string().describe("The job id (from teamtailor_list_jobs)"),
    perPage: z.number().default(30).optional(),
    maxCandidates: z.number().default(500).optional(),
  },
  async ({ jobId, perPage, maxCandidates }) => {
    const result = await client.getCandidatesForJob(jobId, { perPage, maxCandidates });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        }
      ]
    }
  }
);

export { server };