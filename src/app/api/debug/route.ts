import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const logFilePath = path.join(process.cwd(), 'debug-quiz.log');
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, ...data }) + '\n';

    await fs.appendFile(logFilePath, logEntry);

    return NextResponse.json({ message: 'Debug info logged successfully' });
  } catch (error) {
    console.error('Failed to write debug info to file:', error);
    return NextResponse.json({ error: 'Failed to log debug info' }, { status: 500 });
  }
}
