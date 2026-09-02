import AsyncStorage from '@react-native-async-storage/async-storage';
import { LaunchSite } from '../types';

const KEY = 'paraglide.customSites.v1';

export async function loadCustomSites(): Promise<LaunchSite[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(sites: LaunchSite[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(sites));
}

export async function addCustomSite(site: LaunchSite): Promise<LaunchSite[]> {
  const current = await loadCustomSites();
  const next = [...current.filter((s) => s.id !== site.id), site];
  await persist(next);
  return next;
}

export async function removeCustomSite(id: string): Promise<LaunchSite[]> {
  const current = await loadCustomSites();
  const next = current.filter((s) => s.id !== id);
  await persist(next);
  return next;
}
