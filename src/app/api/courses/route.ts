import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('API - GET /api/courses - Fetching courses (optimized)');
    
    // Get all courses from Firestore (single query)
    const coursesSnapshot = await adminDb.collection('courses').get();
    
    // For course list, we only need basic course data - no modules/lessons
    // This reduces database calls from 50+ to just 1!
    const courses = coursesSnapshot.docs.map(courseDoc => ({
      id: courseDoc.id,
      ...courseDoc.data()
    }));
    
    console.log('API - GET /api/courses - Returning', courses.length, 'courses (basic data only)');
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let courseData: any;
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    courseData = await request.json();
    
    // Remove the id and modules fields if they exist in the request body
    const { id, modules, ...createData } = courseData;
    
    // Convert Date objects to strings for Firestore
    const processedCreateData = {
      ...createData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create course in Firestore
    const courseRef = adminDb.collection('courses').doc();
    await courseRef.set(processedCreateData);

    // Handle modules and lessons if provided
    if (modules && Array.isArray(modules)) {
      const batch = adminDb.batch();
      
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleRef = adminDb.collection('courses').doc(courseRef.id).collection('modules').doc();
        
        batch.set(moduleRef, {
          title: module.title || '',
          description: module.description || '',
          order: moduleIndex + 1,
        });
        
        if (module.lessons && Array.isArray(module.lessons)) {
          for (const [lessonIndex, lesson] of module.lessons.entries()) {
            const lessonRef = adminDb.collection('courses').doc(courseRef.id).collection('modules').doc(moduleRef.id).collection('lessons').doc();
            
            const lessonData: any = {
              title: lesson.title || '',
              content: lesson.content || '',
              duration: lesson.duration || 0,
              type: lesson.type || 'text',
              order: lessonIndex + 1,
              completedBy: lesson.completedBy || [],
            };
            
            // Only include videoUrl if it's defined and not empty
            if (lesson.videoUrl && lesson.videoUrl.trim() !== '') {
              lessonData.videoUrl = lesson.videoUrl;
            }
            
            batch.set(lessonRef, lessonData);
          }
        }
      }
      
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      courseId: courseRef.id,
      message: 'Course created successfully'
    });

  } catch (error) {
    console.error('Error creating course:', error);
    console.error('Course data received:', courseData);
    return NextResponse.json(
      { error: 'Failed to create course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
