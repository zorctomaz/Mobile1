import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { PREDEFINED_SITES } from '../data/sites';
import { LaunchSite } from '../types';
import { loadCustomSites, removeCustomSite } from '../storage/customSites';

type Props = NativeStackScreenProps<RootStackParamList, 'SiteList'>;

export default function SiteListScreen({ navigation }: Props) {
  const [customSites, setCustomSites] = useState<LaunchSite[]>([]);
  const [query, setQuery] = useState('');

  const refresh = useCallback(() => {
    loadCustomSites().then(setCustomSites);
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('AddSite')} style={styles.addButton}>
          <Text style={styles.addButtonText}>＋ Dodaj</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const allSites = [...customSites, ...PREDEFINED_SITES];
  const filtered = allSites.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleRemove = (id: string) => {
    removeCustomSite(id).then(setCustomSites);
  };

  return (
    <View style={styles.container}>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ Podatki so informativne narave in ne nadomeščajo lastne presoje, preverjanja uradnih
          virov (ARSO, NOTAM) ter pravil lokalnega kluba pred letom.
        </Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Išči vzletišče…"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('SiteDetail', { site: item })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name} {item.custom ? '· moja' : ''}
              </Text>
              <Text style={styles.meta}>
                {item.region} · {item.elevation} m
              </Text>
            </View>
            {item.custom && (
              <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={10}>
                <Text style={styles.remove}>Odstrani</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ni zadetkov.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  disclaimer: {
    backgroundColor: '#fff8e1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6c0',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#7a6a00',
  },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f2f4',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2733',
  },
  meta: {
    fontSize: 13,
    color: '#7a8a99',
    marginTop: 2,
  },
  remove: {
    color: '#c62828',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#889',
  },
  addButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addButtonText: {
    color: '#1b6fb8',
    fontWeight: '600',
    fontSize: 15,
  },
});
