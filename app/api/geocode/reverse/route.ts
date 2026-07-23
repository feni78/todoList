import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

export interface ReverseGeocodeResult {
  prefecture: string | null;
  city: string | null;
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { lat, lng } = await req.json() as { lat?: number; lng?: number };
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}&language=ja`;
  const resp = await fetch(url);
  if (!resp.ok) {
    return NextResponse.json({ error: `Geocoding API error: ${resp.status}` }, { status: 502 });
  }

  const data = await resp.json() as {
    status: string;
    results?: {
      address_components: { long_name: string; types: string[] }[];
    }[];
  };

  if (data.status !== "OK" || !data.results?.length) {
    return NextResponse.json({ error: `Geocoding failed: ${data.status}` }, { status: 404 });
  }

  let prefecture: string | null = null;
  let city: string | null = null;

  for (const component of data.results[0].address_components) {
    if (component.types.includes("administrative_area_level_1")) prefecture = component.long_name;
    if ((component.types.includes("locality") || component.types.includes("administrative_area_level_2")) && !city) {
      city = component.long_name;
    }
  }

  return NextResponse.json({ prefecture, city } satisfies ReverseGeocodeResult);
}
