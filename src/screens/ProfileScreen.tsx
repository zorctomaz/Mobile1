import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { Listing } from "../types";
import ListingCard from "../components/ListingCard";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      store.getListingsByOwner(user.id).then(setMyListings);
    }, [user])
  );

  function confirmLogout() {
    Alert.alert("Odjava", "Se želiš odjaviti?", [
      { text: "Prekliči", style: "cancel" },
      { text: "Odjava", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.listContent}
      data={myListings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.location?.label && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.locationText}>{user.location.label}</Text>
              </View>
            )}

            <View style={styles.radishBadge}>
              <Text style={styles.radishBadgeEmoji}>🫜</Text>
              <Text style={styles.radishBadgeText}>
                {user?.radishCount ?? 0}{" "}
                {(user?.radishCount ?? 0) === 1 ? "redkvica" : "redkvic"} za
                opravljene zamenjave
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
              <Text style={styles.logoutText}>Odjava</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Moje ponudbe</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="leaf-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyText}>Še nisi objavil nobenega pridelka.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          onPress={() =>
            navigation.navigate("ListingDetail", { listingId: item.id })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  header: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 24 },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  locationText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  radishBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBF1E1",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.md,
  },
  radishBadgeEmoji: { fontSize: 16, marginRight: spacing.xs },
  radishBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 13, marginLeft: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  empty: { alignItems: "center", marginTop: spacing.lg },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm },
});
