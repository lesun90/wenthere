export interface GeoLocation {
  lat: number;
  lng: number;
  country_code: string;
  country_name: string;
  region_code: string | null;
  region_name: string | null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoLocation | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wenthere/1.0 (photo-album-app)' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const addr = data.address ?? {};
  const countryCode = (addr.country_code as string | undefined)?.toUpperCase() ?? null;
  const countryName = (addr.country as string | undefined) ?? null;

  if (!countryCode || !countryName) return null;

  const regionName = addr.state ?? addr.province ?? addr.region ?? null;
  const regionCode = regionName && countryCode
    ? `${countryCode}-${(addr['ISO3166-2-lvl4'] ?? addr.state_code ?? regionName)
        .replace(/^.*-/, '')
        .toUpperCase()
        .slice(0, 6)}`
    : null;

  return { lat, lng, country_code: countryCode, country_name: countryName, region_code: regionCode, region_name: regionName };
}

export async function forwardGeocode(place: string): Promise<GeoLocation | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&addressdetails=1&limit=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wenthere/1.0 (photo-album-app)' },
  });
  if (!res.ok) return null;

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const top = results[0];
  return reverseGeocode(parseFloat(top.lat), parseFloat(top.lon));
}
