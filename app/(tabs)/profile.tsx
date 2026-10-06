import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  Feedback,
  Screen,
  styles,
  SyncStatus,
  Title,
} from "../../components/ui";
import { usePlayer } from "../../lib/PlayerProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { playerKey } from "../../lib/storage";
import { supabase } from "../../lib/supabase";
export default function ProfileScreen() {
  const router = useRouter();
  const { user, id, data, sync, syncing } = usePlayer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accountAction = async (remove: boolean) => {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    try {
      if (remove) {
        const { error: deletionError } =
          await supabase.rpc("delete_my_account");
        if (deletionError) throw deletionError;
        await AsyncStorage.removeItem(playerKey(id));
      }
      const { error: authError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (authError) throw authError;
      setConfirmDelete(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Account action failed. Retry when connected.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Title>Your profile</Title>
      <Card>
        <Text style={styles.heading}>
          {user ? (user.email ?? "Taptics account") : "Playing as a guest"}
        </Text>
        <Text style={styles.text}>
          {user
            ? "Your completed workouts sync across devices when connected."
            : "Your progress is saved on this device. You can train and complete Daily without an account."}
        </Text>
        <Text style={styles.muted}>
          Guest and account progress are separate. Signing out restores your
          device’s guest profile. Uninstalling or clearing app data removes
          guest progress.
        </Text>
      </Card>
      {user ? (
        <>
          <Button
            title={busy ? "Working…" : "Sign out"}
            secondary
            disabled={busy || syncing || data.pending.length > 0}
            onPress={() => {
              void accountAction(false);
            }}
          />
          {data.pending.length > 0 && (
            <Text style={styles.muted}>
              Sync pending results before signing out to preserve them across
              devices.
            </Text>
          )}
          <SyncStatus />
          <Button
            title="Sync now"
            disabled={busy || syncing}
            secondary
            onPress={() => {
              void sync();
            }}
          />
          <Card>
            <Text style={styles.heading}>Delete account</Text>
            <Text style={styles.muted}>
              Permanently deletes your account and cloud progress. Your guest
              profile remains on this device.
            </Text>
            {confirmDelete ? (
              <>
                <Button
                  title="Permanently delete my account"
                  disabled={busy}
                  onPress={() => {
                    void accountAction(true);
                  }}
                />
                <Button
                  title="Cancel deletion"
                  secondary
                  disabled={busy}
                  onPress={() => setConfirmDelete(false)}
                />
              </>
            ) : (
              <Button
                title="Delete my account…"
                secondary
                onPress={() => setConfirmDelete(true)}
              />
            )}
          </Card>
        </>
      ) : supabase ? (
        <Button
          title="Log in or create an account"
          onPress={() => router.push("/login")}
        />
      ) : (
        <Card>
          <Text style={styles.muted}>
            Account sync is not configured in this build. All guest features
            work on this device.
          </Text>
        </Card>
      )}
      {error && <Feedback>{error}</Feedback>}
    </Screen>
  );
}
