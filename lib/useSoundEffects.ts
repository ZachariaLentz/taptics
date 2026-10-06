import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
export function useSoundEffects() {
  const success = useAudioPlayer(require("../assets/sfx/success.mp3"));
  const fail = useAudioPlayer(require("../assets/sfx/fail.mp3"));
  const flashSound = useAudioPlayer(require("../assets/sfx/flash.mp3"));
  const play = (sound: ReturnType<typeof useAudioPlayer>) => {
    try {
      void sound
        .seekTo(0)
        .then(() => sound.play())
        .catch(() => undefined);
    } catch {
      /* Visible feedback remains available if audio is unsupported. */
    }
  };
  const feedback = (correct: boolean) => {
    play(correct ? success : fail);
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
  };
  return { feedback, flash: () => play(flashSound) };
}
