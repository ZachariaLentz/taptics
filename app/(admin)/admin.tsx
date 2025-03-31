import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ScrollView } from 'react-native';
import { supabase } from '@lib/supabase';

export default function AdminDashboard() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfileAndConfig = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'No user session');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.');
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase.from('level_config').select('*').single();
    if (error) {
      Alert.alert('Error fetching config', error.message);
    } else {
      setConfig(data);
    }
    setLoading(false);
  };

  const updateConfig = async () => {
    const { error } = await supabase.from('level_config').update(config).eq('id', config.id);
    if (error) {
      Alert.alert('Error updating config', error.message);
    } else {
      Alert.alert('Success', 'Config updated');
    }
  };

  useEffect(() => {
    fetchProfileAndConfig();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading configuration...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text>You do not have access to this page.</Text>
      </View>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin Level Config</Text>

      <Text style={styles.label}>Min Terms</Text>
      <TextInput
        style={styles.input}
        value={config.num_terms_min.toString()}
        onChangeText={(v) => setConfig({ ...config, num_terms_min: parseInt(v) })}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Max Terms</Text>
      <TextInput
        style={styles.input}
        value={config.num_terms_max.toString()}
        onChangeText={(v) => setConfig({ ...config, num_terms_max: parseInt(v) })}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Op Breakpoints (JSON)</Text>
      <TextInput
        style={styles.input}
        value={JSON.stringify(config.op_breakpoints)}
        onChangeText={(v) => setConfig({ ...config, op_breakpoints: JSON.parse(v) })}
        multiline
      />

      <Text style={styles.label}>Value Range Formula (JS)</Text>
      <TextInput
        style={styles.input}
        value={config.value_range_formula}
        onChangeText={(v) => setConfig({ ...config, value_range_formula: v })}
        multiline
      />

      <Text style={styles.label}>Flash Delay Formula (JS)</Text>
      <TextInput
        style={styles.input}
        value={config.flash_delay_formula}
        onChangeText={(v) => setConfig({ ...config, flash_delay_formula: v })}
        multiline
      />

      <Text style={styles.label}>Allow Decimals at Level</Text>
      <TextInput
        style={styles.input}
        value={config.allow_decimals_level.toString()}
        onChangeText={(v) => setConfig({ ...config, allow_decimals_level: parseInt(v) })}
        keyboardType="numeric"
      />

      <Button title="Save Config" onPress={updateConfig} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'flex-start'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    marginTop: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginTop: 4
  }
});
