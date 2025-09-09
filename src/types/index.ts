// User roles and authentication
export type UserRole = 'admin' | 'paidUser' | 'freeUser';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  enrolledCourses: string[];
  completedCourses: string[];
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled';
  subscriptionExpiry?: Date;
}

// Course structure
export interface Course {
  id: string;
  title: string;
  description: string;
  slug: string;
  imageUrl?: string;
  thumbnail?: string;
  panelImage?: string;
  imageAttribution?: string;
  price: number;
  isFree: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  modules: Module[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // Markdown or rich text
  order: number;
  duration: number; // in minutes
  type: 'video' | 'text' | 'quiz';
  videoUrl?: string;
  attachments?: string[];
  quiz?: QuizBlock; // Updated to use QuizBlock instead of QuizQuestion[]
  completedBy: string[]; // user IDs
}

// New QuizBlock structure as per design
export interface QuizBlock {
  type: "quiz";
  title: string;
  description?: string;
  questions: Question[];
}

export type Question =
  | { kind: "mcq"; text: string; options: string[]; correct: number[] }
  | { kind: "msq"; text: string; options: string[]; correct: number[] }
  | { kind: "truefalse"; text: string; correct: boolean }
  | { kind: "short"; text: string; answers: string[] }
  | { kind: "match"; left: string[]; right: string[]; correctPairs: [number, number][] };

// Keep legacy QuizQuestion for backward compatibility
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'text';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
}

// Content blocks for lesson content
export interface VideoBlock {
  type: 'video';
  provider: 'youtube';
  url: string;
  title?: string;
  start?: number;
}

export type ContentBlock = VideoBlock;

// Payment and subscription
export interface Payment {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'inactive' | 'cancelled';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

// AI content generation
export interface AIContentRequest {
  id: string;
  userId: string;
  prompt: string;
  contentType: 'course-outline' | 'lesson-content' | 'quiz-questions';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  createdAt: Date;
  completedAt?: Date;
}

// Progress tracking
export interface UserProgress {
  userId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  timeSpent: number; // in seconds
  lastAccessed: Date;
}

// Search and filtering
export interface CourseFilters {
  category?: string;
  difficulty?: string;
  priceRange?: 'free' | 'paid' | 'all';
  duration?: 'short' | 'medium' | 'long';
  tags?: string[];
}

// API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
