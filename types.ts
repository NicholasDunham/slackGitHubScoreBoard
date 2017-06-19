export interface UserScore {
  user: string;
  score: number;
}

export interface GitHubResponse {
  data: Array<GitHubEvent>;
  meta: {
    "x-ratelimit-limit": string;
    "x-ratelimit-remaining": string;
    "x-ratelimit-reset": string;
    "x-poll-interval": string;
    "x-github-request-id": string;
    "x-github-media-type": string;
    link: string;
    "last-modified": string;
    etag: string;
    status: string;
  };
}

export interface GitHubEvent {
  type: string;
  payload: {
    distinct_size: number;
  };
  created_at: string;
}
