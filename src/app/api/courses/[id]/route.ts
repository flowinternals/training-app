import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get course from Firestore
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseData = courseDoc.data();
    
    // Get modules for this course
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
    
    const course = {
      id: courseDoc.id,
      ...courseData,
      modules
    };

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
      // Delete existing modules and lessons
      const existingModulesSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').get();
      const batch = adminDb.batch();
      
      // Delete all existing lessons first
      for (const moduleDoc of existingModulesSnapshot.docs) {
        const lessonsSnapshot = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleDoc.id).collection('lessons').get();
        lessonsSnapshot.docs.forEach(lessonDoc => {
          batch.delete(lessonDoc.ref);
        });
        batch.delete(moduleDoc.ref);
      }
      
      await batch.commit();
      
      // Create new modules and lessons
      const newBatch = adminDb.batch();
      
      for (const [moduleIndex, module] of modules.entries()) {
        const moduleRef = adminDb.collection('courses').doc(courseId).collection('modules').doc();
        newBatch.set(moduleRef, {
          title: module.title,
          description: module.description,
          order: moduleIndex + 1,
        });
        
        if (module.lessons && Array.isArray(module.lessons)) {
          for (const [lessonIndex, lesson] of module.lessons.entries()) {
            const lessonRef = adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleRef.id).collection('lessons').doc();
            newBatch.set(lessonRef, {
              title: lesson.title,
              content: lesson.content,
              duration: lesson.duration,
              type: lesson.type || 'text',
              order: lessonIndex + 1,
              completedBy: lesson.completedBy || [],
            });
          }
        }
      }
      
      await newBatch.commit();
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

    // Delete course from Firestore
    console.log('API - Deleting course from database:', courseId);
    await adminDb.collection('courses').doc(courseId).delete();
    console.log('API - Course deleted successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
