import { create } from 'zustand';

import {
  insertSet,
  updateSet as dbUpdateSet,
  deleteSet as dbDeleteSet,
  finishWorkout as dbFinishWorkout,
  deleteWorkout,
} from '@/db/workouts';

export interface WorkoutExercise {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
}

export interface WorkoutSet {
  localId: string;
  exerciseId: number;
  setOrder: number;
  weight: number | null;
  reps: number | null;
  isComplete: boolean;
  dbId: number | null;
}

interface WorkoutState {
  workoutId: number | null;
  isActive: boolean;
  startedAt: number | null;
  exerciseIds: number[];
  exercises: Record<number, WorkoutExercise>;
  setIds: string[];
  sets: Record<string, WorkoutSet>;
  nextLocalId: number;

  startWorkout: (id: number) => void;
  addExercise: (id: number, name: string, muscleGroup: string) => void;
  addSet: (exerciseId: number) => void;
  addSetWithValues: (exerciseId: number, weight: number | null, reps: number | null) => void;
  updateSet: (localId: string, weight: number | null, reps: number | null) => void;
  removeExercise: (exerciseId: number) => void;
  removeSet: (localId: string) => void;
  completeSet: (localId: string) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
}

const initialState = {
  workoutId: null as number | null,
  isActive: false,
  startedAt: null as number | null,
  exerciseIds: [] as number[],
  exercises: {} as Record<number, WorkoutExercise>,
  setIds: [] as string[],
  sets: {} as Record<string, WorkoutSet>,
  nextLocalId: 1,
};

export const useWorkoutStore = create<WorkoutState>()((set, get) => ({
  ...initialState,

  startWorkout: (id: number) => {
    set({
      ...initialState,
      workoutId: id,
      isActive: true,
      startedAt: Date.now(),
    });
  },

  addExercise: (id: number, name: string, muscleGroup: string) => {
    const state = get();
    if (state.exerciseIds.includes(id)) return;

    set({
      exerciseIds: [...state.exerciseIds, id],
      exercises: {
        ...state.exercises,
        [id]: { exerciseId: id, exerciseName: name, muscleGroup },
      },
    });
  },

  addSet: (exerciseId: number) => {
    const state = get();
    const localId = `set_${state.nextLocalId}`;
    const existingCount = state.setIds.filter(
      (sid) => state.sets[sid].exerciseId === exerciseId
    ).length;

    set({
      setIds: [...state.setIds, localId],
      sets: {
        ...state.sets,
        [localId]: {
          localId,
          exerciseId,
          setOrder: existingCount + 1,
          weight: null,
          reps: null,
          isComplete: false,
          dbId: null,
        },
      },
      nextLocalId: state.nextLocalId + 1,
    });
  },

  addSetWithValues: (exerciseId: number, weight: number | null, reps: number | null) => {
    const state = get();
    const localId = `set_${state.nextLocalId}`;
    const existingCount = state.setIds.filter(
      (sid) => state.sets[sid].exerciseId === exerciseId
    ).length;

    set({
      setIds: [...state.setIds, localId],
      sets: {
        ...state.sets,
        [localId]: {
          localId,
          exerciseId,
          setOrder: existingCount + 1,
          weight,
          reps,
          isComplete: false,
          dbId: null,
        },
      },
      nextLocalId: state.nextLocalId + 1,
    });
  },

  updateSet: (localId: string, weight: number | null, reps: number | null) => {
    const state = get();
    const existing = state.sets[localId];
    if (!existing) return;

    set({
      sets: {
        ...state.sets,
        [localId]: { ...existing, weight, reps },
      },
    });
  },

  removeExercise: (exerciseId: number) => {
    const state = get();

    // Delete all persisted sets for this exercise
    const setsToRemove = state.setIds.filter(
      (sid) => state.sets[sid].exerciseId === exerciseId
    );
    for (const sid of setsToRemove) {
      if (state.sets[sid].dbId !== null) {
        dbDeleteSet(state.sets[sid].dbId!);
      }
    }

    // Remove sets from collections
    const newSetIds = state.setIds.filter(
      (sid) => state.sets[sid].exerciseId !== exerciseId
    );
    const newSets: Record<string, WorkoutSet> = {};
    for (const sid of newSetIds) {
      newSets[sid] = state.sets[sid];
    }

    // Remove exercise
    const { [exerciseId]: _, ...newExercises } = state.exercises;

    set({
      exerciseIds: state.exerciseIds.filter((id) => id !== exerciseId),
      exercises: newExercises,
      setIds: newSetIds,
      sets: newSets,
    });
  },

  removeSet: (localId: string) => {
    const state = get();
    const target = state.sets[localId];
    if (!target) return;

    // Delete from DB if persisted
    if (target.dbId !== null) {
      dbDeleteSet(target.dbId);
    }

    // Remove from collections
    const newSetIds = state.setIds.filter((sid) => sid !== localId);
    const { [localId]: _, ...newSets } = state.sets;

    // Re-number setOrder for remaining sets of the same exercise
    let order = 1;
    for (const sid of newSetIds) {
      if (newSets[sid].exerciseId === target.exerciseId) {
        newSets[sid] = { ...newSets[sid], setOrder: order++ };
      }
    }

    set({ setIds: newSetIds, sets: newSets });
  },

  completeSet: (localId: string) => {
    const state = get();
    const target = state.sets[localId];
    if (!target || state.workoutId === null) return;

    const toggled = !target.isComplete;

    if (toggled) {
      // Completing the set — write to DB
      if (target.dbId === null) {
        const dbId = insertSet(
          state.workoutId,
          target.exerciseId,
          target.setOrder,
          target.weight,
          target.reps
        );
        set({
          sets: {
            ...state.sets,
            [localId]: { ...target, isComplete: true, dbId },
          },
        });
      } else {
        dbUpdateSet(target.dbId, target.weight, target.reps, 1);
        set({
          sets: {
            ...state.sets,
            [localId]: { ...target, isComplete: true },
          },
        });
      }
    } else {
      // Un-completing — update DB
      if (target.dbId !== null) {
        dbUpdateSet(target.dbId, target.weight, target.reps, 0);
      }
      set({
        sets: {
          ...state.sets,
          [localId]: { ...target, isComplete: false },
        },
      });
    }
  },

  finishWorkout: () => {
    const state = get();
    if (state.workoutId === null) return;

    // Persist any complete sets that haven't been written yet
    for (const sid of state.setIds) {
      const s = state.sets[sid];
      if (s.isComplete && s.dbId === null) {
        insertSet(state.workoutId, s.exerciseId, s.setOrder, s.weight, s.reps);
      } else if (s.isComplete && s.dbId !== null) {
        dbUpdateSet(s.dbId, s.weight, s.reps, 1);
      }
    }

    dbFinishWorkout(state.workoutId);
    set({ ...initialState });
  },

  discardWorkout: () => {
    const state = get();
    if (state.workoutId !== null) {
      deleteWorkout(state.workoutId);
    }
    set({ ...initialState });
  },
}));
