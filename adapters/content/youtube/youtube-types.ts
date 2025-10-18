// YouTube API response types
// Based on YouTube Data API v3

export interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId?: string;
  };
  snippet: YouTubeSnippet & {
    resourceId?: {
      kind: string;
      videoId?: string;
    };
  };
}

export interface YouTubeVideoResponse {
  items: YouTubeVideo[];
}

export interface YouTubeVideo {
  id: string;
  snippet: YouTubeSnippet;
  contentDetails: YouTubeContentDetails;
  statistics?: YouTubeStatistics;
}

export interface YouTubeSnippet {
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
}

export interface YouTubeThumbnails {
  default: YouTubeThumbnail;
  medium: YouTubeThumbnail;
  high: YouTubeThumbnail;
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeContentDetails {
  duration: string; // ISO 8601 format (e.g., "PT15M33S")
  dimension: string;
  definition: string;
}

export interface YouTubeStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface YouTubeChannelResponse {
  items: YouTubeChannel[];
}

export interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    customUrl?: string;
  };
  contentDetails?: {
    relatedPlaylists: {
      uploads: string;
    };
  };
  statistics?: {
    subscriberCount: string;
    videoCount: string;
  };
}

export interface YouTubeActivitiesResponse {
  items: YouTubeActivity[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeActivity {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    type: string;
  };
  contentDetails: {
    upload?: {
      videoId: string;
    };
  };
}
