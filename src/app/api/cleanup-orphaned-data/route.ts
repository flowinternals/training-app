import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase-admin';
import { cleanupOrphanedProgress } from '@/lib/course-cleanup';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only admins can run cleanup
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('API - Starting orphaned data cleanup...');
    const result = await cleanupOrphanedProgress();
    
    console.log('API - Orphaned data cleanup completed:', result);
    
    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      errors: result.errors,
      message: `Cleaned up ${result.cleaned} orphaned progress records`
    });
  } catch (error) {
    console.error('Error cleaning orphaned data:', error);
    return NextResponse.json(
      { error: 'Failed to clean orphaned data' },
      { status: 500 }
    );
  }
}
