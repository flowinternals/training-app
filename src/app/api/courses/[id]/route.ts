import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { cleanupDeletedCourse } from '@/lib/course-cleanup';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Get course from Firestore
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data();
    console.log('API - Course document data:', courseData);
    
    // Get modules for this course (single query)
    const modulesSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').orderBy('order').get();
    console.log('API - Modules snapshot size:', modulesSnapshot.size);
    
    // Batch all lesson queries to reduce database calls
    const modulePromises = modulesSnapshot.docs.map(async (moduleDoc) => {
      const moduleData = moduleDoc.data();
      
      // Get lessons for this module (single query per module)
      const lessonsSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleDoc.id).collection('lessons').orderBy('order').get();
      
      // Process lessons and fetch quiz data for quiz lessons
      const lessons = await Promise.all(lessonsSnapshot.docs.map(async (lessonDoc) => {
        const lessonData = lessonDoc.data();
        
        // If this is a quiz lesson, fetch quiz data from subcollection
        if (lessonData.type === 'quiz') {
          try {
            const quizSnapshot = await adminDb.collection('courses').doc(courseId)
              .collection('modules').doc(moduleDoc.id)
              .collection('lessons').doc(lessonDoc.id)
              .collection('quiz').doc('data').get();
            
            if (quizSnapshot.exists) {
              lessonData.quiz = quizSnapshot.data();
              console.log('API - Loaded quiz data for lesson:', lessonData.title);
            }
          } catch (quizError) {
            console.warn('API - Error loading quiz data for lesson:', lessonData.title, quizError);
          }
        }
        
        return {
          ...lessonData,
          id: lessonDoc.id,
        };
      }));
      
      return {
        ...moduleData,
        id: moduleDoc.id,
        lessons
      };
    });
    
    const modules = await Promise.all(modulePromises);
    
    const course = {
      id: courseDoc.id,
      ...courseData,
      modules
    };

    console.log('API - Course data being returned:', {
      id: course.id,
      title: (course as any).title,
      modulesCount: course.modules?.length || 0,
      modules: course.modules?.map((m: any) => ({
        title: m.title,
        lessonsCount: m.lessons?.length || 0
      }))
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let courseData: any;
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    courseData = await request.json();
    
    // Data integrity validation before any destructive operations
    if (!courseData || typeof courseData !== 'object') {
      return NextResponse.json({ error: 'Invalid course data provided' }, { status: 400 });
    }
    
    // Validate required fields
    if (courseData.title && typeof courseData.title !== 'string') {
      return NextResponse.json({ error: 'Course title must be a string' }, { status: 400 });
    }
    
    if (courseData.price !== undefined && (typeof courseData.price !== 'number' || courseData.price < 0)) {
      return NextResponse.json({ error: 'Course price must be a non-negative number' }, { status: 400 });
    }
    
    if (courseData.published !== undefined && typeof courseData.published !== 'boolean') {
      return NextResponse.json({ error: 'Published status must be a boolean' }, { status: 400 });
    }
    
    // Validate modules structure if provided
    if (courseData.modules && Array.isArray(courseData.modules)) {
      for (const [moduleIndex, module] of courseData.modules.entries()) {
        if (!module || typeof module !== 'object') {
          return NextResponse.json({ error: `Invalid module at index ${moduleIndex}` }, { status: 400 });
        }
        if (module.title && typeof module.title !== 'string') {
          return NextResponse.json({ error: `Module title at index ${moduleIndex} must be a string` }, { status: 400 });
        }
        if (module.lessons && Array.isArray(module.lessons)) {
          for (const [lessonIndex, lesson] of module.lessons.entries()) {
            if (!lesson || typeof lesson !== 'object') {
              return NextResponse.json({ error: `Invalid lesson at module ${moduleIndex}, lesson ${lessonIndex}` }, { status: 400 });
            }
            if (lesson.title && typeof lesson.title !== 'string') {
              return NextResponse.json({ error: `Lesson title at module ${moduleIndex}, lesson ${lessonIndex} must be a string` }, { status: 400 });
            }
            if (lesson.duration !== undefined && (typeof lesson.duration !== 'number' || lesson.duration < 0)) {
              return NextResponse.json({ error: `Lesson duration at module ${moduleIndex}, lesson ${lessonIndex} must be a non-negative number` }, { status: 400 });
            }
          }
        }
      }
    }
    
    const logData = {
      timestamp: new Date().toISOString(),
      action: 'course_update',
      courseId: courseId,
      data: courseData,
      published: courseData.published,
      imageData: {
        thumbnail: courseData.thumbnail,
        panelImage: courseData.panelImage,
        imageAttribution: courseData.imageAttribution
      }
    };
    
    // Write to log file
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'api-logs.json');
    const existingLogs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
    existingLogs.push(logData);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    
    console.log('API - Received course update data:', courseData);
    console.log('API - Published status received:', courseData.published);
    console.log('API - Image data received:', {
      thumbnail: courseData.thumbnail,
      panelImage: courseData.panelImage,
      imageAttribution: courseData.imageAttribution
    });
    
    // Remove the id and modules fields if they exist in the request body
    const { id, modules, ...updateData } = courseData;
    console.log('API - Processed update data:', updateData);
    
    // Convert Date objects to strings for Firestore
    const processedUpdateData = {
      ...updateData,
      updatedAt: new Date().toISOString(),
      createdAt: updateData.createdAt ? (updateData.createdAt instanceof Date ? updateData.createdAt.toISOString() : updateData.createdAt) : undefined,
    };
    console.log('API - Final data being written to database:', processedUpdateData);

    // Update course in Firestore (excluding modules)
    await adminDb.collection('courses').doc(courseId).update(processedUpdateData);
    console.log('API - Course updated successfully in database');

    // Handle modules and lessons if provided
    if (modules && Array.isArray(modules)) {
      console.log('API - Processing modules:', modules);
      console.log('API - Looking for quiz lessons...');
      modules.forEach((module, moduleIndex) => {
        if (module.lessons) {
          module.lessons.forEach((lesson: any, lessonIndex: number) => {
            if (lesson.type === 'quiz') {
              console.log(`API - Found quiz lesson in module ${moduleIndex}, lesson ${lessonIndex}:`, lesson);
              console.log('API - Quiz data:', lesson.quiz);
            }
          });
        }
      });
      
      // Get existing modules and lessons for comparison (outside batch)
      const existingModulesSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').get();
      const existingModules = new Map();
      
      // Build map of existing modules by order
      for (const moduleDoc of existingModulesSnapshot.docs) {
        const moduleData = moduleDoc.data();
        existingModules.set(moduleData.order, {
          id: moduleDoc.id,
          data: moduleData
        });
      }
      
      // Get all existing lessons for all modules (outside batch)
      const existingLessonsMap = new Map();
      for (const moduleDoc of existingModulesSnapshot.docs) {
        const moduleData = moduleDoc.data();
        const lessonsSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleDoc.id).collection('lessons').get();
        const moduleLessons = new Map();
        for (const lessonDoc of lessonsSnapshot.docs) {
          const lessonData = lessonDoc.data();
          moduleLessons.set(lessonData.order, {
            id: lessonDoc.id,
            data: lessonData
          });
        }
        existingLessonsMap.set(moduleData.order, moduleLessons);
      }
      
      // Single atomic batch for all operations
      const atomicBatch = adminDb.batch();
      
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleOrder = moduleIndex + 1;
        const existingModule = existingModules.get(moduleOrder);
        
        let moduleRef;
        if (existingModule) {
          // Update existing module
          moduleRef = adminDb.collection('courses').doc(courseId).collection('modules').doc(existingModule.id);
          atomicBatch.update(moduleRef, {
            title: module.title || '',
            description: module.description || '',
            order: moduleOrder,
          });
        } else {
          // Create new module
          moduleRef = adminDb.collection('courses').doc(courseId).collection('modules').doc();
          atomicBatch.set(moduleRef, {
            title: module.title || '',
            description: module.description || '',
            order: moduleOrder,
          });
        }
        
        if (module.lessons && Array.isArray(module.lessons)) {
          // Get existing lessons for this module (from pre-fetched data)
          const existingLessons = existingLessonsMap.get(moduleOrder) || new Map();
          
          for (const [lessonIndex, lesson] of (module.lessons as any[]).entries()) {
            const lessonOrder = lessonIndex + 1;
            const existingLesson = existingLessons.get(lessonOrder);
            
            let lessonRef;
            if (existingLesson) {
              // Update existing lesson
              lessonRef = adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleRef.id).collection('lessons').doc(existingLesson.id);
            } else {
              // Create new lesson
              lessonRef = adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleRef.id).collection('lessons').doc();
            }
            
            const lessonData: any = {
              title: lesson.title || '',
              content: lesson.content || '',
              duration: lesson.duration || 0,
              type: lesson.type || 'text',
              order: lessonOrder,
              completedBy: lesson.completedBy || [],
            };
            
            // Only include videoUrl if it's defined and not empty
            if (lesson.videoUrl && lesson.videoUrl.trim() !== '') {
              lessonData.videoUrl = lesson.videoUrl;
            }
            
            if (existingLesson) {
              atomicBatch.update(lessonRef, lessonData);
            } else {
              atomicBatch.set(lessonRef, lessonData);
            }
            
            // If this is a quiz lesson, save quiz data in a subcollection
            if (lesson.quiz) {
              console.log('API - Saving quiz data in subcollection for lesson:', lesson.title);
              const quizRef = adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleRef.id).collection('lessons').doc(lessonRef.id).collection('quiz').doc('data');
              
              // Convert quiz data to Firestore-compatible format
              const quizData = {
                type: lesson.quiz.type,
                title: lesson.quiz.title,
                description: lesson.quiz.description,
                questions: lesson.quiz.questions
                  .map((q: any) => {
                    // Skip questions with missing required fields
                    // For match questions, check for left/right instead of text
                    const hasRequiredFields = q.kind && (
                      (q.kind === 'match' && q.left && q.right) ||
                      (q.kind !== 'match' && q.text && q.text !== undefined)
                    );
                    
                    if (!hasRequiredFields) {
                      console.warn('API - Skipping question with missing required fields:', q);
                      return null;
                    }
                    
                    const question: any = {
                      kind: q.kind,
                      text: q.text,
                      options: q.options || [],
                      correct: q.correct || [],
                      answers: q.answers || [],
                      left: q.left || [],
                      right: q.right || []
                    };
                    
                    // Convert correctPairs nested arrays to strings for Firestore
                    if (q.correctPairs && Array.isArray(q.correctPairs)) {
                      question.correctPairs = q.correctPairs.map((pair: any) => 
                        Array.isArray(pair) ? pair.join(',') : pair
                      );
                    }
                    
                    // Remove any undefined values
                    Object.keys(question).forEach(key => {
                      if (question[key] === undefined) {
                        delete question[key];
                      }
                    });
                    
                    return question;
                  })
                  .filter((q: any) => q !== null) // Remove null entries
              };
              
              atomicBatch.set(quizRef, quizData);
            }
          }
        }
      }
      
      // Commit the atomic batch with error handling
      try {
        await atomicBatch.commit();
        console.log('API - Course modules and lessons updated successfully in atomic batch');
      } catch (batchError) {
        console.error('API - Atomic batch commit failed:', batchError);
        throw new Error('Failed to update course modules and lessons atomically');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating course:', error);
    console.error('Course data received:', courseData);
    return NextResponse.json(
      { error: 'Failed to update course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('API - DELETE request received');
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      console.log('API - DELETE authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    console.log('API - DELETE course ID:', courseId);
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Data integrity validation - check if course exists before deletion
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Log the deletion operation for audit trail
    const courseData = courseDoc.data();
    const logData = {
      timestamp: new Date().toISOString(),
      action: 'course_delete',
      courseId: courseId,
      courseTitle: courseData?.title || 'Unknown',
      deletedBy: authResult.user?.uid || 'Unknown'
    };
    
    // Write to log file
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'api-logs.json');
    const existingLogs = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
    existingLogs.push(logData);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));

    // Delete course from Firestore
    console.log('API - Deleting course from database:', courseId);
    await adminDb.collection('courses').doc(courseId).delete();
    console.log('API - Course deleted successfully');

    // Clean up all related data
    console.log('API - Starting comprehensive cleanup for deleted course');
    const cleanupResult = await cleanupDeletedCourse(courseId);
    
    if (!cleanupResult.success) {
      console.warn('API - Course cleanup completed with errors:', cleanupResult.errors);
    } else {
      console.log('API - Course cleanup completed successfully:', cleanupResult.deletedRecords);
    }

    return NextResponse.json({ 
      success: true, 
      cleanup: cleanupResult,
      message: `Course deleted and ${cleanupResult.deletedRecords.userProgress} progress records cleaned up`
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
