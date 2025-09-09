'use client';

import { memo, useMemo } from 'react';
import { parseYouTubeUrl, generateEmbedUrl } from '@/lib/parseYouTube';

export interface YouTubePlayerProps {
  url?: string;
  videoId?: string;
  title?: string;
  start?: number;
  playlistId?: string;
  autoplay?: boolean;
  className?: string;
}

/**
 * YouTube Player Component
 * Renders a responsive, privacy-enhanced YouTube video player
 */
const YouTubePlayer = memo<YouTubePlayerProps>(({
  url,
  videoId,
  title,
  start,
  playlistId,
  autoplay = false,
  className = '',
}) => {
  // Parse video ID and parameters from URL or use provided values
  const parsedData = useMemo(() => {
    if (url) {
      const parsed = parseYouTubeUrl(url);
      if (parsed) {
        return {
          id: parsed.id,
          start: parsed.start || start,
          playlistId: parsed.playlistId || playlistId,
        };
      }
    }
    
    if (videoId) {
      return {
        id: videoId,
        start,
        playlistId,
      };
    }
    
    return null;
  }, [url, videoId, start, playlistId]);

  // Generate embed URL
  const embedUrl = useMemo(() => {
    if (!parsedData) return null;
    
    return generateEmbedUrl(parsedData.id, {
      start: parsedData.start,
      playlistId: parsedData.playlistId,
      autoplay,
    });
  }, [parsedData, autoplay]);

  if (!embedUrl) {
    return (
      <div className={`w-full aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">Invalid YouTube URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-video rounded-xl overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        title={title || 'YouTube video player'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="w-full h-full border-0"
        style={{
          aspectRatio: '16/9',
        }}
      />
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
