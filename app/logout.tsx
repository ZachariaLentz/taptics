import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Logout Error', error.message);
      }
      router.replace('/login');
    };

    logout();
  }, []);

  return null;
}
