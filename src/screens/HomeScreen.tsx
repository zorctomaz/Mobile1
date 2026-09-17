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
import ListingsMapView from "../components/ListingsMapView";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";
import { distanceKm } from "../utils/geo";
import { withTimeout } from "../utils/withTimeout";

// A cold GPS fix can genuinely take a while (worse indoors/urban canyon),
// so give it real time rather than giving up and showing a stale fallback.
const LOCATION_TIMEOUT_MS = 25000;

type Props = NativeStackScreenProps<MainStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [myLocation, setMyLocation] = useState<GeoPoint | undefined>(
    user?.location
  );
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "error"
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

  // Fetch a fresh GPS fix automatically as soon as the app opens (not only
  // when the user switches to the map), so both the distance sort and the
  // map are ready by the time they're needed. Any location saved on the
  // user record (e.g. seeded demo data) is treated as a starting point
  // only, never as a substitute for a real fix.
  useEffect(() => {
    if (locationStatus === "idle") {
      useMyLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Fast path: if the OS already has a cached fix (from this or any
      // other app), show it immediately so the UI isn't just spinning —
      // it'll be replaced by the precise fix below once that's ready.
      let approxPoint: GeoPoint | null = null;
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          approxPoint = { latitude: last.coords.latitude, longitude: last.coords.longitude };
          setMyLocation(approxPoint);
        }
      } catch {
        // no cached fix available yet — fine, we just wait for the real one
      }

      let point: GeoPoint | null = null;
      try {
        const pos = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          LOCATION_TIMEOUT_MS
        );
        point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        // Precise fix timed out — keep the approximate one if we have it
        // rather than failing outright.
        point = approxPoint;
      }

      if (!point) {
        setLocationStatus("error");
        return;
      }

      setMyLocation(point);
      setLocationStatus("granted");
      if (user) {
        await store.updateUser(user.id, { location: point });
        await refreshUser();
      }
    } catch {
      setLocationStatus("error");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = listings;
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

        {locationStatus !== "idle" && locationStatus !== "granted" && (
          <TouchableOpacity
            style={styles.locationBanner}
            onPress={useMyLocation}
            disabled={locationStatus === "requesting"}
          >
            {locationStatus === "requesting" ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="location-outline" size={16} color={colors.primary} />
            )}
            <Text style={styles.locationBannerText}>
              {locationStatus === "requesting"
                ? "Iščem GPS lokacijo …"
                : locationStatus === "denied"
                ? "Dostop do lokacije zavrnjen — tapni za dovoljenje"
                : "Lokacije ni bilo mogoče pridobiti — tapni za nov poskus"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "list" && styles.toggleButtonActive]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons
              name="list"
              size={15}
              color={viewMode === "list" ? "#fff" : colors.textMuted}
            />
            <Text
              style={[styles.toggleText, viewMode === "list" && styles.toggleTextActive]}
            >
              Seznam
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "map" && styles.toggleButtonActive]}
            onPress={() => setViewMode("map")}
          >
            <Ionicons
              name="map-outline"
              size={15}
              color={viewMode === "map" ? "#fff" : colors.textMuted}
            />
            <Text
              style={[styles.toggleText, viewMode === "map" && styles.toggleTextActive]}
            >
              Zemljevid
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : viewMode === "map" ? (
        myLocation ? (
          <ListingsMapView
            listings={filtered}
            myLocation={myLocation}
            onSelectListing={(listingId) =>
              navigation.navigate("ListingDetail", { listingId })
            }
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            {locationStatus === "denied" || locationStatus === "error" ? (
              <>
                <Ionicons name="location-outline" size={36} color={colors.textMuted} />
                <Text style={styles.mapPlaceholderText}>
                  {locationStatus === "denied"
                    ? "Zemljevid centriramo na tvojo lokacijo — za to dovoli dostop do lokacije."
                    : "Lokacije trenutno ni bilo mogoče pridobiti — preveri, da je GPS na napravi omogočen."}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={useMyLocation}>
                  <Text style={styles.retryButtonText}>Poskusi znova</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.mapPlaceholderText}>Iščem tvojo lokacijo …</Text>
              </>
            )}
          </View>
        )
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
              isOwn={item.ownerId === user?.id}
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
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginLeft: 4,
  },
  toggleTextActive: { color: "#fff" },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  mapPlaceholderText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    fontSize: 13,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  retryButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
