import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = authResult.user;
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
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const courseData = courseDoc.data();
    if (!courseData?.isFree) {
      return NextResponse.json(
        { error: 'Course is not free. Payment required.' },
        { status: 400 }
      );
    }

    // Check if user is already enrolled
    const userDoc = await db.collection('users').doc(uid).get();
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
    await db.collection('users').doc(uid).update({
      enrolledCourses: db.FieldValue.arrayUnion(courseId),
      updatedAt: new Date(),
    });

    // Record enrollment for analytics
    await db.collection('enrollments').add({
      userId: uid,
      courseId,
      enrolledAt: new Date(),
      type: 'free',
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully enrolled in course',
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
