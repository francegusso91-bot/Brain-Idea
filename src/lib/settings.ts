import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'anthropic_api_key';

// SecureStore non esiste sul web: lì si ripiega su AsyncStorage (localStorage).
export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(value: string): Promise<void> {
  const v = value.trim();
  if (Platform.OS === 'web') {
    if (v) await AsyncStorage.setItem(KEY, v);
    else await AsyncStorage.removeItem(KEY);
    return;
  }
  if (v) await SecureStore.setItemAsync(KEY, v);
  else await SecureStore.deleteItemAsync(KEY);
}
