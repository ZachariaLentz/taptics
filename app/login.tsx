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
import { supabase } from "../lib/supabase";
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const submit = async () => {
    if (!supabase || locked.current) return;
    if (!email.trim().includes("@") || password.length < 8) {
      setMessage(
        "Enter a valid email and a password with at least 8 characters.",
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response =
        mode === "login"
          ? await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })
          : await supabase.auth.signUp({ email: email.trim(), password });
      if (response.error) throw response.error;
      if (response.data.session) router.replace("/profile");
      else
        setMessage(
          "Check your email to confirm your account, then return here to log in.",
        );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not connect. Please retry.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!supabase || locked.current || !email.trim().includes("@")) {
      setMessage("Enter your email first.");
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setMessage(
        "If an account exists, a reset email is on its way. Follow the configured account recovery page.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset request failed.");
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
          {mode === "login" ? "Welcome back." : "Save your progress."}
        </Title>
        <Text style={styles.muted}>
          Accounts sync across devices. Your guest progress stays separate on
          this device.
        </Text>
        <Card>
          <Text style={styles.text}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />
          <Text style={styles.text}>Password (8+ characters)</Text>
          <TextInput
            accessibilityLabel="Password"
            style={styles.input}
            secureTextEntry
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChangeText={setPassword}
            editable={!busy}
          />
          <Button
            title={
              busy
                ? "Connecting…"
                : mode === "login"
                  ? "Log in"
                  : "Create account"
            }
            disabled={busy || !supabase}
            onPress={() => {
              void submit();
            }}
          />
          <Button
            secondary
            title={
              mode === "login"
                ? "Create an account instead"
                : "Already have an account? Log in"
            }
            disabled={busy}
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          />
          {mode === "login" && (
            <Button
              title="Send password reset email"
              secondary
              disabled={busy || !supabase}
              onPress={() => {
                void reset();
              }}
            />
          )}
        </Card>
        {message && <Feedback>{message}</Feedback>}
        <Button
          title="Continue as guest"
          secondary
          disabled={busy}
          onPress={() => router.replace("/home")}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
