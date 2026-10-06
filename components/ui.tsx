import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlayer } from "../lib/PlayerProvider";
export const colors = {
  background: "#F3F5FF",
  ink: "#18233B",
  muted: "#53617A",
  primary: "#4C39C9",
  card: "#FFFFFF",
  good: "#146E47",
  bad: "#AA2740",
  border: "#D5DBED",
};
export const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 18,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingBottom: 40,
  },
  title: { fontSize: 32, fontWeight: "800", color: colors.ink },
  heading: { fontSize: 22, fontWeight: "700", color: colors.ink },
  text: { fontSize: 17, lineHeight: 25, color: colors.ink },
  muted: { fontSize: 16, lineHeight: 24, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 17,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  number: { fontSize: 38, fontWeight: "800", color: colors.primary },
});
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        padding: 16,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: secondary ? "#E8E5FC" : colors.primary,
        opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: secondary ? colors.primary : "#FFF",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Feedback({
  children,
  correct,
}: {
  children: React.ReactNode;
  correct?: boolean;
}) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        styles.text,
        {
          color:
            correct === undefined
              ? colors.bad
              : correct
                ? colors.good
                : colors.bad,
          fontWeight: "600",
        },
      ]}
    >
      {children}
    </Text>
  );
}
export function SyncStatus() {
  const { user, error, syncing, sync, data } = usePlayer();
  if (!user || (!error && !data.pending.length && !syncing)) return null;
  return (
    <Card>
      <Text style={styles.muted}>
        {syncing
          ? "Syncing progress…"
          : (error ??
            `${data.pending.length} result(s) saved on this device, waiting to sync.`)}
      </Text>
      {!syncing && (
        <Button
          title="Retry cloud sync"
          secondary
          onPress={() => {
            void sync();
          }}
        />
      )}
    </Card>
  );
}
export function BootGate({ children }: { children: React.ReactNode }) {
  const { ready, error, retry } = usePlayer();
  if (ready) return <>{children}</>;
  return (
    <Screen>
      <Title>Taptics</Title>
      {error ? (
        <>
          <Feedback>{error}</Feedback>
          <Button
            title="Retry loading progress"
            onPress={() => {
              void retry();
            }}
          />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Getting your workout ready…</Text>
        </>
      )}
    </Screen>
  );
}
