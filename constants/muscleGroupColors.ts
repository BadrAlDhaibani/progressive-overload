import { useColorScheme } from 'react-native';

import type { MuscleGroup } from './muscleGroups';

type MuscleGroupColor = { bg: string; text: string };

const lightColors: Record<MuscleGroup, MuscleGroupColor> = {
  Chest:      { bg: '#ffe4e6', text: '#be123c' },
  Back:       { bg: '#dbeafe', text: '#1d4ed8' },
  Shoulders:  { bg: '#ffedd5', text: '#c2410c' },
  Biceps:     { bg: '#dcfce7', text: '#15803d' },
  Triceps:    { bg: '#ede9fe', text: '#7c3aed' },
  Quads:      { bg: '#ccfbf1', text: '#0f766e' },
  Hamstrings: { bg: '#fef3c7', text: '#b45309' },
  Glutes:     { bg: '#fce7f3', text: '#be185d' },
  Core:       { bg: '#e0e7ff', text: '#4338ca' },
  Calves:     { bg: '#cffafe', text: '#0e7490' },
};

const darkColors: Record<MuscleGroup, MuscleGroupColor> = {
  Chest:      { bg: '#3d1520', text: '#fda4af' },
  Back:       { bg: '#1e2a4a', text: '#93bbfd' },
  Shoulders:  { bg: '#3b2010', text: '#fdba74' },
  Biceps:     { bg: '#132a1c', text: '#86efac' },
  Triceps:    { bg: '#2a1f4e', text: '#c4b5fd' },
  Quads:      { bg: '#112b2b', text: '#5eead4' },
  Hamstrings: { bg: '#332508', text: '#fcd34d' },
  Glutes:     { bg: '#3d1232', text: '#f9a8d4' },
  Core:       { bg: '#1e1b4b', text: '#a5b4fc' },
  Calves:     { bg: '#133040', text: '#67e8f9' },
};

export function useMuscleGroupColors(): Record<MuscleGroup, MuscleGroupColor> {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
