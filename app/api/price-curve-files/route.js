import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const DIR  = path.join(process.cwd(), 'data', 'price curves', 'curve - files');
const META = path.join(process.cwd(), 'data', 'price curves', 'curve-files-metadata.json');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');

  if (filename) {
    const safe = path.basename(filename);
    const filePath = path.join(DIR, safe);
    if (!filePath.startsWith(DIR)) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }
    try {
      const buffer = await readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(safe)}"`,
          'Content-Length': String(buffer.length),
        },
      });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  try {
    const raw = await readFile(META, 'utf8');
    return NextResponse.json({ files: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
