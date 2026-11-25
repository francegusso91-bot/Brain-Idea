import * as Haptics from 'expo-haptics';
import { Link, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { classifyIdea, describeError } from '@/lib/ai';
import { getApiKey } from '@/lib/settings';
import { useSpeech } from '@/lib/speech';
import { useStore } from '@/lib/store';
import { Theme, useTheme } from '@/lib/theme';
import type { Folder } from '@/lib/types';

type Phase = 'idle' | 'listening' | 'review' | 'thinking';

export default function Home() {
  const t = useTheme();
  const s = styles(t);
  const store = useStore();
  const speech = useSpeech('it-IT');

  const [apiKey, setKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then(setKey);
    }, []),
  );

  const haptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const onMainButton = async () => {
    haptic();
    setMessage(null);
    if (phase === 'listening' || speech.listening) {
      speech.stop();
      setPhase('review');
      return;
    }
    if (!speech.available) {
      setPhase('review');
      return;
    }
    setDraft('');
    await speech.start();
    setPhase('listening');
  };

  const text = phase === 'listening' ? speech.transcript : draft || speech.transcript;

  const save = async () => {
    const idea = text.trim();
    if (!idea) return;
    if (!apiKey) {
      router.push('/settings');
      return;
    }
    setPhase('thinking');
    try {
      const result = await classifyIdea(apiKey, idea, store.folders);
      const folder = store.addIdea(idea, result);
      setMessage(
        result.decision === 'new'
          ? `Nuova cartella creata: «${folder.name}»`
          : `Aggiunta a «${folder.name}»`,
      );
      setDraft('');
      speech.reset();
      setPhase('idle');
      haptic();
    } catch (e) {
      setMessage(describeError(e));
      setPhase('review');
    }
  };

  const cancel = () => {
    speech.stop();
    speech.reset();
    setDraft('');
    setPhase('idle');
  };

  const listening = phase === 'listening';
  const showEditor = phase === 'review' || phase === 'thinking';

  return (
    <View style={s.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={12}>
                <Text style={s.headerLink}>⚙︎</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={s.top}>
        {!apiKey && (
          <Link href="/settings" asChild>
            <Pressable style={s.banner}>
              <Text style={s.bannerText}>Per iniziare inserisci la tua chiave API di Claude ›</Text>
            </Pressable>
          </Link>
        )}

        {showEditor ? (
          <View style={s.editor}>
            <TextInput
              style={s.input}
              multiline
              autoFocus={!speech.transcript}
              placeholder="Scrivi o correggi la tua idea…"
              placeholderTextColor={t.muted}
              value={text}
              onChangeText={setDraft}
              editable={phase !== 'thinking'}
            />
            <View style={s.row}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={cancel} disabled={phase === 'thinking'}>
                <Text style={s.btnGhostText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnPrimary, (!text.trim() || phase === 'thinking') && s.disabled]}
                onPress={save}
                disabled={!text.trim() || phase === 'thinking'}>
                {phase === 'thinking' ? (
                  <ActivityIndicator color={t.accentText} />
                ) : (
                  <Text style={s.btnPrimaryText}>Salva idea</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={s.recordArea}>
            <Pressable
              onPress={onMainButton}
              style={({ pressed }) => [s.record, listening && s.recordOn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Ferma la registrazione' : 'Registra una nuova idea'}>
              <Text style={s.recordIcon}>{listening ? '■' : '●'}</Text>
            </Pressable>
            <Text style={s.hint}>
              {listening
                ? 'Ti ascolto… tocca per fermare'
                : speech.available
                  ? 'Tocca e racconta la tua idea'
                  : 'Tocca per scrivere la tua idea'}
            </Text>
            {listening && !!speech.transcript && (
              <Text style={s.live} numberOfLines={4}>
                {speech.transcript}
              </Text>
            )}
          </View>
        )}

        {!!(message || speech.error) && <Text style={s.message}>{message || speech.error}</Text>}
      </View>

      <FlatList
        data={store.folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          store.folders.length > 0 ? <Text style={s.sectionTitle}>Progetti</Text> : undefined
        }
        ListEmptyComponent={
          store.loaded ? (
            <Text style={s.empty}>Nessuna idea ancora. Le cartelle si creeranno da sole.</Text>
          ) : undefined
        }
        renderItem={({ item }) => <FolderRow folder={item} s={s} />}
      />
    </View>
  );
}

function FolderRow({ folder, s }: { folder: Folder; s: ReturnType<typeof styles> }) {
  const open = folder.points.filter((p) => p.status === 'open').length;
  return (
    <Link href={{ pathname: '/folder/[id]', params: { id: folder.id } }} asChild>
      <Pressable style={s.folder}>
        <Text style={s.folderIcon}>📁</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.folderName} numberOfLines={1}>
            {folder.name}
          </Text>
          <Text style={s.folderMeta}>
            {folder.ideas.length} {folder.ideas.length === 1 ? 'idea' : 'idee'} · {open} da fare
          </Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    top: { paddingHorizontal: 20, paddingTop: 8 },
    headerLink: { fontSize: 22, color: t.text, paddingHorizontal: 4 },
    banner: {
      backgroundColor: t.card,
      borderColor: t.accent,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    bannerText: { color: t.accent, fontWeight: '600' },
    recordArea: { alignItems: 'center', paddingVertical: 28 },
    record: {
      width: 168,
      height: 168,
      borderRadius: 84,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: t.accent,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    recordOn: { backgroundColor: t.text, shadowColor: t.text },
    recordIcon: { fontSize: 56, color: t.accentText },
    hint: { marginTop: 18, fontSize: 16, color: t.muted },
    live: { marginTop: 14, fontSize: 16, color: t.text, textAlign: 'center', lineHeight: 22 },
    editor: { paddingVertical: 12 },
    input: {
      minHeight: 140,
      maxHeight: 260,
      backgroundColor: t.card,
      borderColor: t.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      lineHeight: 22,
      color: t.text,
      textAlignVertical: 'top',
    },
    row: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimary: { backgroundColor: t.accent },
    btnPrimaryText: { color: t.accentText, fontWeight: '700', fontSize: 16 },
    btnGhost: { borderColor: t.border, borderWidth: 1 },
    btnGhostText: { color: t.text, fontSize: 16 },
    disabled: { opacity: 0.5 },
    message: { textAlign: 'center', color: t.text, marginBottom: 8, fontSize: 15 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: t.muted, marginVertical: 10, letterSpacing: 0.6 },
    empty: { textAlign: 'center', color: t.muted, marginTop: 24 },
    folder: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderColor: t.border,
      borderWidth: 1,
    },
    folderIcon: { fontSize: 24 },
    folderName: { fontSize: 17, fontWeight: '600', color: t.text },
    folderMeta: { fontSize: 13, color: t.muted, marginTop: 2 },
    chevron: { fontSize: 24, color: t.muted },
  });
