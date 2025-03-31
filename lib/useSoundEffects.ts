import { useEffect, useState } from 'react';
import { Audio } from 'expo-av';

export function useSoundEffects() {
  const [successSound, setSuccessSound] = useState<Audio.Sound | null>(null);
  const [failSound, setFailSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    let success: Audio.Sound;
    let fail: Audio.Sound;

    const loadSounds = async () => {
      const { sound: successLoaded } = await Audio.Sound.createAsync(
        require('../assets/sfx/success.mp3')
      );
      const { sound: failLoaded } = await Audio.Sound.createAsync(
        require('../assets/sfx/fail.mp3')
      );

      success = successLoaded;
      fail = failLoaded;

      setSuccessSound(successLoaded);
      setFailSound(failLoaded);
    };

    loadSounds();

    return () => {
      success?.unloadAsync();
      fail?.unloadAsync();
    };
  }, []);

  const playSuccess = async () => {
    if (successSound) await successSound.replayAsync();
  };

  const playFail = async () => {
    if (failSound) await failSound.replayAsync();
  };

  return { playSuccess, playFail };
}
