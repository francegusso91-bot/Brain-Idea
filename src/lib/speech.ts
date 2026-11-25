import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Riconoscimento vocale sul dispositivo (expo-speech-recognition).
 * Il modulo nativo non c'è in Expo Go: in quel caso `available` è false
 * e l'app offre di scrivere l'idea a mano.
 */
type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let Speech: SpeechModule | null = null;
try {
  Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechModule;
} catch {
  Speech = null;
}

export function useSpeech(lang = 'it-IT') {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const committed = useRef('');

  const available = !!Speech && safeAvailable();

  useEffect(() => {
    if (!Speech) return;
    const subs = [
      Speech.addListener('start', () => setListening(true)),
      Speech.addListener('end', () => setListening(false)),
      Speech.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        if (event.isFinal) {
          committed.current = join(committed.current, text);
          setTranscript(committed.current);
        } else {
          setTranscript(join(committed.current, text));
        }
      }),
      Speech.addListener('error', (event) => {
        // "no-speech" e "aborted" non sono veri errori per l'utente.
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(event.message || event.error);
        }
        setListening(false);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const start = useCallback(async () => {
    if (!Speech) return;
    setError(null);
    committed.current = '';
    setTranscript('');
    const perm = await Speech.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Serve il permesso per il microfono e il riconoscimento vocale.');
      return;
    }
    Speech.start({ lang, interimResults: true, continuous: true, addsPunctuation: true });
  }, [lang]);

  const stop = useCallback(() => Speech?.stop(), []);

  const reset = useCallback(() => {
    committed.current = '';
    setTranscript('');
    setError(null);
  }, []);

  return { available, listening, transcript, error, start, stop, reset };
}

function safeAvailable() {
  try {
    return Speech!.isRecognitionAvailable();
  } catch {
    return false;
  }
}

function join(a: string, b: string) {
  return [a.trim(), b.trim()].filter(Boolean).join(' ');
}
