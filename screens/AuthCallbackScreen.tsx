import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  Feedback,
  Screen,
  styles,
  Title,
} from "../components/ui";
import { useAuthFlow } from "../lib/AuthProvider";

export default function AuthCallbackScreen() {
  const flow = useAuthFlow();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const locked = useRef(false);
  const submit = async () => {
    if (locked.current) return;
    if (password !== confirm) {
      setError("Passwords must match.");
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await flow.updatePassword(password);
      setPasswordUpdated(true);
      setPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Title>
          {flow.status === "recovery"
            ? "Choose a new password."
            : "Your email link."}
        </Title>
        {flow.status === "checking" && (
          <Feedback>Verifying your email link…</Feedback>
        )}
        {flow.status === "recovery" && (
          <Card>
            <Text style={styles.text}>New password (8+ characters)</Text>
            <TextInput
              accessibilityLabel="New password"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />
            <Text style={styles.text}>Confirm new password</Text>
            <TextInput
              accessibilityLabel="Confirm new password"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              value={confirm}
              onChangeText={setConfirm}
              editable={!busy}
            />
            <Button
              title={busy ? "Saving…" : "Save new password"}
              disabled={busy}
              onPress={() => {
                void submit();
              }}
            />
          </Card>
        )}
        {flow.status === "confirmed" && (
          <>
            <Feedback>
              {passwordUpdated
                ? "Your password was updated."
                : "Your email is confirmed."}{" "}
              You can review guest progress on your Profile; nothing is imported
              automatically.
            </Feedback>
            <Button
              title="Continue to Profile"
              onPress={() => router.replace("/profile")}
            />
          </>
        )}
        {flow.status === "error" && <Feedback>{flow.message}</Feedback>}
        {flow.status === "idle" && (
          <Feedback>
            Open the latest confirmation or reset email on the device that
            requested it.
          </Feedback>
        )}
        {error && <Feedback>{error}</Feedback>}
        <Button
          title="Return to Login"
          secondary
          disabled={busy}
          onPress={() => router.replace("/login")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
