# Brain Idea

App mobile (Expo / React Native) per registrare a voce le proprie idee.

## Come funziona

1. Tocchi il **bottone grande** e racconti la tua idea. Il telefono la trascrive (riconoscimento vocale del dispositivo, in italiano).
2. Tocchi di nuovo per fermare: puoi correggere il testo e premere **Salva idea**.
3. Claude (`claude-opus-5-5`) legge l'idea e l'elenco dei progetti già esistenti, e decide:
   - se appartiene a una **cartella esistente** (es. un'altra idea sugli Egizi va in «Storia degli Egizi»);
   - oppure se è un'idea nuova: crea una **nuova cartella** con un nome automatico, che puoi modificare.
4. In ogni cartella trovi:
   - **In breve**: un riassunto semplice di tutto il progetto, aggiornato a ogni idea;
   - **Da fare**: una checklist di punti. Spunta ✓ quando è fatto, ✕ quando non serve più (tocca di nuovo per ripristinare). Puoi aggiungere punti a mano;
   - **Idee registrate**: ogni idea in versione semplice, con il testo completo originale (tocca per espanderlo).

I dati restano sul telefono (AsyncStorage). La chiave API di Claude si inserisce dalle impostazioni (⚙︎) e viene salvata in modo sicuro sul dispositivo (SecureStore).

## Avvio

```bash
npm install
npx expo start
```

Il riconoscimento vocale usa un modulo nativo (`expo-speech-recognition`), quindi **in Expo Go non è disponibile**: l'app funziona lo stesso, ma il bottone apre una casella per scrivere l'idea. Per usare la voce serve una development build:

```bash
npx expo run:android   # oppure: npx eas-cli@latest build --profile development --platform android
npx expo run:ios       # richiede macOS
```

Sul web (`npx expo start --web`) la voce funziona nei browser che supportano la Web Speech API (Chrome).

## Struttura

- `src/app/index.tsx`: schermata principale (bottone di registrazione + elenco progetti)
- `src/app/folder/[id].tsx`: dettaglio di una cartella (nome modificabile, riassunto, checklist, idee)
- `src/app/settings.tsx`: chiave API
- `src/lib/ai.ts`: chiamata a Claude con output strutturato
- `src/lib/speech.ts`: riconoscimento vocale
- `src/lib/store.tsx`: dati salvati sul dispositivo
