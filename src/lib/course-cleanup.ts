import { adminDb } from './firebase-admin';

export interface CourseCleanupResult {
  success: boolean;
  courseId: string;
  deletedRecords: {
    userProgress: number;
    enrolledUsers: number;
    modules: number;
    lessons: number;
    quizData: number;
  };
  errors: string[];
}

/**
 * Comprehensive cleanup function to remove all traces of a deleted course
 */
export async function cleanupDeletedCourse(courseId: string): Promise<CourseCleanupResult> {
  const result: CourseCleanupResult = {
    success: true,
    courseId,
    deletedRecords: {
      userProgress: 0,
      enrolledUsers: 0,
      modules: 0,
      lessons: 0,
      quizData: 0
    },
    errors: []
  };

  try {
    console.log(`Starting cleanup for deleted course: ${courseId}`);

    // 1. Remove all user progress records for this course
    try {
      const progressSnapshot = await adminDb.collection('userProgress')
        .where('courseId', '==', courseId)
        .get();
      
      if (!progressSnapshot.empty) {
        const batch = adminDb.batch();
        progressSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        result.deletedRecords.userProgress = progressSnapshot.size;
        console.log(`Deleted ${progressSnapshot.size} user progress records`);
      }
    } catch (error) {
      const errorMsg = `Error deleting user progress: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    // 2. Remove course from all users' enrolledCourses arrays
    try {
      const usersSnapshot = await adminDb.collection('users').get();
      const enrolledUsers = usersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        return userData.enrolledCourses && userData.enrolledCourses.includes(courseId);
      });

      if (enrolledUsers.length > 0) {
        const batch = adminDb.batch();
        enrolledUsers.forEach(userDoc => {
          const userData = userDoc.data();
          const updatedEnrolledCourses = userData.enrolledCourses.filter((id: string) => id !== courseId);
          batch.update(userDoc.ref, { enrolledCourses: updatedEnrolledCourses });
        });
        await batch.commit();
        result.deletedRecords.enrolledUsers = enrolledUsers.length;
        console.log(`Removed course from ${enrolledUsers.length} users' enrolled courses`);
      }
    } catch (error) {
      const errorMsg = `Error updating enrolled courses: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    // 3. Delete all modules and their subcollections
    try {
      const modulesSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').get();
      
      if (!modulesSnapshot.empty) {
        const batch = adminDb.batch();
        
        for (const moduleDoc of modulesSnapshot.docs) {
          // Delete all lessons in this module
          const lessonsSnapshot = await adminDb.collection('courses').doc(courseId)
            .collection('modules').doc(moduleDoc.id).collection('lessons').get();
          
          for (const lessonDoc of lessonsSnapshot.docs) {
            // Delete quiz data if it exists
            const quizSnapshot = await adminDb.collection('courses').doc(courseId)
              .collection('modules').doc(moduleDoc.id)
              .collection('lessons').doc(lessonDoc.id)
              .collection('quiz').get();
            
            quizSnapshot.docs.forEach(quizDoc => {
              batch.delete(quizDoc.ref);
            });
            result.deletedRecords.quizData += quizSnapshot.size;
            
            // Delete the lesson
            batch.delete(lessonDoc.ref);
            result.deletedRecords.lessons++;
          }
          
          // Delete the module
          batch.delete(moduleDoc.ref);
          result.deletedRecords.modules++;
        }
        
        await batch.commit();
        console.log(`Deleted ${result.deletedRecords.modules} modules, ${result.deletedRecords.lessons} lessons, ${result.deletedRecords.quizData} quiz records`);
      }
    } catch (error) {
      const errorMsg = `Error deleting modules/lessons: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }

    // 4. Log the cleanup operation
    try {
      const cleanupLog = {
        timestamp: new Date().toISOString(),
        action: 'course_cleanup',
        courseId: courseId,
        deletedRecords: result.deletedRecords,
        errors: result.errors
      };
      
      const fs = require('fs');
      const path = require('path');
      const logFile = path.join(process.cwd(), 'api-logs.json');
      const existingLogs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
      existingLogs.push(cleanupLog);
      fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    } catch (error) {
      console.error('Error logging cleanup operation:', error);
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`Course cleanup completed for ${courseId}:`, result);
    return result;

  } catch (error) {
    const errorMsg = `Critical error during course cleanup: ${error}`;
    console.error(errorMsg);
    result.success = false;
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Cleanup orphaned progress records for courses that no longer exist
 */
export async function cleanupOrphanedProgress(): Promise<{ cleaned: number; errors: string[] }> {
  const result = { cleaned: 0, errors: [] };
  
  try {
    console.log('Starting orphaned progress cleanup...');
    
    // Get all progress records
    const progressSnapshot = await adminDb.collection('userProgress').get();
    
    // Get all existing course IDs
    const coursesSnapshot = await adminDb.collection('courses').get();
    const existingCourseIds = new Set(coursesSnapshot.docs.map(doc => doc.id));
    
    // Find orphaned progress records
    const orphanedProgress = progressSnapshot.docs.filter(doc => {
      const progressData = doc.data();
      return !existingCourseIds.has(progressData.courseId);
    });
    
    if (orphanedProgress.length > 0) {
      const batch = adminDb.batch();
      orphanedProgress.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      result.cleaned = orphanedProgress.length;
      console.log(`Cleaned up ${orphanedProgress.length} orphaned progress records`);
    }
    
  } catch (error) {
    const errorMsg = `Error cleaning orphaned progress: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
}
