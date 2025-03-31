import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { supabase } from '@lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Error', error.message);
    } else {
      router.replace('/profile');
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) {
        Alert.alert('Account Exists', 'This email is already registered. Try logging in.');
      } else {
        Alert.alert('Signup Error', error.message);
      }
    } else {
      Alert.alert('Success', 'Check your email to confirm sign-up.');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      Alert.alert('Google Login Error', error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Taptics</Text>

        <View style={styles.toggleRow}>
          <Button
            title="Login"
            onPress={() => setMode('login')}
            color={mode === 'login' ? '#007aff' : '#aaa'}
          />
          <Button
            title="Sign Up"
            onPress={() => setMode('signup')}
            color={mode === 'signup' ? '#007aff' : '#aaa'}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.buttonGroup}>
          {mode === 'login' ? (
            <Button title="Login" onPress={handleLogin} disabled={loading} />
          ) : (
            <Button title="Create Account" onPress={handleSignUp} disabled={loading} />
          )}
        </View>

        <View style={styles.separator} />

        <Button title="Continue with Google" onPress={handleGoogleLogin} />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  fieldGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16
  },
  buttonGroup: {
    marginTop: 10,
    marginBottom: 20
  },
  separator: {
    marginVertical: 20,
    borderBottomColor: '#ccc',
    borderBottomWidth: StyleSheet.hairlineWidth
  }
});
