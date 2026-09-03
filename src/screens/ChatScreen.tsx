import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as store from "../data/store";
import { Conversation, Listing, Message, SYSTEM_SENDER_ID, User } from "../types";
import { colors, radius, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const { conversationId, listingTitle } = route.params;
  const { user, refreshUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    navigation.setOptions({ title: listingTitle });
  }, [navigation, listingTitle]);

  const load = useCallback(async () => {
    const [msgs, conv] = await Promise.all([
      store.getMessages(conversationId),
      store.getConversationById(conversationId),
    ]);
    setMessages(msgs);
    setConversation(conv);
    if (conv) {
      const otherId = conv.participantIds.find((id) => id !== user?.id);
      const [l, other] = await Promise.all([
        store.getListingById(conv.listingId),
        otherId ? store.getUserById(otherId) : Promise.resolve(null),
      ]);
      setListing(l);
      setOtherUser(other);
    }
  }, [conversationId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSend() {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      await store.sendMessage(conversationId, user.id, text);
      setText("");
      await load();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmTrade() {
    if (!user) return;
    Alert.alert(
      "Potrdi zamenjavo",
      "S tem potrjuješ, da je bila zamenjava dogovorjena in opravljena. Ponudba bo izginila, oba pa prejmeta redkvico 🫜.",
      [
        { text: "Prekliči", style: "cancel" },
        {
          text: "Potrdi",
          onPress: async () => {
            setConfirming(true);
            try {
              await store.confirmTrade(conversationId, user.id);
              await load();
              await refreshUser();
              requestAnimationFrame(() =>
                listRef.current?.scrollToEnd({ animated: true })
              );
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  }

  const iConfirmed = !!user && !!conversation?.tradeConfirmedBy.includes(user.id);
  const tradedHere =
    listing?.status === "traded" &&
    !!conversation &&
    conversation.participantIds.every((id) =>
      conversation.tradeConfirmedBy.includes(id)
    );
  const tradedElsewhere = listing?.status === "traded" && !tradedHere;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Napiši sporočilo, da se dogovoriš za zamenjavo.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.senderId === SYSTEM_SENDER_ID) {
            return (
              <View style={styles.systemRow}>
                <Text style={styles.systemText}>{item.text}</Text>
              </View>
            );
          }
          const mine = item.senderId === user?.id;
          return (
            <View
              style={[
                styles.bubbleRow,
                mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
              ]}
            >
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.tradeBar}>
        {tradedHere ? (
          <View style={[styles.tradeBanner, styles.tradeBannerDone]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.tradeBannerText}>
              Zamenjava zaključena — oba sta prejela redkvico 🫜
            </Text>
          </View>
        ) : tradedElsewhere ? (
          <View style={styles.tradeBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.tradeBannerText, { color: colors.textMuted }]}>
              Ta ponudba je bila medtem zamenjana z nekom drugim.
            </Text>
          </View>
        ) : iConfirmed ? (
          <View style={styles.tradeBanner}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.tradeBannerText}>
              Čakaš, da {otherUser?.name ?? "druga oseba"} potrdi zamenjavo …
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
            onPress={handleConfirmTrade}
            disabled={confirming}
          >
            <Ionicons name="checkmark-done" size={18} color="#fff" />
            <Text style={styles.confirmButtonText}>
              {confirming ? "Potrjujem …" : "Potrdi zamenjavo"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Napiši sporočilo …"
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: spacing.xl },
  emptyText: { color: colors.textMuted, textAlign: "center" },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.sm },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleRowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 2 },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 2,
  },
  bubbleText: { color: colors.text, fontSize: 15 },
  bubbleTextMine: { color: "#fff" },
  systemRow: { alignItems: "center", marginVertical: spacing.sm },
  systemText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primaryDark,
    backgroundColor: "#EEF3EC",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textAlign: "center",
    overflow: "hidden",
  },
  tradeBar: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    backgroundColor: colors.card,
  },
  tradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  tradeBannerDone: {},
  tradeBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryDark,
    marginLeft: spacing.xs,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    color: colors.text,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});
