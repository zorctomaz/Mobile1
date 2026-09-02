import { FlyRating, HourRating, HourlyPoint } from '../types';

// Preprosti pragovi za "semafor" - namenjeni samo grobi orientaciji, NE
// nadomeščajo lastne presoje pilota, preverjanja uradnih virov (ARSO, NOTAM)
// in pravil kluba/vzletišča.
const WIND_CAUTION_KMH = 20;
const WIND_BAD_KMH = 30;
const GUST_CAUTION_KMH = 28;
const GUST_BAD_KMH = 40;
const PRECIP_PROB_CAUTION = 30;
const PRECIP_PROB_BAD = 60;
const CAPE_CAUTION = 500;
const CAPE_BAD = 1500;

function worse(a: FlyRating, b: FlyRating): FlyRating {
  const order: FlyRating[] = ['good', 'caution', 'bad'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export function rateHour(h: HourlyPoint): HourRating {
  let rating: FlyRating = 'good';
  const reasons: string[] = [];

  if (h.windGust10m >= GUST_BAD_KMH) {
    rating = worse(rating, 'bad');
    reasons.push(`Zelo močni sunki vetra (${Math.round(h.windGust10m)} km/h)`);
  } else if (h.windGust10m >= GUST_CAUTION_KMH) {
    rating = worse(rating, 'caution');
    reasons.push(`Krepki sunki vetra (${Math.round(h.windGust10m)} km/h)`);
  }

  if (h.windSpeed10m >= WIND_BAD_KMH) {
    rating = worse(rating, 'bad');
    reasons.push(`Premočan veter (${Math.round(h.windSpeed10m)} km/h)`);
  } else if (h.windSpeed10m >= WIND_CAUTION_KMH) {
    rating = worse(rating, 'caution');
    reasons.push(`Krepak veter (${Math.round(h.windSpeed10m)} km/h)`);
  }

  if (h.precipitationProbability >= PRECIP_PROB_BAD || h.precipitation >= 1) {
    rating = worse(rating, 'bad');
    reasons.push('Velika verjetnost padavin');
  } else if (h.precipitationProbability >= PRECIP_PROB_CAUTION) {
    rating = worse(rating, 'caution');
    reasons.push('Možnost padavin');
  }

  if (h.cape >= CAPE_BAD) {
    rating = worse(rating, 'bad');
    reasons.push('Zelo visok CAPE – nevarnost neviht/močne turbulence');
  } else if (h.cape >= CAPE_CAUTION) {
    rating = worse(rating, 'caution');
    reasons.push('Povišan CAPE – možnost prehitre/turbulentne termike');
  }

  if (reasons.length === 0) {
    reasons.push('Brez zaznanih opozoril po osnovnih kriterijih');
  }

  return { rating, reasons };
}

/** Dnevna ocena = najslabša ocena med "letalnimi" urami (9h-19h). */
export function rateDay(hours: HourlyPoint[]): HourRating {
  const flyingHours = hours.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 9 && hour <= 19;
  });
  const source = flyingHours.length > 0 ? flyingHours : hours;
  if (source.length === 0) {
    return { rating: 'caution', reasons: ['Ni podatkov'] };
  }
  let worstRating: FlyRating = 'good';
  const reasonSet = new Set<string>();
  for (const h of source) {
    const r = rateHour(h);
    worstRating = worse(worstRating, r.rating);
    if (r.rating !== 'good') {
      r.reasons.forEach((reason) => reasonSet.add(reason));
    }
  }
  const reasons = reasonSet.size > 0 ? Array.from(reasonSet) : ['Ugodne razmere po osnovnih kriterijih'];
  return { rating: worstRating, reasons };
}

export const RATING_LABEL: Record<FlyRating, string> = {
  good: 'Leti',
  caution: 'Previdno',
  bad: 'Odsvetujem',
};

export const RATING_COLOR: Record<FlyRating, string> = {
  good: '#2e7d32',
  caution: '#f9a825',
  bad: '#c62828',
};
