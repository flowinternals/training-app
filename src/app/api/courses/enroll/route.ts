import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = authResult.user?.uid;
    
    if (!uid) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
    }
    const body = await request.json();

    // Validate required fields
    const { courseId } = body;
    if (!courseId) {
      return NextResponse.json(
        { error: 'Missing required field: courseId' },
        { status: 400 }
      );
    }

    // Check if course exists and is free
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const courseData = courseDoc.data();
    const { bypassPayment } = body;
    
    // Allow bypass for testing purposes
    if (!courseData?.isFree && !bypassPayment) {
      return NextResponse.json(
        { error: 'Course is not free. Payment required.' },
        { status: 400 }
      );
    }

    // Check if user is already enrolled
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (userData?.enrolledCourses?.includes(courseId)) {
      return NextResponse.json(
        { error: 'User already enrolled in this course' },
        { status: 400 }
      );
    }

    // Enroll user in course
    const updateData: any = {
      enrolledCourses: FieldValue.arrayUnion(courseId),
      updatedAt: new Date(),
    };
    
    // If bypassing payment, only upgrade to paidUser if they're not already admin
    if (bypassPayment && userData?.role !== 'admin') {
      updateData.role = 'paidUser';
    }
    
    // If user is admin, ensure they keep their admin role
    if (userData?.role === 'admin') {
      updateData.role = 'admin';
    }
    
    await adminDb.collection('users').doc(uid).update(updateData);

    // Record enrollment for analytics
    await adminDb.collection('enrollments').add({
      userId: uid,
      courseId,
      enrolledAt: new Date(),
      type: bypassPayment ? 'bypass_testing' : 'free',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course',
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
