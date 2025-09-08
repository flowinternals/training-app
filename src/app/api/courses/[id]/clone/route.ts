import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    console.log('Clone API - Auth result:', authResult);
    if (!authResult.success) {
      console.log('Clone API - Authentication failed:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const courseId = resolvedParams.id;
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Get the original course
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data();
    
    // Get modules for the original course
    const modulesSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').orderBy('order').get();
    const modules = await Promise.all(
      modulesSnapshot.docs.map(async (moduleDoc) => {
        const moduleData = moduleDoc.data();
        
        // Get lessons for this module
        const lessonsSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleDoc.id).collection('lessons').orderBy('order').get();
        const lessons = lessonsSnapshot.docs.map(lessonDoc => ({
          ...lessonDoc.data(),
          id: lessonDoc.id,
        }));
        
        return {
          ...moduleData,
          id: moduleDoc.id,
          lessons
        };
      })
    );

    // Create the cloned course data
    const clonedCourseData = {
      ...courseData,
      title: `${courseData.title} (Copy)`,
      slug: `${courseData.slug}-copy-${Date.now()}`,
      published: false, // Always start as draft
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove the original ID
    delete clonedCourseData.id;

    // Create the new course
    const newCourseRef = adminDb.collection('courses').doc();
    await newCourseRef.set(clonedCourseData);

    // Clone modules and lessons
    if (modules && modules.length > 0) {
      const batch = adminDb.batch();
      
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleRef = adminDb.collection('courses').doc(newCourseRef.id).collection('modules').doc();
        batch.set(moduleRef, {
          title: module.title,
          description: module.description,
          order: moduleIndex + 1,
        });
        
        if (module.lessons && module.lessons.length > 0) {
          for (const [lessonIndex, lesson] of module.lessons.entries()) {
            const lessonRef = adminDb.collection('courses').doc(newCourseRef.id).collection('modules').doc(moduleRef.id).collection('lessons').doc();
            batch.set(lessonRef, {
              title: lesson.title,
              content: lesson.content,
              duration: lesson.duration,
              type: lesson.type || 'text',
              order: lessonIndex + 1,
              completedBy: [], // Reset completed users
            });
          }
        }
      }
      
      await batch.commit();
    }

    console.log('Clone API - Successfully cloned course:', newCourseRef.id);
    
    // Log the clone operation to file
    const logData = {
      timestamp: new Date().toISOString(),
      action: 'course_clone',
      originalCourseId: courseId,
      newCourseId: newCourseRef.id,
      courseData: clonedCourseData,
      modulesCount: modules.length,
      totalLessons: modules.reduce((total, module) => total + (module.lessons?.length || 0), 0),
      lessonsWithImages: modules.flatMap(module => 
        (module.lessons || []).filter(lesson => 
          lesson.content && lesson.content.includes('<img')
        )
      ).length
    };
    
    try {
      const logFilePath = path.join(process.cwd(), 'api-logs.json');
      let existingLogs = [];
      
      if (fs.existsSync(logFilePath)) {
        const fileContent = fs.readFileSync(logFilePath, 'utf8');
        existingLogs = JSON.parse(fileContent);
      }
      
      existingLogs.push(logData);
      fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2));
    } catch (logError) {
      console.error('Failed to write clone log:', logError);
    }
    
    return NextResponse.json({ 
      success: true, 
      courseId: newCourseRef.id,
      message: 'Course cloned successfully'
    });

  } catch (error) {
    console.error('Error cloning course:', error);
    return NextResponse.json(
      { error: 'Failed to clone course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
