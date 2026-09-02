// Skupni tipi za celotno aplikacijo.

/** Vzletišče za jadralno padalstvo. */
export interface LaunchSite {
  id: string;
  name: string;
  /** Regija/območje, samo za prikaz v seznamu. */
  region: string;
  lat: number;
  lon: number;
  /** Približna nadmorska višina vzletišča (m). */
  elevation: number;
  /** true za lokacije, ki jih je dodal uporabnik sam (GPS ali ročno). */
  custom?: boolean;
}

/** En nivo vetra na določeni tlačni ploskvi (pressure level). */
export interface AltitudeWind {
  pressureHpa: number;
  /** Približna nadmorska višina tega nivoja ob tej uri (m). */
  altitude: number;
  /** km/h */
  windSpeed: number;
  /** stopinje, od koder piha veter (meteorološka konvencija) */
  windDir: number;
}

export interface HourlyPoint {
  /** ISO čas v lokalnem času vzletišča. */
  time: string;
  temperature2m: number;
  dewpoint2m: number;
  windSpeed10m: number;
  windDir10m: number;
  windGust10m: number;
  precipitationProbability: number;
  precipitation: number;
  cape: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  /** Ocenjena baza oblakov (m nadmorske višine), null če ni izračunljivo. */
  cloudBase: number | null;
  levels: AltitudeWind[];
}

export interface DailyForecast {
  /** yyyy-mm-dd, lokalni datum. */
  date: string;
  sunrise: string;
  sunset: string;
  hours: HourlyPoint[];
}

export interface SiteForecast {
  site: LaunchSite;
  days: DailyForecast[];
  fetchedAt: string;
  /** Nadmorska višina modelske mreže na tej točki, kot jo vrne Open-Meteo. */
  modelElevation: number;
}

export type FlyRating = 'good' | 'caution' | 'bad';

export interface HourRating {
  rating: FlyRating;
  reasons: string[];
}
