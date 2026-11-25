import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F4EF',
  card: '#FFFFFF',
  text: '#1D1B18',
  muted: '#6F6A62',
  border: '#E4E0D8',
  accent: '#E0532F',
  accentText: '#FFFFFF',
  done: '#2F8F5B',
  dropped: '#9A948A',
};

const dark: typeof light = {
  bg: '#141311',
  card: '#1F1D1A',
  text: '#F2EFE9',
  muted: '#A39D93',
  border: '#33302B',
  accent: '#F26A45',
  accentText: '#FFFFFF',
  done: '#4DB27A',
  dropped: '#7A746B',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
