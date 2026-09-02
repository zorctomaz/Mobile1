import { AltitudeWind, DailyForecast, HourlyPoint, LaunchSite, SiteForecast } from '../types';

// Tlačni nivoji (hPa), za katere povprašamo veter po višinah.
// Približne nadmorske višine v standardni atmosferi (samo za orientacijo,
// dejanska višina se hour-by-hour izračuna iz geopotential_height):
//   900 hPa ≈ 1000 m, 850 hPa ≈ 1500 m, 800 hPa ≈ 1950 m,
//   700 hPa ≈ 3000 m, 600 hPa ≈ 4200 m
export const PRESSURE_LEVELS = [900, 850, 800, 700, 600] as const;

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 7;

export class WeatherApiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'WeatherApiError';
  }
}

function buildHourlyParams(): string[] {
  const base = [
    'temperature_2m',
    'dewpoint_2m',
    'precipitation_probability',
    'precipitation',
    'cloudcover',
    'cloudcover_low',
    'cloudcover_mid',
    'cloudcover_high',
    'windspeed_10m',
    'winddirection_10m',
    'windgusts_10m',
    'cape',
  ];
  const levels = PRESSURE_LEVELS.flatMap((level) => [
    `windspeed_${level}hPa`,
    `winddirection_${level}hPa`,
    `geopotential_height_${level}hPa`,
  ]);
  return [...base, ...levels];
}

function buildUrl(site: LaunchSite): string {
  const params = new URLSearchParams();
  params.set('latitude', site.lat.toFixed(4));
  params.set('longitude', site.lon.toFixed(4));
  params.set('hourly', buildHourlyParams().join(','));
  params.set('daily', 'sunrise,sunset');
  params.set('windspeed_unit', 'kmh');
  params.set('timezone', 'auto');
  params.set('forecast_days', String(FORECAST_DAYS));
  return `${BASE_URL}?${params.toString()}`;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Ocena baze oblakov (LCL, "lifted condensation level") iz temperature in
 * temperature rosišča na tleh. Standardna približna formula za piloti:
 * vsaka stopinja razlike med temperaturo in rosiščem ustreza približno
 * 125 m višine oblačne baze nad tlemi.
 */
function estimateCloudBase(temp2m: number, dewpoint2m: number, groundElevation: number): number | null {
  const spread = temp2m - dewpoint2m;
  if (!Number.isFinite(spread) || spread <= 0) return null;
  return Math.round(groundElevation + spread * 125);
}

function parseHourly(json: any, groundElevation: number): HourlyPoint[] {
  const h = json.hourly;
  if (!h || !Array.isArray(h.time)) {
    throw new WeatherApiError('Open-Meteo: manjkajo urni podatki v odgovoru.');
  }
  const n = h.time.length;
  const points: HourlyPoint[] = [];
  for (let i = 0; i < n; i++) {
    const levels: AltitudeWind[] = PRESSURE_LEVELS.map((level) => ({
      pressureHpa: level,
      altitude: Math.round(h[`geopotential_height_${level}hPa`]?.[i] ?? NaN),
      windSpeed: h[`windspeed_${level}hPa`]?.[i] ?? NaN,
      windDir: h[`winddirection_${level}hPa`]?.[i] ?? NaN,
    })).filter((l) => Number.isFinite(l.altitude) && Number.isFinite(l.windSpeed));

    points.push({
      time: h.time[i],
      temperature2m: h.temperature_2m?.[i],
      dewpoint2m: h.dewpoint_2m?.[i],
      windSpeed10m: h.windspeed_10m?.[i],
      windDir10m: h.winddirection_10m?.[i],
      windGust10m: h.windgusts_10m?.[i],
      precipitationProbability: h.precipitation_probability?.[i] ?? 0,
      precipitation: h.precipitation?.[i] ?? 0,
      cape: h.cape?.[i] ?? 0,
      cloudCover: h.cloudcover?.[i] ?? 0,
      cloudCoverLow: h.cloudcover_low?.[i] ?? 0,
      cloudCoverMid: h.cloudcover_mid?.[i] ?? 0,
      cloudCoverHigh: h.cloudcover_high?.[i] ?? 0,
      cloudBase: estimateCloudBase(h.temperature_2m?.[i], h.dewpoint_2m?.[i], groundElevation),
      levels,
    });
  }
  return points;
}

function groupByDay(hours: HourlyPoint[], daily: any): DailyForecast[] {
  const byDate = new Map<string, HourlyPoint[]>();
  for (const point of hours) {
    const date = point.time.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(point);
  }
  const dates: string[] = daily?.time ?? Array.from(byDate.keys());
  return dates.map((date, i) => ({
    date,
    sunrise: daily?.sunrise?.[i] ?? '',
    sunset: daily?.sunset?.[i] ?? '',
    hours: byDate.get(date) ?? [],
  }));
}

export async function fetchSiteForecast(site: LaunchSite): Promise<SiteForecast> {
  const url = buildUrl(site);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new WeatherApiError(
      'Ni bilo mogoče vzpostaviti povezave z Open-Meteo. Preveri internetno povezavo.',
      err
    );
  }

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new WeatherApiError(`Open-Meteo je vrnil napako (${res.status}): ${text || 'ni podrobnosti'}`);
  }

  let json: any;
  try {
    json = await res.json();
  } catch (err) {
    throw new WeatherApiError('Odgovora Open-Meteo ni bilo mogoče prebrati (neveljaven JSON).', err);
  }

  if (json?.error) {
    throw new WeatherApiError(`Open-Meteo: ${json.reason ?? 'neznana napaka v zahtevi'}`);
  }

  const modelElevation: number = typeof json.elevation === 'number' ? json.elevation : site.elevation;
  const hours = parseHourly(json, modelElevation);
  const days = groupByDay(hours, json.daily);

  return {
    site,
    days,
    fetchedAt: new Date().toISOString(),
    modelElevation,
  };
}
