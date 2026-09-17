import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { Listing } from "../types";
import ListingCard from "../components/ListingCard";
import { colors, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "MyListings">;

export default function MyListingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      store
        .getListingsByOwner(user.id)
        .then(setMyListings)
        .finally(() => setLoading(false));
    }, [user])
  );

  return (
    <View style={styles.flex}>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        data={myListings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Še nisi objavil/-a nobenega pridelka — tapni + spodaj, da dodaš
                prvo ponudbo.
              </Text>
            </View>
          ) : null
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
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: 96, flexGrow: 1 },
  empty: { alignItems: "center", marginTop: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
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
