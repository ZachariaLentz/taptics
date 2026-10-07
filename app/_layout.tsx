import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlayerProvider } from "../lib/PlayerProvider";
import { BootGate, colors } from "../components/ui";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <StatusBar style="dark" />
        <BootGate>
          <Stack
            screenOptions={{
              headerTintColor: colors.ink,
              headerStyle: { backgroundColor: colors.background },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="flash" options={{ title: "Flash Training" }} />
            <Stack.Screen
              name="score"
              options={{ title: "Workout complete", headerBackVisible: false }}
            />
            <Stack.Screen name="login" options={{ title: "Your account" }} />
          </Stack>
        </BootGate>
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
