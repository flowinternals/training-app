'use client';

import { useMemo } from 'react';
import YouTubePlayer from '@/components/YouTubePlayer';
import QuizLesson from '@/components/courses/QuizLesson';
import { VideoBlock, QuizBlock } from '@/types';

interface LessonContentRendererProps {
  content: string;
  className?: string;
  lessonType?: 'video' | 'text' | 'quiz';
  quiz?: QuizBlock;
  onQuizComplete?: (passed: boolean) => void;
}

/**
 * Renders lesson content with support for video blocks and quizzes
 */
export default function LessonContentRenderer({ 
  content, 
  className = '', 
  lessonType = 'text',
  quiz,
  onQuizComplete 
}: LessonContentRendererProps) {
  const processedContent = useMemo(() => {
    if (!content) {
      return { videoBlocks: [], htmlContent: '' };
    }

    // Find all video blocks
    const videoBlockRegex = /<video-block data="([^"]+)"><\/video-block>/g;
    const videoBlocks: VideoBlock[] = [];
    let htmlContent = content;

    // Extract video blocks and deduplicate by URL
    const seenUrls = new Set<string>();
    let match;
    while ((match = videoBlockRegex.exec(content)) !== null) {
      try {
        const videoData = JSON.parse(decodeURIComponent(match[1]));
        if (videoData.type === 'video' && videoData.provider === 'youtube') {
          // Only add if we haven't seen this URL before
          if (!seenUrls.has(videoData.url)) {
            videoBlocks.push(videoData as VideoBlock);
            seenUrls.add(videoData.url);
          }
        }
      } catch (error) {
        console.warn('Failed to parse video block:', error);
      }
    }

    // Remove ALL video-block tags from HTML content
    htmlContent = htmlContent.replace(/<video-block[^>]*><\/video-block>/g, '');

    return { videoBlocks, htmlContent };
  }, [content]);

  // Handle quiz lessons
  if (lessonType === 'quiz' && quiz) {
    console.log('LessonContentRenderer - Rendering quiz with data:', quiz);
    console.log('LessonContentRenderer - Quiz questions:', quiz.questions);
    return (
      <div className={className}>
        <QuizLesson 
          quiz={quiz} 
          onComplete={onQuizComplete || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      {/* Render video blocks */}
      {processedContent.videoBlocks.map((videoBlock, index) => (
        <div key={`video-${index}`} className="my-6">
          <YouTubePlayer
            url={videoBlock.url}
            title={videoBlock.title}
            start={videoBlock.start}
          />
        </div>
      ))}
      
      {/* Render HTML content */}
      {processedContent.htmlContent && (
        <div 
          className="text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ 
            __html: processedContent.htmlContent.replace(
              /<img([^>]+)alt="([^"]+)"([^>]*)>/g, 
              '<div class="relative inline-block"><img$1alt="$2"$3><div class="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1"><p class="text-xs text-white">$2</p></div></div>'
            ) || ''
          }}
        />
      )}
    </div>
  );
}
