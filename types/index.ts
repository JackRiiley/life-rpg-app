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
  coins: number;
  selectedTitle: string;

  // --- V2 Attributes ---
  attributePoints: number; // Points to spend on level up
  rank: string; // Player's rank based on level
  attributes: {
    strength: number;
    intellect: number;
    stamina: number;
    // We can add more later
  };

  progress: {
    tasksCompleted: number;
    totalCoinsEarned: number;
    // We can add bossesDefeated, etc. later
  };
}

export type ProgressStat = 'tasksCompleted' | 'totalCoinsEarned';

export interface Achievement {
  title: string;
  description: string;
  unlockedTitle: string;
  statToTrack: 'level' | ProgressStat; // The stat to check
  unlockThreshold: number;
}

/**
 * Represents a single task (attack) linked to a Boss.
 */
export interface BossAttack {
  id: string;
  title: string;
  damage: number;
  xp: number;
  coins: number;
  isComplete: boolean;
  attribute: 'strength' | 'intellect' | 'stamina';
}

/**
 * Represents a large project (Boss) in the 'bosses' collection.
 */
export interface Boss {
  id: string;
  ownerId: string;
  name: string;
  totalHp: number;
  currentHp: number;
  isComplete: boolean;
  // We'll add the list of attacks from the subcollection
  attacks: BossAttack[];
}