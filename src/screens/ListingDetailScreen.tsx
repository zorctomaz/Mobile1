import React, { useCallback, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { Listing, User } from "../types";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import { distanceKm, formatDistance } from "../utils/geo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "ListingDetail">;

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const l = await store.getListingById(listingId);
        if (!active) return;
        setListing(l);
        if (l) setOwner(await store.getUserById(l.ownerId));
      })();
      return () => {
        active = false;
      };
    }, [listingId])
  );

  const isOwner = listing?.ownerId === user?.id;

  async function proposeTrade() {
    if (!user || !listing) return;
    setStarting(true);
    try {
      const conversation = await store.getOrCreateConversation(
        listing.id,
        user.id,
        listing.ownerId
      );
      navigation.navigate("Chat", {
        conversationId: conversation.id,
        listingTitle: listing.title,
      });
    } finally {
      setStarting(false);
    }
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Ponudbe ni bilo mogoče najti.</Text>
      </View>
    );
  }

  const distance =
    user?.location && listing.location
      ? distanceKm(user.location, listing.location)
      : undefined;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {listing.imageUri ? (
        <Image source={{ uri: listing.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="leaf-outline" size={48} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.meta}>
          {listing.category} · {listing.quantity}
          {distance !== undefined ? ` · ${formatDistance(distance)} stran` : ""}
        </Text>

        <Text style={styles.sectionLabel}>Opis</Text>
        <Text style={styles.description}>{listing.description}</Text>

        <View style={styles.exchangeCard}>
          <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Text style={styles.exchangeLabel}>Želi v zameno</Text>
            <Text style={styles.exchangeValue}>
              {listing.wantedInExchange || "Odprto za predloge"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Ponuja</Text>
        <View style={styles.ownerRow}>
          <View style={styles.ownerAvatar}>
            <Text style={styles.ownerAvatarText}>
              {owner?.name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.ownerName}>{owner?.name ?? "Neznan uporabnik"}</Text>
        </View>

        {listing.status === "traded" ? (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.doneBannerText}>
              Ta ponudba je zamenjana — oba udeleženca sta prejela redkvico 🫜.
            </Text>
          </View>
        ) : isOwner ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.infoBannerText}>
              Ko se s kupcem dogovoriš, zamenjavo v pogovoru potrdita oba —
              šele takrat ponudba izgine in oba prejmeta redkvico.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, starting && styles.buttonDisabled]}
            onPress={proposeTrade}
            disabled={starting}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.buttonText}>Predlagaj zamenjavo</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: spacing.xl },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  notFound: { color: colors.textMuted },
  image: { width: "100%", height: 220 },
  imagePlaceholder: {
    backgroundColor: "#EEF3EC",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  description: { fontSize: 15, color: colors.text, lineHeight: 21 },
  exchangeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBF1E1",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  exchangeLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  exchangeValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
  ownerRow: { flexDirection: "row", alignItems: "center" },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  ownerAvatarText: { color: "#fff", fontWeight: "700" },
  ownerName: { fontSize: 15, color: colors.text, fontWeight: "600" },
  button: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: spacing.xs,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF3EC",
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  infoBannerText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: spacing.xs,
  },
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF3EC",
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  doneBannerText: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
});
