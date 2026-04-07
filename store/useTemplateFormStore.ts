import { create } from 'zustand';

export interface TemplateExerciseEntry {
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  equipment: string;
  default_sets: number;
  default_reps: number;
}

interface TemplateFormState {
  exercises: TemplateExerciseEntry[];
  addExercise: (entry: TemplateExerciseEntry) => void;
  removeExercise: (exerciseId: number) => void;
  updateDefaults: (exerciseId: number, sets: number, reps: number) => void;
  setExercises: (exercises: TemplateExerciseEntry[]) => void;
  reset: () => void;
}

export const useTemplateFormStore = create<TemplateFormState>((set) => ({
  exercises: [],

  addExercise: (entry) =>
    set((state) => ({
      exercises: [...state.exercises, entry],
    })),

  removeExercise: (exerciseId) =>
    set((state) => ({
      exercises: state.exercises.filter((e) => e.exercise_id !== exerciseId),
    })),

  updateDefaults: (exerciseId, sets, reps) =>
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.exercise_id === exerciseId
          ? { ...e, default_sets: sets, default_reps: reps }
          : e
      ),
    })),

  setExercises: (exercises) => set({ exercises }),

  reset: () => set({ exercises: [] }),
}));
