import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { SiteForecast } from '../types';
import { fetchSiteForecast, WeatherApiError } from '../services/openMeteo';
import { rateDay, rateHour } from '../services/flyability';
import FlyabilityBadge from '../components/FlyabilityBadge';
import DaySelector from '../components/DaySelector';
import Meteogram from '../components/Meteogram';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteDetail'>;

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
}

export default function SiteDetailScreen({ route, navigation }: Props) {
  const { site } = route.params;
  const [forecast, setForecast] = useState<SiteForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);

  useEffect(() => {
    navigation.setOptions({ title: site.name });
  }, [navigation, site.name]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchSiteForecast(site);
      setForecast(result);
    } catch (err) {
      const message = err instanceof WeatherApiError ? err.message : 'Nepričakovana napaka pri pridobivanju vremena.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [site]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const selectedDay = forecast?.days[dayIndex];
  const dayRating = useMemo(() => (selectedDay ? rateDay(selectedDay.hours) : null), [selectedDay]);

  const nowHour = useMemo(() => {
    if (!selectedDay) return null;
    const now = Date.now();
    let closest = selectedDay.hours[0];
    let closestDiff = Infinity;
    for (const h of selectedDay.hours) {
      const diff = Math.abs(new Date(h.time).getTime() - now);
      if (diff < closestDiff) {
        closest = h;
        closestDiff = diff;
      }
    }
    return closest ?? null;
  }, [selectedDay]);

  const nowRating = nowHour ? rateHour(nowHour) : null;

  const openExternal = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1b3a57" />
        <Text style={styles.loadingText}>Nalagam vreme za {site.name}…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Napaka pri pridobivanju vremena</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryButtonText}>Poskusi znova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!forecast || !selectedDay) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Ni podatkov.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.siteName}>{site.name}</Text>
          <Text style={styles.siteMeta}>
            {site.region} · {site.elevation} m n.v. · {site.lat.toFixed(3)}, {site.lon.toFixed(3)}
          </Text>
        </View>
        {dayRating && <FlyabilityBadge rating={dayRating.rating} />}
      </View>

      <DaySelector days={forecast.days} selectedIndex={dayIndex} onSelect={setDayIndex} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {dayIndex === 0 ? 'Danes' : new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('sl-SI')}
        </Text>
        {dayRating && (
          <View style={styles.reasonList}>
            {dayRating.reasons.map((reason) => (
              <Text key={reason} style={styles.reason}>
                • {reason}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.sun}>
          🌅 {formatTime(selectedDay.sunrise)} · 🌇 {formatTime(selectedDay.sunset)}
        </Text>
      </View>

      {nowHour && nowRating && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Trenutno / najbližja ura ({formatTime(nowHour.time)})</Text>
            <FlyabilityBadge rating={nowRating.rating} size="small" />
          </View>
          <View style={styles.statsGrid}>
            <Stat label="Veter" value={`${Math.round(nowHour.windSpeed10m)} km/h`} />
            <Stat label="Sunki" value={`${Math.round(nowHour.windGust10m)} km/h`} />
            <Stat label="Smer" value={`${Math.round(nowHour.windDir10m)}°`} />
            <Stat label="Temp." value={`${Math.round(nowHour.temperature2m)} °C`} />
            <Stat
              label="Baza oblakov"
              value={nowHour.cloudBase ? `${nowHour.cloudBase} m` : '—'}
            />
            <Stat label="CAPE" value={`${Math.round(nowHour.cape)}`} />
            <Stat label="Oblačnost" value={`${Math.round(nowHour.cloudCover)} %`} />
            <Stat label="Verj. padavin" value={`${Math.round(nowHour.precipitationProbability)} %`} />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Veter po višinah – urni potek</Text>
        <Meteogram hours={selectedDay.hours} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dodatni specializirani viri</Text>
        <Text style={styles.linkHint}>
          Za primerjavo si oglej še modele, specializirane za jadralno padalstvo:
        </Text>
        <TouchableOpacity onPress={() => openExternal('https://www.meteo-parapente.com/')}>
          <Text style={styles.link}>→ meteo-parapente.com</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openExternal('https://burnair.cloud/')}>
          <Text style={styles.link}>→ burnair.cloud</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openExternal('https://meteo.arso.gov.si/met/sl/weather/observ/surface/')}>
          <Text style={styles.link}>→ ARSO – trenutne meritve postaj</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        ⚠️ Napoved je avtomatsko izračunana (Open-Meteo) po osnovnih kriterijih in NI varnostna
        ocena. Pred vsakim letom preveri uradne vire, aktualne razmere na vzletišču in se ravnaj po
        lastni presoji ter pravilih kluba.
      </Text>
      <Text style={styles.fetchedAt}>
        Podatki osveženi: {new Date(forecast.fetchedAt).toLocaleTimeString('sl-SI')}
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#667',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#c62828',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#556',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1b3a57',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  siteName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b2733',
  },
  siteMeta: {
    fontSize: 12,
    color: '#7a8a99',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b2733',
  },
  reasonList: {
    marginTop: 8,
  },
  reason: {
    fontSize: 13,
    color: '#445',
    marginTop: 2,
  },
  sun: {
    marginTop: 10,
    fontSize: 13,
    color: '#667',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  stat: {
    width: '25%',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b2733',
  },
  statLabel: {
    fontSize: 11,
    color: '#8899',
    marginTop: 2,
  },
  linkHint: {
    fontSize: 12,
    color: '#778',
    marginBottom: 8,
  },
  link: {
    color: '#1b6fb8',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '600',
  },
  disclaimer: {
    marginHorizontal: 16,
    fontSize: 11,
    color: '#889',
    lineHeight: 16,
  },
  fetchedAt: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 32,
    fontSize: 11,
    color: '#aab',
  },
});
