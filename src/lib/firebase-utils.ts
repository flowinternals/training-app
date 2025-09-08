import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Course, Module, Lesson, UserProgress } from '@/types';

// Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Convert Date to Firestore Timestamp
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// User utilities
export const createUser = async (userData: Omit<User, 'uid'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'users'), {
    ...userData,
    createdAt: dateToTimestamp(new Date()),
    updatedAt: dateToTimestamp(new Date()),
  });
  return docRef.id;
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      ...data,
      uid: userDoc.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as User;
  }
  return null;
};

export const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: dateToTimestamp(new Date()),
  });
};

export async function createUserWithGoogle(googleUser: any): Promise<string> {
  try {
    const userData: Omit<User, 'id'> = {
      uid: googleUser.uid,
      email: googleUser.email,
      displayName: googleUser.displayName || '',
      photoURL: googleUser.photoURL || '',
      role: 'user',
      isPaidUser: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      enrolledCourses: [],
      completedCourses: [],
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    };

    await setDoc(doc(db, 'users', googleUser.uid), userData);
    return googleUser.uid;
  } catch (error) {
    console.error('Error creating user with Google:', error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<any> {
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const { auth } = await import('./firebase');
    
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Force account selection popup every time
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

// Course utilities
export const getPublishedCourses = async (limitCount: number = 10): Promise<Course[]> => {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('published', '==', true),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  })) as Course[];
};

// Get all courses (for admin use)
export const getAllCourses = async (limitCount: number = 50): Promise<Course[]> => {
  console.log('getAllCourses - Querying Firebase for courses...');
  
  // First try with orderBy, if that fails, get all without ordering
  let snapshot;
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    snapshot = await getDocs(coursesQuery);
    console.log('getAllCourses - Query with orderBy returned', snapshot.docs.length, 'courses');
  } catch (error) {
    console.log('getAllCourses - OrderBy query failed, trying without ordering:', error);
    // Fallback: get all courses without ordering
    const coursesQuery = query(
      collection(db, 'courses'),
      limit(limitCount)
    );
    snapshot = await getDocs(coursesQuery);
    console.log('getAllCourses - Query without orderBy returned', snapshot.docs.length, 'courses');
  }
  
  console.log('getAllCourses - Document IDs:', snapshot.docs.map(doc => doc.id));
  
  const courses = snapshot.docs.map(doc => {
    const data = doc.data();
    console.log('getAllCourses - Course data for', doc.id, ':', data);
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : new Date(),
    };
  }) as Course[];
  
  console.log('getAllCourses - Processed courses:', courses);
  return courses;
};

export const getCoursesByCategory = async (category: string): Promise<Course[]> => {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('published', '==', true),
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(coursesQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  })) as Course[];
};

export const getCourse = async (courseId: string): Promise<Course | null> => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (courseDoc.exists()) {
    const data = courseDoc.data();
    return {
      ...data,
      id: courseDoc.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Course;
  }
  return null;
};

// Progress utilities
export const getUserProgress = async (userId: string, courseId: string): Promise<UserProgress[]> => {
  const progressQuery = query(
    collection(db, 'userProgress'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  
  const snapshot = await getDocs(progressQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    lastAccessed: timestampToDate(doc.data().lastAccessed),
    completedAt: doc.data().completedAt ? timestampToDate(doc.data().completedAt) : undefined,
  })) as UserProgress[];
};

export const updateProgress = async (progress: Omit<UserProgress, 'lastAccessed'>): Promise<void> => {
  const progressRef = doc(db, 'userProgress', `${progress.userId}_${progress.courseId}_${progress.moduleId}_${progress.lessonId}`);
  await updateDoc(progressRef, {
    ...progress,
    lastAccessed: dateToTimestamp(new Date()),
    completedAt: progress.completed ? dateToTimestamp(new Date()) : undefined,
  });
};

// Batch operations
export const createCourseWithModules = async (courseData: Omit<Course, 'id'>, modules: Omit<Module, 'id'>[]): Promise<string> => {
  const batch = writeBatch(db);
  
  // Create course
  const courseRef = doc(collection(db, 'courses'));
  const courseToSave = {
    ...courseData,
    createdAt: dateToTimestamp(new Date()),
    updatedAt: dateToTimestamp(new Date()),
  };
  console.log('createCourseWithModules - Saving course data:', courseToSave);
  console.log('createCourseWithModules - Image fields:', {
    thumbnail: courseToSave.thumbnail,
    panelImage: courseToSave.panelImage,
    imageAttribution: courseToSave.imageAttribution,
    published: courseToSave.published
  });
  batch.set(courseRef, courseToSave);
  
  // Create modules and lessons
  modules.forEach((module, moduleIndex) => {
    const moduleRef = doc(collection(db, 'courses', courseRef.id, 'modules'));
    batch.set(moduleRef, {
      ...module,
      order: moduleIndex + 1,
    });
    
    if (module.lessons) {
      module.lessons.forEach((lesson, lessonIndex) => {
        const lessonRef = doc(collection(db, 'courses', courseRef.id, 'modules', moduleRef.id, 'lessons'));
        batch.set(lessonRef, {
          ...lesson,
          order: lessonIndex + 1,
        });
      });
    }
  });
  
  try {
    await batch.commit();
    console.log('createCourseWithModules - Batch committed successfully, course ID:', courseRef.id);
    return courseRef.id;
  } catch (error) {
    console.error('createCourseWithModules - Batch commit failed:', error);
    throw new Error(`Failed to save course: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get single course by ID
export const getCourseById = async (courseId: string): Promise<Course> => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  
  if (!courseDoc.exists()) {
    throw new Error('Course not found');
  }
  
  const courseData = courseDoc.data();
  console.log('getCourseById - Raw course data:', courseData);
  console.log('getCourseById - imageAttribution:', courseData.imageAttribution);
  console.log('getCourseById - thumbnail:', courseData.thumbnail);
  console.log('getCourseById - panelImage:', courseData.panelImage);
  console.log('getCourseById - published:', courseData.published);
  
  // Get modules for this course
  const modulesSnapshot = await getDocs(collection(db, 'courses', courseId, 'modules'));
  console.log('getCourseById - Found modules:', modulesSnapshot.docs.length);
  console.log('getCourseById - Module docs:', modulesSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
  console.log('getCourseById - Course ID:', courseId);
  console.log('getCourseById - Collection path:', `courses/${courseId}/modules`);
  
  const modules = await Promise.all(
    modulesSnapshot.docs.map(async (moduleDoc) => {
      const moduleData = moduleDoc.data();
      console.log('getCourseById - Processing module:', moduleDoc.id, moduleData);
      
      // Get lessons for this module
      const lessonsSnapshot = await getDocs(collection(db, 'courses', courseId, 'modules', moduleDoc.id, 'lessons'));
      console.log('getCourseById - Found lessons for module', moduleDoc.id, ':', lessonsSnapshot.docs.length);
      
      const lessons = lessonsSnapshot.docs.map(lessonDoc => ({
        ...lessonDoc.data(),
        id: lessonDoc.id,
      })) as Lesson[];
      
      return {
        ...moduleData,
        id: moduleDoc.id,
        lessons: lessons.sort((a, b) => (a.order || 0) - (b.order || 0)),
      };
    })
  );
  
  return {
    ...courseData,
    id: courseDoc.id,
    createdAt: timestampToDate(courseData.createdAt),
    updatedAt: timestampToDate(courseData.updatedAt),
    modules: modules.sort((a, b) => (a.order || 0) - (b.order || 0)),
  } as Course;
};