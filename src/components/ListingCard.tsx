import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Listing } from "../types";
import { colors, radius, spacing } from "../theme";
import { formatDistance } from "../utils/geo";

type Props = {
  listing: Listing;
  distanceKm?: number;
  isOwn?: boolean;
  onPress: () => void;
};

export default function ListingCard({
  listing,
  distanceKm,
  isOwn,
  onPress,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {listing.imageUri ? (
        <Image source={{ uri: listing.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="leaf-outline" size={28} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          {isOwn && (
            <View style={[styles.badge, styles.ownBadge]}>
              <Text style={[styles.badgeText, styles.ownBadgeText]}>Tvoja</Text>
            </View>
          )}
          {listing.status !== "available" && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {listing.status === "traded" ? "Zamenjano" : "V dogovoru"}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {listing.category} · {listing.quantity}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {listing.description}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.exchangeRow}>
            <Ionicons name="swap-horizontal" size={14} color={colors.accent} />
            <Text style={styles.exchangeText} numberOfLines={1}>
              {listing.wantedInExchange || "Odprto za predloge"}
            </Text>
          </View>
          {typeof distanceKm === "number" && (
            <Text style={styles.distance}>{formatDistance(distanceKm)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  image: { width: 92, height: "auto", minHeight: 100 },
  imagePlaceholder: {
    backgroundColor: "#EEF3EC",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, padding: spacing.sm + 4 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  badge: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
  ownBadge: { backgroundColor: colors.primary },
  ownBadgeText: { color: "#fff" },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  description: { fontSize: 13, color: colors.text, marginTop: spacing.xs },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  exchangeRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  exchangeText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
    marginLeft: 4,
    flexShrink: 1,
  },
  distance: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.sm },
});
