import { NextResponse } from 'next/server';
import { forwardGeocode } from '@/lib/geocode';

export async function POST(request: Request): Promise<NextResponse> {
  const { place } = await request.json();
  if (!place || typeof place !== 'string') {
    return NextResponse.json({ error: 'place is required' }, { status: 400 });
  }

  const result = await forwardGeocode(place);
  if (!result) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}
