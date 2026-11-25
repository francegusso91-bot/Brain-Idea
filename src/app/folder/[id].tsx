import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStore } from '@/lib/store';
import { Theme, useTheme } from '@/lib/theme';
import type { Idea, Point, PointStatus } from '@/lib/types';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const s = styles(t);
  const store = useStore();
  const folder = store.folders.find((f) => f.id === id);

  const [name, setName] = useState(folder?.name ?? '');
  const [newPoint, setNewPoint] = useState('');

  useEffect(() => {
    if (folder) setName(folder.name);
    // aggiorna solo quando cambia il nome salvato
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder?.name]);

  if (!folder) {
    return (
      <View style={s.screen}>
        <Text style={s.empty}>Cartella non trovata.</Text>
      </View>
    );
  }

  const open = folder.points.filter((p) => p.status === 'open');
  const closed = folder.points.filter((p) => p.status !== 'open');

  const toggle = (p: Point, status: PointStatus) =>
    store.setPointStatus(folder.id, p.id, p.status === status ? 'open' : status);

  const confirmDelete = () => {
    const doDelete = () => {
      store.deleteFolder(folder.id);
      router.back();
    };
    const msg = `Eliminare «${folder.name}» con tutte le sue idee?`;
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) doDelete();
      return;
    }
    Alert.alert('Elimina cartella', msg, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: folder.name }} />

      <TextInput
        style={s.name}
        value={name}
        onChangeText={setName}
        onEndEditing={() => store.renameFolder(folder.id, name)}
        onBlur={() => store.renameFolder(folder.id, name)}
        returnKeyType="done"
        accessibilityLabel="Nome della cartella"
      />
      <Text style={s.editHint}>Tocca il nome per modificarlo</Text>

      {!!folder.summary && (
        <View style={s.card}>
          <Text style={s.label}>IN BREVE</Text>
          <Text style={s.summary}>{folder.summary}</Text>
        </View>
      )}

      <Text style={s.section}>DA FARE · {open.length}</Text>
      {open.map((p) => (
        <PointRow key={p.id} p={p} s={s} onToggle={toggle} />
      ))}
      <View style={s.addRow}>
        <TextInput
          style={s.addInput}
          placeholder="Aggiungi un punto…"
          placeholderTextColor={t.muted}
          value={newPoint}
          onChangeText={setNewPoint}
          onSubmitEditing={() => {
            if (newPoint.trim()) store.addPoint(folder.id, newPoint);
            setNewPoint('');
          }}
          returnKeyType="done"
        />
      </View>

      {closed.length > 0 && (
        <>
          <Text style={s.section}>COMPLETATI O NON PIÙ NECESSARI · {closed.length}</Text>
          {closed.map((p) => (
            <PointRow key={p.id} p={p} s={s} onToggle={toggle} />
          ))}
        </>
      )}

      <Text style={s.section}>IDEE REGISTRATE · {folder.ideas.length}</Text>
      {folder.ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} s={s} />
      ))}

      <Pressable onPress={confirmDelete} style={s.delete}>
        <Text style={s.deleteText}>Elimina cartella</Text>
      </Pressable>
    </ScrollView>
  );
}

function PointRow({
  p,
  s,
  onToggle,
}: {
  p: Point;
  s: ReturnType<typeof styles>;
  onToggle: (p: Point, status: PointStatus) => void;
}) {
  return (
    <View style={s.point}>
      <Pressable
        onPress={() => onToggle(p, 'done')}
        style={[s.check, p.status === 'done' && s.checkDone]}
        hitSlop={8}
        accessibilityLabel={p.status === 'done' ? 'Segna come da fare' : 'Segna come fatto'}>
        {p.status === 'done' && <Text style={s.checkMark}>✓</Text>}
      </Pressable>
      <Text
        style={[
          s.pointText,
          p.status === 'done' && s.pointDone,
          p.status === 'dropped' && s.pointDropped,
        ]}>
        {p.text}
      </Text>
      <Pressable
        onPress={() => onToggle(p, 'dropped')}
        hitSlop={8}
        accessibilityLabel={p.status === 'dropped' ? 'Ripristina' : 'Non più necessario'}>
        <Text style={[s.drop, p.status === 'dropped' && s.dropOn]}>
          {p.status === 'dropped' ? '↺' : '✕'}
        </Text>
      </Pressable>
    </View>
  );
}

function IdeaCard({ idea, s }: { idea: Idea; s: ReturnType<typeof styles> }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(idea.createdAt).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Pressable style={s.card} onPress={() => setExpanded((v) => !v)}>
      <Text style={s.label}>{date.toUpperCase()}</Text>
      <Text style={s.ideaText}>{idea.simpleText}</Text>
      {expanded ? (
        <View style={s.full}>
          <Text style={s.label}>TESTO COMPLETO</Text>
          <Text style={s.fullText}>{idea.fullText}</Text>
        </View>
      ) : (
        <Text style={s.more}>Mostra testo completo</Text>
      )}
    </Pressable>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 60 },
    empty: { textAlign: 'center', color: t.muted, marginTop: 40 },
    name: { fontSize: 28, fontWeight: '700', color: t.text, paddingVertical: 4 },
    editHint: { fontSize: 12, color: t.muted, marginBottom: 16 },
    card: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderColor: t.border,
      borderWidth: 1,
    },
    label: { fontSize: 11, fontWeight: '700', color: t.muted, letterSpacing: 0.6, marginBottom: 6 },
    summary: { fontSize: 16, lineHeight: 23, color: t.text },
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: t.muted,
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 8,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomColor: t.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    check: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: t.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkDone: { backgroundColor: t.done, borderColor: t.done },
    checkMark: { color: '#fff', fontWeight: '800' },
    pointText: { flex: 1, fontSize: 16, lineHeight: 22, color: t.text },
    pointDone: { color: t.muted, textDecorationLine: 'line-through' },
    pointDropped: { color: t.dropped, textDecorationLine: 'line-through', fontStyle: 'italic' },
    drop: { fontSize: 16, color: t.muted, paddingHorizontal: 4 },
    dropOn: { color: t.accent },
    addRow: { marginTop: 6 },
    addInput: {
      fontSize: 16,
      color: t.text,
      paddingVertical: 10,
      borderBottomColor: t.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ideaText: { fontSize: 16, lineHeight: 23, color: t.text },
    more: { marginTop: 8, color: t.accent, fontSize: 14 },
    full: { marginTop: 12, paddingTop: 12, borderTopColor: t.border, borderTopWidth: StyleSheet.hairlineWidth },
    fullText: { fontSize: 15, lineHeight: 22, color: t.muted },
    delete: { marginTop: 36, alignItems: 'center', padding: 12 },
    deleteText: { color: t.accent, fontSize: 15 },
  });
