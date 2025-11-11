// This file will hold all common data structures for our app.

/**
 * Represents a user-created task or habit.
 */
export interface Task {
  id: string;
  title: string;
  isComplete: boolean;
  xp: number;
  type: 'daily' | 'todo';
  // We will add 'attributes' here later
}

/**
 * Represents a randomly assigned daily quest,
 * which extends the base Task.
*/
export interface ActiveQuest extends Task {
    originalQuestId: string; // The ID from the 'questPool'
}

/**
 * A union type for tasks displayed in sections,
 */
export type SectionTask = Task | ActiveQuest;

/**
 * Represents the player's stats stored in the 'users' collection.
 */
export interface UserStats {
  uid: string;
  email: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  lastResetDate: string;
  // We will add 'attributes' here later
}