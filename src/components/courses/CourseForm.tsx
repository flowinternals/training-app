'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createCourseWithModules } from '@/lib/firebase-utils';
import { Course, Module, Lesson, QuizBlock } from '@/types';
import { Plus, Trash2, Save, Loader2, BookOpen, FileText, Play, Sparkles, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AICourseGenerator from '@/components/ai/AICourseGenerator';
import ImageSelector from '@/components/courses/ImageSelector';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { auth } from '@/lib/firebase';

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  duration: number;
  tags: string[];
  thumbnail: string;
  panelImage: string;
  imageAttribution: string;
  published: boolean;
}

interface ModuleFormData {
  title: string;
  description: string;
  lessons: LessonFormData[];
}

interface LessonFormData {
  title: string;
  content: string;
  duration: number;
  type: 'video' | 'text' | 'quiz';
  videoUrl?: string;
  quiz?: QuizBlock;
}

interface CourseFormProps {
  initialCourse?: Course;
  onCourseSaved?: (course: Partial<Course>) => void;
  mode?: 'create' | 'edit';
}

export default function CourseForm({ 
  initialCourse, 
  onCourseSaved, 
  mode = 'create' 
}: CourseFormProps) {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [courseData, setCourseData] = useState<CourseFormData | null>(null);
  const [modules, setModules] = useState<ModuleFormData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState<number | null>(null);

  // Fetch fresh course data from Firebase API
  const fetchCourseData = async () => {
    if (mode === 'create') {
      // Initialize with empty data for new course
      setCourseData({
        title: '',
        description: '',
        category: 'programming',
        difficulty: 'beginner',
        price: 0,
        duration: 0,
        tags: [],
        thumbnail: '',
        panelImage: '',
        imageAttribution: '',
        published: false,
      });
      setModules([]);
      setInitialized(true);
    } else if (initialCourse?.id) {
      try {
        setLoading(true);
        // Fetch fresh data from Firebase API
        const response = await fetch(`/api/courses/${initialCourse.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch course data');
        }
        const freshCourse = await response.json();
        
        setCourseData({
          title: freshCourse.title ?? '',
          description: freshCourse.description ?? '',
          category: freshCourse.category ?? '',
          difficulty: freshCourse.difficulty ?? 'beginner',
          price: freshCourse.price ?? 0,
          duration: freshCourse.duration ?? 0,
          tags: freshCourse.tags ?? [],
          thumbnail: freshCourse.thumbnail ?? '',
          panelImage: freshCourse.panelImage ?? '',
          imageAttribution: freshCourse.imageAttribution ?? '',
          published: freshCourse.published ?? false,
        });

        if (freshCourse.modules && Array.isArray(freshCourse.modules) && freshCourse.modules.length > 0) {
          const mappedModules = freshCourse.modules.map((module: any) => ({
            title: module.title,
            description: module.description,
            lessons: module.lessons?.map((lesson: any) => ({
              title: lesson.title,
              content: lesson.content,
              duration: lesson.duration,
              type: lesson.type,
              videoUrl: lesson.videoUrl,
              quiz: lesson.quiz,
            })) || []
          }));
          setModules(mappedModules);
        } else {
          setModules([]);
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching course data:', error);
        setMessage('Error loading course data');
      } finally {
        setLoading(false);
      }
    }
  };

  // Initialize form data
  useEffect(() => {
    if (!initialized) {
      fetchCourseData();
    }
  }, [initialCourse, mode, initialized]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need admin privileges to create courses.
          </p>
        </div>
      </div>
    );
  }

  if (!initialized || !courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading course data...</p>
        </div>
      </div>
    );
  }

  const handleCourseChange = (field: keyof CourseFormData, value: any) => {
    setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  };

  const addModule = () => {
    setModules(prev => [
      ...prev,
      {
        title: '',
        description: '',
        lessons: [
          {
            title: '',
            content: '',
            duration: 0,
            type: 'text',
          },
        ],
      },
    ]);
  };

  const removeModule = (index: number) => {
    setModules(prev => prev.filter((_, i) => i !== index));
  };

  const updateModule = (index: number, field: keyof ModuleFormData, value: any) => {
    setModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value } : module
    ));
  };

  const addLesson = (moduleIndex: number) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? { 
            ...module, 
            lessons: [
              ...module.lessons,
              { title: '', content: '', duration: 0, type: 'text', videoUrl: '' }
            ]
          }
        : module
    ));
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? { 
            ...module, 
            lessons: module.lessons.filter((_, j) => j !== lessonIndex)
          }
        : module
    ));
  };

  const generateQuizForModule = async (moduleIndex: number) => {
    if (!user) return;
    
    setGeneratingQuiz(moduleIndex);
    try {
      // Collect all module content
      const module = modules[moduleIndex];
      const moduleContent = module.lessons
        .filter(lesson => lesson.type !== 'quiz') // Exclude existing quizzes
        .map(lesson => `# ${lesson.title}\n\n${lesson.content}`)
        .join('\n\n');

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${window.location.origin}/api/ai/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          moduleContent,
          moduleTitle: module.title,
          questionCount: 5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const { data: quiz } = await response.json();

      // Add quiz as the last lesson in the module
      const quizLesson: LessonFormData = {
        title: quiz.title,
        content: '', // Quiz content is stored in the quiz field
        duration: 10, // Default quiz duration
        type: 'quiz',
        videoUrl: '',
        quiz: quiz
      };

      console.log('Adding quiz lesson:', quizLesson);
      console.log('Quiz data:', quiz);

      setModules(prev => prev.map((m, i) => 
        i === moduleIndex 
          ? { 
              ...m, 
              lessons: m.lessons.some(lesson => lesson.type === 'quiz') 
                ? m.lessons.map(lesson => lesson.type === 'quiz' ? quizLesson : lesson)
                : [...m.lessons, quizLesson]
            }
          : m
      ));

      setMessage('Quiz generated successfully!');
    } catch (error) {
      console.error('Error generating quiz:', error);
      setMessage('Failed to generate quiz. Please try again.');
    } finally {
      setGeneratingQuiz(null);
    }
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: keyof LessonFormData, value: any) => {
    setModules(prev => prev.map((module, i) => 
      i === moduleIndex 
        ? { 
            ...module, 
            lessons: module.lessons.map((lesson, j) => 
              j === lessonIndex ? { ...lesson, [field]: value } : lesson
            )
          }
        : module
    ));
  };

  const addTag = () => {
    if (newTag.trim() && courseData && !courseData.tags.includes(newTag.trim())) {
      setCourseData(prev => {
        if (!prev) return null;
        return { ...prev, tags: [...prev.tags, newTag.trim()] };
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) };
    });
  };

  const handleAICourseGenerated = (aiCourse: Partial<Course>) => {
    // Populate form with AI-generated course data
    if (aiCourse.title) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, title: aiCourse.title! };
    });
    if (aiCourse.description) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, description: aiCourse.description! };
    });
    if (aiCourse.category) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, category: aiCourse.category! };
    });
    if (aiCourse.difficulty) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, difficulty: aiCourse.difficulty! };
    });
    if (aiCourse.price !== undefined) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, price: aiCourse.price! };
    });
    if (aiCourse.tags) setCourseData(prev => {
      if (!prev) return null;
      return { ...prev, tags: aiCourse.tags! };
    });
    
    // Convert AI modules to form format
    if (aiCourse.modules) {
      const aiModules: ModuleFormData[] = aiCourse.modules.map(module => ({
        title: module.title,
        description: module.description,
        lessons: module.lessons.map(lesson => ({
          title: lesson.title,
          content: lesson.content,
          duration: lesson.duration,
          type: 'text' as const,
        })),
      }));
      setModules(aiModules);
    }
    
    setShowAIGenerator(false);
  };

  const calculateTotalDuration = () => {
    return modules.reduce((total, module) => 
      total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.duration, 0), 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!courseData.title || !courseData.description || !courseData.category) {
        throw new Error('Please fill in all required fields.');
      }

      if (modules.length === 0) {
        throw new Error('At least one module is required.');
      }

      // Validate modules and lessons
      for (const module of modules) {
        if (!module.title || module.lessons.length === 0) {
          throw new Error('All modules must have a title and at least one lesson.');
        }
        for (const lesson of module.lessons) {
          if (!lesson.title) {
            throw new Error('All lessons must have a title.');
          }
          if (lesson.type === 'video' && !lesson.videoUrl) {
            throw new Error('Video lessons must have a YouTube URL.');
          }
          if (lesson.type === 'text' && !lesson.content) {
            throw new Error('Text lessons must have content.');
          }
          if (lesson.type === 'quiz' && !lesson.quiz) {
            throw new Error('Quiz lessons must have quiz data.');
          }
        }
      }

      // Prepare course data
      const courseToCreate: Omit<Course, 'id'> = {
        ...courseData,
        slug: courseData.title.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: courseData.thumbnail,
        isFree: courseData.price === 0,
        duration: calculateTotalDuration(),
        createdAt: mode === 'edit' && initialCourse ? initialCourse.createdAt : new Date(),
        updatedAt: new Date(),
        authorId: user?.uid,
        authorName: user?.displayName || user?.email,
        modules: [], // Will be set separately
      };

      // Prepare modules data
      const modulesToCreate: Omit<Module, 'id'>[] = modules.map((module, index) => ({
        title: module.title,
        description: module.description,
        order: index + 1,
        lessons: module.lessons.map((lesson, lessonIndex) => {
          let processedContent = lesson.content;
          
          // If it's a video lesson and has a video URL, create a video block
          if (lesson.type === 'video' && lesson.videoUrl) {
            const videoBlock = {
              type: 'video',
              provider: 'youtube',
              url: lesson.videoUrl,
              title: lesson.title,
            };
            const videoBlockHtml = `<video-block data="${encodeURIComponent(JSON.stringify(videoBlock))}"></video-block>`;
            processedContent = videoBlockHtml + (lesson.content ? `\n\n${lesson.content}` : '');
          }
          
          return {
            id: `temp-${Date.now()}-${lessonIndex}`,
            title: lesson.title,
            content: processedContent,
            duration: lesson.duration,
            type: lesson.type,
            order: lessonIndex + 1,
            completedBy: [],
            videoUrl: lesson.videoUrl,
            quiz: lesson.quiz,
          };
        }),
      }));

      if (mode === 'edit' && initialCourse) {
        // Update existing course
        const updateData = {
          ...courseToCreate,
          modules: modulesToCreate,
        };
        console.log('CourseForm - Updating course with data:', updateData);
        console.log('CourseForm - Published status:', updateData.published);
        console.log('CourseForm - Image data:', {
          thumbnail: updateData.thumbnail,
          panelImage: updateData.panelImage,
          imageAttribution: updateData.imageAttribution
        });
        
        console.log('CourseForm - Making API request to:', `/api/courses/${initialCourse.id}`);
        
        // Get the current user's ID token
        const idToken = await firebaseUser?.getIdToken();
        if (!idToken) {
          throw new Error('User not authenticated');
        }
        
        const response = await fetch(`/api/courses/${initialCourse.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(updateData),
        });
        console.log('CourseForm - API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('CourseForm - API error response:', errorText);
          throw new Error(`Failed to update course: ${response.status} ${errorText}`);
        }

        setMessage('Course updated successfully!');
        if (onCourseSaved) {
          onCourseSaved({
            ...courseToCreate,
            id: initialCourse.id,
            modules: modulesToCreate as Module[],
          });
        }
      } else {
        // Create new course
        const courseId = await createCourseWithModules(courseToCreate, modulesToCreate);
        
        setMessage('Course created successfully!');
        
        // Redirect to the new course page
        setTimeout(() => {
          router.push(`/courses/${courseId}`);
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error creating course:', error);
      setMessage(error.message || 'Failed to create course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {mode === 'edit' ? 'Edit Course' : 'Create New Course'}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {mode === 'edit' ? 'Update your course details, modules, and lessons' : 'Build a comprehensive training course with modules and lessons'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              AI Generate Course
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-md text-sm ${
            message.includes('successfully') 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Course Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseData.title}
                  onChange={(e) => handleCourseChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter course title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={courseData.category}
                  onChange={(e) => handleCourseChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="programming">Programming</option>
                  <option value="design">Design</option>
                  <option value="business">Business</option>
                  <option value="marketing">Marketing</option>
                  <option value="finance">Finance</option>
                  <option value="health">Health & Fitness</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={courseData.difficulty}
                  onChange={(e) => handleCourseChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={courseData.price}
                  onChange={(e) => handleCourseChange('price', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={courseData.description}
                  onChange={(e) => handleCourseChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your course..."
                />
              </div>

              <div className="md:col-span-2">
                <ImageSelector
                  onImageSelect={(imageUrl, attribution) => {
                    // Set both panel image and thumbnail to the same image
                    handleCourseChange('panelImage', imageUrl);
                    handleCourseChange('thumbnail', imageUrl);
                    handleCourseChange('imageAttribution', attribution);
                  }}
                  currentImage={courseData.panelImage || courseData.thumbnail}
                  placeholder="Search for course image..."
                  label="Course Image"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This image will be used as both the banner and thumbnail
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={courseData.published}
                  onChange={(e) => handleCourseChange('published', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Publish immediately
                </label>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {courseData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Modules and Lessons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Modules & Lessons
              </h2>
              <button
                type="button"
                onClick={addModule}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </button>
            </div>

            {modules.map((module, moduleIndex) => (
              <div key={moduleIndex} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Module {moduleIndex + 1}
                  </h3>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(moduleIndex)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Module Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={module.title}
                      onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter module title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={module.description}
                      onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief module description"
                    />
                  </div>
                </div>

                {/* Lessons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">
                      Lessons
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => generateQuizForModule(moduleIndex)}
                        disabled={generatingQuiz === moduleIndex || module.lessons.length === 0}
                        className="inline-flex items-center px-3 py-1 text-sm border border-purple-300 dark:border-purple-600 rounded-md text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingQuiz === moduleIndex ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <HelpCircle className="h-3 w-3 mr-1" />
                        )}
                        {generatingQuiz === moduleIndex ? 'Generating...' : 'Generate Quiz'}
                      </button>
                      <button
                        type="button"
                        onClick={() => addLesson(moduleIndex)}
                        className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Lesson
                      </button>
                    </div>
                  </div>

                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={lessonIndex} className="border border-gray-200 dark:border-gray-600 rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                          Lesson {lessonIndex + 1}
                        </h5>
                        {module.lessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLesson(moduleIndex, lessonIndex)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={lesson.title}
                            onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'title', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Lesson title"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Duration (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={lesson.duration}
                            onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'duration', parseInt(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Type
                          </label>
                          <select
                            value={lesson.type}
                            onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'type', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="video">Video</option>
                            <option value="quiz">Quiz</option>
                          </select>
                        </div>
                      </div>

                      {/* Video URL field - only show for video lessons */}
                      {lesson.type === 'video' && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            YouTube Video URL *
                          </label>
                          <input
                            type="url"
                            required
                            value={lesson.videoUrl || ''}
                            onChange={(e) => updateLesson(moduleIndex, lessonIndex, 'videoUrl', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Paste any YouTube URL (watch, youtu.be, or embed format)
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Content *
                        </label>
                        {lesson.type === 'quiz' ? (
                          <div className="space-y-4">
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                This is a quiz lesson. The quiz content is automatically generated and managed.
                              </p>
                              {lesson.quiz && (
                                <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                                  Quiz: {lesson.quiz.title} ({lesson.quiz.questions.length} questions)
                                </div>
                              )}
                            </div>
                            
                            {lesson.quiz && lesson.quiz.questions && (
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quiz Questions Preview:</h4>
                                {lesson.quiz.questions.map((question, qIndex) => (
                                  <div key={qIndex} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Question {qIndex + 1} ({question.kind.toUpperCase()})
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-900 dark:text-white mb-2">
                                      {question.kind === 'match' 
                                        ? `Match the items on the left with the items on the right`
                                        : question.text
                                      }
                                    </p>
                                    
                                    {question.kind === 'mcq' && (
                                      <div className="space-y-1">
                                        {question.options.map((option, oIndex) => (
                                          <div key={oIndex} className="flex items-center text-xs">
                                            <span className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                                              question.correct.includes(oIndex) 
                                                ? 'bg-green-100 border-green-500 text-green-700' 
                                                : 'border-gray-300'
                                            }`}>
                                              {question.correct.includes(oIndex) && '✓'}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">{option}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {question.kind === 'truefalse' && (
                                      <div className="text-xs">
                                        <span className={`px-2 py-1 rounded ${
                                          question.correct 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                          {question.correct ? 'True' : 'False'}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {question.kind === 'short' && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <p>Acceptable answers:</p>
                                        <ul className="list-disc list-inside mt-1">
                                          {question.answers.map((answer, aIndex) => (
                                            <li key={aIndex}>{answer}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {question.kind === 'match' && (
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Terms:</p>
                                          <ul className="space-y-1">
                                            {question.left.map((term, tIndex) => (
                                              <li key={tIndex} className="text-gray-600 dark:text-gray-400">{term}</li>
                                            ))}
                                          </ul>
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Definitions:</p>
                                          <ul className="space-y-1">
                                            {question.right.map((def, dIndex) => (
                                              <li key={dIndex} className="text-gray-600 dark:text-gray-400">{def}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <RichTextEditor
                            value={lesson.content}
                            onChange={(content) => updateLesson(moduleIndex, lessonIndex, 'content', content)}
                            placeholder="Enter lesson content..."
                            height={200}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Course Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Course Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Total Modules:</span> {modules.length}
                </div>
                <div>
                  <span className="font-medium">Total Lessons:</span> {modules.reduce((total, module) => total + module.lessons.length, 0)}
                </div>
                <div>
                  <span className="font-medium">Total Duration:</span> {calculateTotalDuration()} min
                </div>
                <div>
                  <span className="font-medium">Price:</span> ${courseData.price}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {loading ? (mode === 'edit' ? 'Saving Course...' : 'Creating Course...') : (mode === 'edit' ? 'Save Course' : 'Create Course')}
            </button>
          </div>
        </form>

        {/* AI Course Generator Modal */}
        {showAIGenerator && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-transparent max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <AICourseGenerator
                onCourseGenerated={handleAICourseGenerated}
                onClose={() => setShowAIGenerator(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
