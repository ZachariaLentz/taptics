import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (data?.is_admin) {
        router.replace('./(admin)');
        setIsAdmin(true);
      } else {
        router.replace('./(tabs)');
        setIsAdmin(false);
      }
    };

    checkRole();
  }, []);

  if (isAdmin === null) return null;

  return <Slot />;
}
