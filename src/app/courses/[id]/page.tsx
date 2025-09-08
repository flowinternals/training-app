'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCourseById } from '@/lib/firebase-utils';
import { Course, Module, Lesson, User } from '@/types';
import Navigation from '@/components/Navigation';
import PaymentButton from '@/components/payments/PaymentButton';
import CourseViewer from '@/components/courses/CourseViewer';
import { useAuth } from '@/contexts/AuthContext';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCourseViewer, setShowCourseViewer] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const courseData = await getCourseById(courseId);
        console.log('Course view - fetched course data:', courseData);
        console.log('Course view - modules:', courseData.modules);
        console.log('Course view - imageAttribution:', courseData.imageAttribution);
        setCourse(courseData);
        
        // Check if user is enrolled
        if (user && courseData) {
          setIsEnrolled(user.enrolledCourses?.includes(courseId) || false);
        }
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, user]);

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
            console.log('Prism.js fully loaded and highlighting applied');
          }
        }, 100);
      };
      document.head.appendChild(script);
    };

    loadPrism();
  }, [course]);

  // Re-apply Prism highlighting when course content changes
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
            const pre = block.parentElement;
            if (pre) {
              pre.style.background = '#1e1e1e';
              pre.style.backgroundColor = '#1e1e1e';
              pre.style.color = '#d4d4d4';
              pre.style.imageRendering = 'crisp-edges';
              pre.style.imageRendering = '-webkit-optimize-contrast';
              block.style.background = 'transparent';
              block.style.backgroundColor = 'transparent';
              block.style.color = '#d4d4d4';
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

      // Set up MutationObserver to watch for content changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            setTimeout(highlightCodeBlocks, 100);
          }
        });
      });

      // Start observing the document body for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Cleanup observer on unmount
      return () => observer.disconnect();
    }
  }, [course]);

  // Check for payment success in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setPaymentSuccess(true);
      setIsEnrolled(true);
    }
  }, []);

  // Function to bypass Stripe and enroll user directly (for testing)
  const enrollUserDirectly = async () => {
    if (user && course) {
      try {
        // In a real app, you'd update the user's enrolled courses in Firebase
        // For now, we'll just set the local state
        setIsEnrolled(true);
        setPaymentSuccess(true);
        console.log('User enrolled directly (bypassing Stripe)');
      } catch (error) {
        console.error('Error enrolling user:', error);
      }
    }
  };

  // Show course viewer if user is enrolled and wants to start learning
  if (showCourseViewer && course) {
    return (
      <CourseViewer 
        course={course} 
        onBack={() => setShowCourseViewer(false)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Course Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error || 'The course you are looking for does not exist.'}
            </p>
            <a
              href="/courses"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Courses
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Course Banner */}
        {(course.panelImage || course.thumbnail) && (
          <div className="relative mb-8 rounded-lg overflow-hidden">
            <img
              src={course.panelImage || course.thumbnail}
              alt={course.title}
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {course.title}
              </h1>
              <p className="text-lg text-gray-200 mb-4">
                {course.description}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                <span>Category: {course.category}</span>
                <span>Difficulty: {course.difficulty}</span>
                <span>Duration: {course.duration} minutes</span>
                <span>Price: {course.isFree ? 'Free' : `$${course.price}`}</span>
              </div>
            </div>
            {/* Image Attribution */}
            {course.imageAttribution && (
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs text-gray-200">
                  {course.imageAttribution}
                </p>
              </div>
            )}
            {/* Debug attribution */}
            {console.log('Course view - imageAttribution check:', course.imageAttribution, 'Truthy:', !!course.imageAttribution)}
          </div>
        )}

        {/* Course Header (fallback when no image) */}
        {!course.panelImage && !course.thumbnail && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {course.title}
              </h1>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {course.published ? 'Published' : 'Draft'}
                </span>
                {isEnrolled && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Enrolled
                  </span>
                )}
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {course.description}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Category: {course.category}</span>
              <span>Difficulty: {course.difficulty}</span>
              <span>Duration: {course.duration} minutes</span>
              <span>Price: {course.isFree ? 'Free' : `$${course.price}`}</span>
            </div>
          </div>
        )}

        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Course Overview
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300">
                  {course.overview || 'No overview available for this course.'}
                </p>
              </div>
            </div>

            {/* Modules */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Course Modules
              </h2>
              {course.modules && course.modules.length > 0 ? (
                <div className="space-y-4">
                  {course.modules.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        Module {moduleIndex + 1}: {module.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {module.description}
                      </p>
                      {module.lessons && module.lessons.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Lessons:
                          </h4>
                          <div className="space-y-4">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <div key={lessonIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white flex items-center">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                    {lesson.title}
                                  </h5>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {lesson.duration} min
                                  </span>
                                </div>
                                
                                {/* Lesson Content with Images */}
                                {lesson.content && (
                                  <div className="prose dark:prose-invert max-w-none">
                                    <div 
                                      className="text-sm text-gray-700 dark:text-gray-300"
                                      dangerouslySetInnerHTML={{ 
                                        __html: lesson.content.replace(
                                          /<img([^>]+)alt="([^"]+)"([^>]*)>/g, 
                                          '<div class="relative inline-block"><img$1alt="$2"$3><div class="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1"><p class="text-xs text-white">$2</p></div></div>'
                                        )
                                      }}
                                      ref={(el) => {
                                        if (el && typeof window !== 'undefined' && (window as any).Prism) {
                                          // Re-highlight code blocks when content changes
                                          setTimeout(() => {
                                            (window as any).Prism.highlightAllUnder(el);
                                          }, 100);
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  No modules available for this course.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Course Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Instructor</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{course.instructor || 'TBD'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{course.language || 'English'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {course.tags && course.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {course.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      'No tags'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Payment Success Message */}
            {paymentSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  ✅ Payment successful! You are now enrolled in this course.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Debug button for Prism highlighting */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && (window as any).Prism) {
                    // Find all code blocks and force highlight them
                    const codeBlocks = document.querySelectorAll('pre code');
                    codeBlocks.forEach((block) => {
                      if (!block.className || !block.className.includes('language-')) {
                        const code = block.textContent || '';
                        let detectedLang = 'javascript';
                        
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
                    });
                    console.log('Prism highlighting applied manually to', codeBlocks.length, 'code blocks');
                  }
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                🔧 Force Syntax Highlighting
              </button>
              
              {user ? (
                isEnrolled ? (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 font-medium">
                      You are enrolled in this course
                    </p>
                    <button 
                      onClick={() => setShowCourseViewer(true)}
                      className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                    >
                      Start Learning
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <PaymentButton
                      course={course}
                      userId={user.uid}
                      userEmail={user.email}
                      onPaymentSuccess={() => {
                        setIsEnrolled(true);
                        setPaymentSuccess(true);
                      }}
                      onPaymentError={(error) => {
                        console.error('Payment error:', error);
                        alert(error);
                      }}
                    />
                    {/* Temporary bypass button for testing */}
                    <button
                      onClick={enrollUserDirectly}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      🚧 Bypass Payment (Testing)
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-2">
                    Please log in to enroll in this course
                  </p>
                  <a
                    href="/login"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Login
                  </a>
                </div>
              )}
              
              <button className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
