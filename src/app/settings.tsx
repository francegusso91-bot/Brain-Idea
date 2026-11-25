import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MODEL } from '@/lib/ai';
import { getApiKey, setApiKey } from '@/lib/settings';
import { Theme, useTheme } from '@/lib/theme';

export default function Settings() {
  const t = useTheme();
  const s = styles(t);
  const [key, setKey] = useState('');

  useEffect(() => {
    getApiKey().then((k) => setKey(k ?? ''));
  }, []);

  const save = async () => {
    await setApiKey(key);
    router.back();
  };

  return (
    <View style={s.screen}>
      <Text style={s.label}>Chiave API di Claude</Text>
      <TextInput
        style={s.input}
        value={key}
        onChangeText={setKey}
        placeholder="sk-ant-..."
        placeholderTextColor={t.muted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Text style={s.help}>
        La chiave resta salvata solo su questo telefono. Puoi crearne una su{' '}
        <Text style={s.link} onPress={() => Linking.openURL('https://platform.claude.com/settings/keys')}>
          platform.claude.com
        </Text>
        .
      </Text>
      <Pressable style={s.btn} onPress={save}>
        <Text style={s.btnText}>Salva</Text>
      </Pressable>
      <Text style={s.footer}>Modello: {MODEL}</Text>
    </View>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg, padding: 20 },
    label: { fontSize: 13, fontWeight: '700', color: t.muted, marginBottom: 8 },
    input: {
      backgroundColor: t.card,
      borderColor: t.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: t.text,
    },
    help: { color: t.muted, marginTop: 10, lineHeight: 20 },
    link: { color: t.accent },
    btn: {
      marginTop: 20,
      height: 48,
      borderRadius: 12,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: { color: t.accentText, fontWeight: '700', fontSize: 16 },
    footer: { marginTop: 'auto', color: t.muted, textAlign: 'center', fontSize: 12 },
  });
