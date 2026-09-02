import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { Conversation, Listing, User } from "../types";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Messages">;

type Row = {
  conversation: Conversation;
  listing: Listing | null;
  otherUser: User | null;
};

export default function MessagesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user) return;
      (async () => {
        setLoading(true);
        const conversations = await store.getConversationsForUser(user.id);
        const built = await Promise.all(
          conversations.map(async (c) => {
            const listing = await store.getListingById(c.listingId);
            const otherId = c.participantIds.find((id) => id !== user.id);
            const otherUser = otherId ? await store.getUserById(otherId) : null;
            return { conversation: c, listing, otherUser };
          })
        );
        if (active) {
          setRows(built);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [user])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.flex}
      contentContainerStyle={styles.listContent}
      data={rows}
      keyExtractor={(item) => item.conversation.id}
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons
            name="chatbubbles-outline"
            size={40}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            Ko predlagaš ali prejmeš zamenjavo, se pogovor prikaže tukaj.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            navigation.navigate("Chat", {
              conversationId: item.conversation.id,
              listingTitle: item.listing?.title ?? "Pogovor",
            })
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.otherUser?.name?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.otherUser?.name ?? "Uporabnik"} ·{" "}
              {item.listing?.title ?? "Ponudba odstranjena"}
            </Text>
            <Text style={styles.rowPreview} numberOfLines={1}>
              {item.conversation.lastMessagePreview ?? "Začni pogovor …"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl * 2,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  rowPreview: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
