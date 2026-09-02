import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../data/store";
import { GeoPoint, PRODUCE_CATEGORIES } from "../types";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "CreateListing">;

export default function CreateListingScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<string>(PRODUCE_CATEGORIES[0]);
  const [wantedInExchange, setWantedInExchange] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [location, setLocation] = useState<GeoPoint | undefined>(
    user?.location
  );
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Za dodajanje slike dovoli dostop do galerije.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function detectLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Dostop do lokacije je bil zavrnjen.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setError("Lokacije ni bilo mogoče zaznati.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!user) return;
    if (!title.trim() || !description.trim() || !quantity.trim()) {
      setError("Izpolni vsaj naziv, opis in količino.");
      return;
    }
    setSubmitting(true);
    try {
      await store.createListing({
        ownerId: user.id,
        title: title.trim(),
        description: description.trim(),
        quantity: quantity.trim(),
        category,
        imageUri,
        wantedInExchange: wantedInExchange.trim(),
        location,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Objava ni uspela.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={28} color={colors.primary} />
              <Text style={styles.imagePlaceholderText}>Dodaj sliko</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Naziv pridelka</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="npr. Domači paradižnik"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Opis</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Povej nekaj o pridelku — sveže obrano, brez škropiv …"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Text style={styles.label}>Količina</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="npr. 3 kg ali 10 kosov"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Kategorija</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PRODUCE_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text
                style={[styles.chipText, category === c && styles.chipTextActive]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Kaj želiš v zameno?</Text>
        <TextInput
          style={styles.input}
          value={wantedInExchange}
          onChangeText={setWantedInExchange}
          placeholder="npr. Jabolka, jajca ali odprto za predloge"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Lokacija prevzema</Text>
        <TouchableOpacity style={styles.locationButton} onPress={detectLocation}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.locationButtonText}>
            {locating
              ? "Zaznavanje …"
              : location
              ? `Lokacija nastavljena (${location.latitude.toFixed(
                  3
                )}, ${location.longitude.toFixed(3)})`
              : "Uporabi trenutno lokacijo"}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Objavljanje …" : "Objavi pridelek"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  imagePicker: {
    width: "100%",
    height: 160,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.xs,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF3EC",
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  locationButtonText: {
    marginLeft: spacing.xs,
    color: colors.primaryDark,
    fontWeight: "600",
    fontSize: 13,
  },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
