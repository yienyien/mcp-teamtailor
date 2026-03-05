# mcp-teamtailor

The MCP Teamtailor is a Model Context Protocol (MCP) server that provides a simple integration with the [teamtailor api](https://docs.teamtailor.com/).

## Dependencies

No other dependencies are required to use the MCP Teamtailor server.

## Usage

MCP servers are configured differently depending on the client that you are using. For reference, this is how you would configure it using Claude Desktop.

```json
{
  "mcpServers": {
    "teamtailor": {
      "command": "npx",
      "args": [
        "-y",
        "@yienyien81/mcp-teamtailor"
      ],
      "env": {
        "TEAMTAILOR_URL": "https://api.teamtailor.com/v1",
        "TEAMTAILOR_API_KEY": "XXXX"
      }
    }
  }
}
```

## MCP Transport

At the moment, only `stdio` transport has been implemented.

## Tools

### Candidates

- **teamtailor_list_candidates** - List and filter candidates.
  - `pageSize`: The size of the page response (number, optional, default 10)
  - `page`: The page number to retrieve (number, optional, default 1)
  - `filter.createdAfter`: Filter candidates created after a specific date (string, optional)
  - `filter.createdBefore`: Filter candidates created before a specific date (string, optional)
  - `filter.updatedAfter`: Filter candidates updated after a specific date (string, optional)
  - `filter.updatedBefore`: Filter candidates updated before a specific date (string, optional)

- **teamtailor_get_candidate** - Get a single candidate by their id.
  - `candidateId`: The id of the candidate to retrieve (number, required)

### Jobs

- **teamtailor_list_jobs** - List jobs. Use this to find a job by title (e.g. "QA Engineer (FR)") and get its id.
  - `pageSize`: Number of jobs per page (number, optional, default 30, max 30)
  - `page`: Page number (number, optional, default 1)
  - `filter.status`: Filter by status — `published`, `unlisted`, `archived`, `draft`, `scheduled`, `all` (optional)
  - `filter.feed`: Filter by feed (e.g. `public`, `internal`) (string, optional)
  - `filter.department`: Filter by department id (string, optional)
  - `filter.role`: Filter by role id (string, optional)
  - `filter.locations`: Filter by location id (string, optional)
  - `filter.regions`: Filter by region id (string, optional)
  - `include`: Comma-separated relations to include in the response (string, optional)
  - `sort`: Sort order (string, optional)

- **teamtailor_get_job** - Get a single job by its id.
  - `jobId`: The job id (string, required)

### Job applications and candidates per job

- **teamtailor_list_job_applications** - List job applications, optionally filtered by job id.
  - `pageSize`: Number of applications per page (number, optional, default 30, max 30)
  - `page`: Page number (number, optional, default 1)
  - `jobId`: Filter applications by job id (string, optional)
  - `include`: Comma-separated relations to include, e.g. `candidate`, `stage` (string, optional)
  - `stageType`: Filter by current stage — `Inbox`, `In process`, `Hired` (optional)
  - `sort`: Sort order (string, optional)

- **teamtailor_get_candidates_for_job** - Get all candidates who applied to a given job. Fetches applications for the job and returns both the list of candidates and the applications. Use after **teamtailor_list_jobs** to get the job id.
  - `jobId`: The job id, e.g. from teamtailor_list_jobs (string, required)
  - `perPage`: Applications per page when paginating (number, optional, default 30)
  - `maxCandidates`: Maximum number of candidates to return (number, optional, default 500)

**Example workflow — list candidates for a specific job (e.g. "QA Engineer (FR)"):**

1. Call **teamtailor_list_jobs** (optionally with `filter.status: "published"`) and find the job whose `attributes.title` matches "QA Engineer (FR)".
2. Note the job `id` from the response.
3. Call **teamtailor_get_candidates_for_job** with that `jobId` to get all candidates and their applications for that job.

Alternatively, use **teamtailor_list_job_applications** with `jobId` and optionally `include: "candidate"` to get applications (and included candidate data) page by page.

## License

Released under the MIT License.  See the [LICENSE](./LICENSE) file for further details.
