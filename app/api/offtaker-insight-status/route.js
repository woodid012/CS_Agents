import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const FILE = path.join(process.cwd(), 'data', 'offtaker-insights-status.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(load());
}

export async function POST(req) {
  const { bidderNo, status } = await req.json();
  const data = load();
  if (status === null) {
    delete data[String(bidderNo)];
  } else {
    data[String(bidderNo)] = status;
  }
  save(data);
  return NextResponse.json(data);
}
