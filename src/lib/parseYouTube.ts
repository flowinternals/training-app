/**
 * YouTube URL parser utility
 * Extracts video ID, start time, and playlist ID from various YouTube URL formats
 */

export interface YouTubeParseResult {
  id: string;
  start?: number;
  playlistId?: string;
}

/**
 * Parse YouTube URL and extract video ID, start time, and playlist ID
 * Supports watch?v=, youtu.be/, and embed/ formats
 */
export function parseYouTubeUrl(url: string): YouTubeParseResult | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Clean up the URL
  const cleanUrl = url.trim();

  // Extract video ID using different patterns
  let videoId: string | null = null;
  let startTime: number | undefined;
  let playlistId: string | undefined;

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchMatch = cleanUrl.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Pattern 2: youtu.be/VIDEO_ID
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  if (!videoId || videoId.length !== 11) {
    return null;
  }

  // Parse URL parameters for start time and playlist
  try {
    const urlObj = new URL(cleanUrl);
    const params = urlObj.searchParams;
    
    // Extract start time from 't' or 'start' parameter
    const tParam = params.get('t');
    const startParam = params.get('start');
    
    if (tParam) {
      // Handle formats like '45s' or just '45'
      startTime = parseInt(tParam.replace('s', ''), 10);
    } else if (startParam) {
      startTime = parseInt(startParam, 10);
    }
    
    // Extract playlist ID
    playlistId = params.get('list') || undefined;
  } catch (error) {
    // If URL parsing fails, try regex fallback for start time
    const startMatch = cleanUrl.match(/(?:t=|start=)(\d+)(?:s)?/);
    if (startMatch) {
      startTime = parseInt(startMatch[1], 10);
    }
  }

  return {
    id: videoId,
    start: startTime,
    playlistId,
  };
}

/**
 * Validate if a string is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return parseYouTubeUrl(url) !== null;
}

/**
 * Generate YouTube embed URL with privacy-enhanced domain
 */
export function generateEmbedUrl(
  videoId: string, 
  options: {
    start?: number;
    playlistId?: string;
    autoplay?: boolean;
  } = {}
): string {
  const { start, playlistId, autoplay = false } = options;
  
  const params = new URLSearchParams();
  
  if (start && start > 0) {
    params.set('start', start.toString());
  }
  
  if (playlistId) {
    params.set('list', playlistId);
  }
  
  if (autoplay) {
    params.set('autoplay', '1');
  }
  
  const queryString = params.toString();
  const baseUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
