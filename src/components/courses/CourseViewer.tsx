'use client';

import { useEffect, useState } from 'react';
import { Course, Module, Lesson, UserProgress } from '@/types';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import LessonContentRenderer from '@/components/courses/LessonContentRenderer';
import { updateProgress, getAllUserProgress, updateUser } from '@/lib/firebase-utils';

interface CourseViewerProps {
  course: Course;
  onBack: () => void;
}

export default function CourseViewer({ course, onBack }: CourseViewerProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [currentModule, setCurrentModule] = useState<number>(0);
  const [currentLesson, setCurrentLesson] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Function to find the next incomplete lesson
  const findNextIncompleteLesson = (completedSet: Set<string>) => {
    if (!course.modules) return { moduleIndex: 0, lessonIndex: 0 };
    
    for (let moduleIndex = 0; moduleIndex < course.modules.length; moduleIndex++) {
      const module = course.modules[moduleIndex];
      if (!module.lessons) continue;
      
      for (let lessonIndex = 0; lessonIndex < module.lessons.length; lessonIndex++) {
        const lessonKey = `${moduleIndex}-${lessonIndex}`;
        if (!completedSet.has(lessonKey)) {
          console.log(`Found next incomplete lesson: Module ${moduleIndex}, Lesson ${lessonIndex}`);
          return { moduleIndex, lessonIndex };
        }
      }
    }
    
    // If all lessons are completed, go to the last lesson
    const lastModuleIndex = course.modules.length - 1;
    const lastLessonIndex = (course.modules[lastModuleIndex]?.lessons?.length || 1) - 1;
    console.log(`All lessons completed, going to last lesson: Module ${lastModuleIndex}, Lesson ${lastLessonIndex}`);
    return { moduleIndex: lastModuleIndex, lessonIndex: lastLessonIndex };
  };

  // Load user progress on component mount
  useEffect(() => {
    const loadUserProgress = async () => {
      if (!user) {
        console.log('No user found in CourseViewer');
        return;
      }
      
      console.log('Loading user progress for user:', user.uid);
      
      try {
        const progress = await getAllUserProgress(user.uid);
        console.log('Loaded user progress:', progress);
        setUserProgress(progress);
        
        // Create a set of completed lesson IDs for this course
        const courseProgress = progress.filter(p => p.courseId === course.id);
        const completedSet = new Set<string>();
        courseProgress.forEach(p => {
          if (p.completed) {
            // Find the module and lesson indices
            const moduleIndex = course.modules?.findIndex(m => m.id === p.moduleId) ?? -1;
            const lessonIndex = course.modules?.[moduleIndex]?.lessons?.findIndex(l => l.id === p.lessonId) ?? -1;
            if (moduleIndex >= 0 && lessonIndex >= 0) {
              completedSet.add(`${moduleIndex}-${lessonIndex}`);
            }
          }
        });
        setCompletedLessons(completedSet);
        
        // Find and navigate to the next incomplete lesson
        const nextLesson = findNextIncompleteLesson(completedSet);
        setCurrentModule(nextLesson.moduleIndex);
        setCurrentLesson(nextLesson.lessonIndex);
        
      } catch (error) {
        console.error('Error loading user progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProgress();
  }, [user, course.id, course.modules]);

  // Load Prism.js for syntax highlighting
  useEffect(() => {
    const loadPrism = () => {
      // Check if Prism is already loaded
      if (typeof window !== 'undefined' && (window as any).Prism) {
        (window as any).Prism.highlightAll();
        return;
      }

      // Load Prism.js CSS with dark theme
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-dark.min.css';
      document.head.appendChild(link);

      // Load Prism.js with all languages in one bundle
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
      script.onload = () => {
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).Prism) {
            (window as any).Prism.highlightAll();
            console.log('Prism.js fully loaded in CourseViewer');
          }
        }, 100);
      };
      document.head.appendChild(script);
    };

    loadPrism();
  }, []);

  // Re-apply Prism highlighting when lesson content changes
  useEffect(() => {
    if (course && typeof window !== 'undefined' && (window as any).Prism) {
      const highlightCodeBlocks = () => {
        // Find all code blocks (both with and without language classes)
        const codeBlocks = document.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
          if (!block.classList.contains('prism-highlighted')) {
            // If no language class, try to detect it or default to javascript
            if (!block.className || !block.className.includes('language-')) {
              // Try to detect language from content
              const code = block.textContent || '';
              let detectedLang = 'javascript'; // default
              
              if (code.includes('<!DOCTYPE html>') || code.includes('<html>')) {
                detectedLang = 'markup';
              } else if (code.includes('function') && code.includes('=>')) {
                detectedLang = 'javascript';
              } else if (code.includes('def ') || code.includes('import ')) {
                detectedLang = 'python';
              } else if (code.includes('SELECT') || code.includes('FROM')) {
                detectedLang = 'sql';
              } else if (code.includes('{') && code.includes('}') && code.includes('color:')) {
                detectedLang = 'css';
              }
              
              block.className = `language-${detectedLang}`;
            }
            
            (window as any).Prism.highlightElement(block);
            block.classList.add('prism-highlighted');
            
            // Force dark background with inline styles
            const pre = block.parentElement as HTMLElement;
            if (pre) {
              pre.style.background = '#1e1e1e';
              pre.style.backgroundColor = '#1e1e1e';
              pre.style.color = '#d4d4d4';
              pre.style.imageRendering = 'crisp-edges';
              pre.style.imageRendering = '-webkit-optimize-contrast';
              (block as HTMLElement).style.background = 'transparent';
              (block as HTMLElement).style.backgroundColor = 'transparent';
              (block as HTMLElement).style.color = '#d4d4d4';
            }
            
            // Add copy button to the pre element
            if (pre && !pre.querySelector('.copy-code-btn')) {
              const copyBtn = document.createElement('button');
              copyBtn.className = 'copy-code-btn';
              copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              `;
              copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
              copyBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const code = block.textContent || '';
                navigator.clipboard.writeText(code).catch(() => {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = code;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                });
              };
              
              pre.style.position = 'relative';
              pre.appendChild(copyBtn);
            }
          }
        });
      };

      // Apply highlighting after a short delay to ensure content is rendered
      setTimeout(highlightCodeBlocks, 100);
    }
  }, [currentLesson, currentModule]);

  const currentModuleData = course.modules?.[currentModule];
  const currentLessonData = currentModuleData?.lessons?.[currentLesson];

  const markLessonComplete = async (lessonId: string) => {
    if (!user || !currentModuleData || !currentLessonData) {
      console.error('Missing required data:', { user: !!user, currentModuleData: !!currentModuleData, currentLessonData: !!currentLessonData });
      return;
    }
    
    setSaving(true);
    try {
      const moduleId = currentModuleData.id;
      const lessonId = currentLessonData.id;
      
      console.log('Saving progress with data:', {
        userId: user.uid,
        courseId: course.id,
        moduleId: moduleId,
        lessonId: lessonId,
        completed: true
      });
      
      // Save progress to database
      await updateProgress({
        userId: user.uid,
        courseId: course.id,
        moduleId: moduleId,
        lessonId: lessonId,
        completed: true,
        timeSpent: 0, // You could track actual time spent here
      });
      
      // Update local state
      const lessonKey = `${currentModule}-${currentLesson}`;
      console.log('Updating completedLessons with key:', lessonKey);
      setCompletedLessons(prev => {
        const newSet = new Set([...prev, lessonKey]);
        console.log('New completedLessons set:', Array.from(newSet));
        return newSet;
      });
      
      // Update userProgress state
      setUserProgress(prev => {
        const existingIndex = prev.findIndex(p => 
          p.userId === user.uid && 
          p.courseId === course.id && 
          p.moduleId === moduleId && 
          p.lessonId === lessonId
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            completed: true,
            completedAt: new Date(),
            lastAccessed: new Date(),
          };
          return updated;
        } else {
          return [...prev, {
            userId: user.uid,
            courseId: course.id,
            moduleId: moduleId,
            lessonId: lessonId,
            completed: true,
            completedAt: new Date(),
            timeSpent: 0,
            lastAccessed: new Date(),
          }];
        }
      });

      // Check if course is completed
      checkCourseCompletion();
      
      // Auto-advance to next incomplete lesson
      const updatedCompletedSet = new Set([...completedLessons, lessonKey]);
      const nextLesson = findNextIncompleteLesson(updatedCompletedSet);
      
      // Only advance if the next lesson is different from current
      if (nextLesson.moduleIndex !== currentModule || nextLesson.lessonIndex !== currentLesson) {
        console.log(`Auto-advancing to next incomplete lesson: Module ${nextLesson.moduleIndex}, Lesson ${nextLesson.lessonIndex}`);
        setCurrentModule(nextLesson.moduleIndex);
        setCurrentLesson(nextLesson.lessonIndex);
      }
      
      console.log('Lesson marked as complete and saved to database');
    } catch (error) {
      console.error('Error saving lesson progress:', error);
      // You might want to show a toast notification here
    } finally {
      setSaving(false);
    }
  };

  const checkCourseCompletion = async () => {
    if (!user || !course.modules) return;

    // Count total lessons in the course
    const totalLessons = course.modules.reduce((total, module) => {
      return total + (module.lessons?.length || 0);
    }, 0);

    // Count completed lessons for this course
    const courseProgress = userProgress.filter(p => p.courseId === course.id && p.completed);
    const completedCount = courseProgress.length;

    // If all lessons are completed, mark course as completed
    if (completedCount >= totalLessons && !user.completedCourses?.includes(course.id)) {
      try {
        await updateUser(user.uid, {
          completedCourses: [...(user.completedCourses || []), course.id]
        });
        console.log('Course completed!');
        // You might want to show a completion modal or notification here
      } catch (error) {
        console.error('Error updating completed courses:', error);
      }
    }
  };

  const nextLesson = () => {
    if (currentModuleData?.lessons && currentLesson < currentModuleData.lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    } else if (course.modules && currentModule < course.modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentLesson(0);
    }
  };

  const prevLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    } else if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      const prevModule = course.modules?.[currentModule - 1];
      setCurrentLesson(prevModule?.lessons ? prevModule.lessons.length - 1 : 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading course progress...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentModuleData || !currentLessonData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Course Not Available
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              This course doesn't have any content yet.
            </p>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Course Progress */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Course Progress
              </h3>
              <div className="space-y-4">
                {course.modules?.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Module {moduleIndex + 1}: {module.title}
                    </h4>
                    <div className="space-y-1">
                      {module.lessons?.map((lesson, lessonIndex) => (
                        <button
                          key={lessonIndex}
                          onClick={() => {
                            setCurrentModule(moduleIndex);
                            setCurrentLesson(lessonIndex);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            currentModule === moduleIndex && currentLesson === lessonIndex
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{lesson.title}</span>
                            {(() => {
                              const key = `${moduleIndex}-${lessonIndex}`;
                              const isCompleted = completedLessons.has(key);
                              console.log(`Lesson ${key} completed:`, isCompleted, 'Current set:', Array.from(completedLessons));
                              return isCompleted && <span className="text-green-500">✓</span>;
                            })()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              {/* Lesson Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentLessonData.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Module {currentModule + 1}: {currentModuleData.title}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentLesson + 1} of {currentModuleData.lessons?.length || 0}
                  </span>
                </div>
              </div>

              {/* Lesson Content */}
              {(() => {
                console.log('CourseViewer - Current lesson data:', currentLessonData);
                console.log('CourseViewer - Lesson type:', currentLessonData.type);
                console.log('CourseViewer - Quiz data:', currentLessonData.quiz);
                return null;
              })()}
              <LessonContentRenderer 
                content={currentLessonData.content || ''}
                className="prose dark:prose-invert max-w-none"
                lessonType={currentLessonData.type}
                quiz={currentLessonData.quiz}
                onQuizComplete={(passed) => {
                  if (passed) {
                    markLessonComplete(currentLessonData.id);
                    addToast({ type: 'success', title: 'Quiz completed successfully!' });
                  } else {
                    addToast({ type: 'error', title: 'Quiz failed. Please try again.' });
                  }
                }}
              />

              {/* Lesson Actions */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onBack}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Course
                </button>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={prevLesson}
                    disabled={currentModule === 0 && currentLesson === 0}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Only show Mark Complete button for non-quiz lessons */}
                  {currentLessonData.type !== 'quiz' && (
                    <button
                      onClick={() => {
                        const key = `${currentModule}-${currentLesson}`;
                        console.log('Button clicked for lesson:', key, 'Completed:', completedLessons.has(key));
                        markLessonComplete(key);
                      }}
                      disabled={saving || completedLessons.has(`${currentModule}-${currentLesson}`)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                        completedLessons.has(`${currentModule}-${currentLesson}`)
                          ? 'bg-gray-500 cursor-not-allowed'
                          : saving
                          ? 'bg-yellow-600 hover:bg-yellow-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : completedLessons.has(`${currentModule}-${currentLesson}`) ? (
                        '✓ Completed'
                      ) : (
                        'Mark Complete'
                      )}
                    </button>
                  )}
                  
                  {/* Show completion status for quiz lessons */}
                  {currentLessonData.type === 'quiz' && completedLessons.has(`${currentModule}-${currentLesson}`) && (
                    <div className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md">
                      ✓ Quiz Completed
                    </div>
                  )}
                  
                  <button
                    onClick={nextLesson}
                    disabled={currentModule === (course.modules?.length || 0) - 1 && currentLesson === (currentModuleData.lessons?.length || 0) - 1}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}