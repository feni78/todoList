import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";

export interface PlaceLookupResult {
  placeId: string;
  latitude: number;
  longitude: number;
  prefecture: string | null;
  city: string | null;
}

function extractPlaceNameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const placeIdx = parts.indexOf("place");
    if (placeIdx >= 0 && parts[placeIdx + 1]) {
      return decodeURIComponent(parts[placeIdx + 1].replace(/\+/g, " "));
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { url, name } = await req.json() as { url?: string; name?: string };

  const searchText = (url ? extractPlaceNameFromUrl(url) : null) ?? name ?? null;
  if (!searchText) {
    return NextResponse.json({ error: "No place name found" }, { status: 400 });
  }

  // Places API v1 Text Search
  const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.location,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: searchText, languageCode: "ja" }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return NextResponse.json({ error: `Places API error: ${err}` }, { status: 502 });
  }

  const data = await resp.json() as {
    places?: {
      id: string;
      location: { latitude: number; longitude: number };
      addressComponents: { longText: string; types: string[] }[];
    }[];
  };

  const place = data.places?.[0];
  if (!place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  // 都道府県・市区町村のみ抽出（住所文字列はDBに保存しない）
  let prefecture: string | null = null;
  let city: string | null = null;

  for (const c of place.addressComponents ?? []) {
    if (c.types.includes("administrative_area_level_1")) prefecture = c.longText;
    if ((c.types.includes("locality") || c.types.includes("administrative_area_level_2")) && !city) {
      city = c.longText;
    }
  }

  const result: PlaceLookupResult = {
    placeId: place.id,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    prefecture,
    city,
  };

  return NextResponse.json(result);
}
