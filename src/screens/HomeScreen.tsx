import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { GeoPoint, Listing, PRODUCE_CATEGORIES } from "../types";
import ListingCard from "../components/ListingCard";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { distanceKm } from "../utils/geo";

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<GeoPoint | undefined>(
    user?.location
  );
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");

  const load = useCallback(async () => {
    const all = await store.getListings();
    setListings(all.filter((l) => l.status === "available"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  useEffect(() => {
    setMyLocation(user?.location);
  }, [user?.location]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function useMyLocation() {
    setLocationStatus("requesting");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const point: GeoPoint = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setMyLocation(point);
      setLocationStatus("granted");
      if (user) {
        await store.updateUser(user.id, { location: point });
        await refreshUser();
      }
    } catch {
      setLocationStatus("denied");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = listings.filter((l) => l.ownerId !== user?.id);
    if (category) result = result.filter((l) => l.category === category);
    if (q) {
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.wantedInExchange.toLowerCase().includes(q)
      );
    }
    if (myLocation) {
      result = [...result].sort((a, b) => {
        const da = a.location ? distanceKm(myLocation, a.location) : Infinity;
        const db = b.location ? distanceKm(myLocation, b.location) : Infinity;
        return da - db;
      });
    }
    return result;
  }, [listings, query, category, myLocation, user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Živjo, {user?.name?.split(" ")[0]} 👋</Text>
        <Text style={styles.subGreeting}>Kaj bi rad zamenjal danes?</Text>

        <View style={styles.searchRow}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={{ marginRight: spacing.xs }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Išči po pridelku ali kar iščeš v zameno …"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={{ paddingRight: spacing.md }}
        >
          <TouchableOpacity
            style={[styles.chip, !category && styles.chipActive]}
            onPress={() => setCategory(null)}
          >
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>
              Vse
            </Text>
          </TouchableOpacity>
          {PRODUCE_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(category === c ? null : c)}
            >
              <Text
                style={[
                  styles.chipText,
                  category === c && styles.chipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!myLocation && (
          <TouchableOpacity style={styles.locationBanner} onPress={useMyLocation}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.locationBannerText}>
              {locationStatus === "requesting"
                ? "Iskanje lokacije …"
                : locationStatus === "denied"
                ? "Dostop zavrnjen — dovoli lokacijo za razdalje"
                : "Omogoči lokacijo za sortiranje po bližini"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="basket-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Trenutno ni ponudb, ki bi ustrezale iskanju.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              distanceKm={
                myLocation && item.location
                  ? distanceKm(myLocation, item.location)
                  : undefined
              }
              onPress={() =>
                navigation.navigate("ListingDetail", { listingId: item.id })
              }
            />
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateListing")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  subGreeting: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, color: colors.text },
  chipsRow: { marginTop: spacing.sm, flexGrow: 0 },
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
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    backgroundColor: "#EEF3EC",
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  locationBannerText: {
    fontSize: 12,
    color: colors.primaryDark,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },
  listContent: { padding: spacing.md, paddingBottom: 96 },
  empty: { alignItems: "center", marginTop: spacing.xl * 2 },
  emptyText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
