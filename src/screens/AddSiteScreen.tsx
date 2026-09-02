import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LaunchSite } from '../types';
import { addCustomSite } from '../storage/customSites';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSite'>;

export default function AddSiteScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [elevation, setElevation] = useState('');
  const [locating, setLocating] = useState(false);

  const useGpsLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ni dovoljenja', 'Za uporabo trenutne lokacije dovoli dostop do GPS-a v nastavitvah.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLat(pos.coords.latitude.toFixed(5));
      setLon(pos.coords.longitude.toFixed(5));
      if (pos.coords.altitude && pos.coords.altitude > 0) {
        setElevation(String(Math.round(pos.coords.altitude)));
      }
      if (!name) setName('Moja lokacija');
    } catch (err) {
      Alert.alert('Napaka', 'Trenutne lokacije ni bilo mogoče pridobiti.');
    } finally {
      setLocating(false);
    }
  };

  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon)) &&
    lat.trim() !== '' &&
    lon.trim() !== '';

  const handleSave = async () => {
    const site: LaunchSite = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      region: 'Moja lokacija',
      lat: Number(lat),
      lon: Number(lon),
      elevation: elevation.trim() !== '' && Number.isFinite(Number(elevation)) ? Number(elevation) : 0,
      custom: true,
    };
    await addCustomSite(site);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Ime lokacije</Text>
        <TextInput
          style={styles.input}
          placeholder="npr. Moje domače vzletišče"
          value={name}
          onChangeText={setName}
        />

        <TouchableOpacity style={styles.gpsButton} onPress={useGpsLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#1b6fb8" />
          ) : (
            <Text style={styles.gpsButtonText}>📍 Uporabi trenutno GPS lokacijo</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.orText}>— ali vnesi ročno —</Text>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Zemljepisna širina</Text>
            <TextInput
              style={styles.input}
              placeholder="46.2597"
              keyboardType="numbers-and-punctuation"
              value={lat}
              onChangeText={setLat}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Zemljepisna dolžina</Text>
            <TextInput
              style={styles.input}
              placeholder="13.8395"
              keyboardType="numbers-and-punctuation"
              value={lon}
              onChangeText={setLon}
            />
          </View>
        </View>

        <Text style={styles.label}>Nadmorska višina (m, neobvezno)</Text>
        <TextInput
          style={styles.input}
          placeholder="1200"
          keyboardType="numeric"
          value={elevation}
          onChangeText={setElevation}
        />

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Shrani lokacijo</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    color: '#556',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dde2e6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  gpsButton: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e8f2fb',
    alignItems: 'center',
  },
  gpsButtonText: {
    color: '#1b6fb8',
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#99a',
    marginTop: 16,
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 26,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1b3a57',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
