import { doc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserStats } from '../types';

/**
 * Helper function to get today's date in 'YYYY-MM-DD' format.
 */
const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Checks and updates the user's daily streak.
 * This should be called *any time* a user completes a task.
 * @param userId The UID of the user.
 */
export const updateStreak = async (userId: string) => {
  const userStatsRef = doc(db, 'users', userId);
  const today = getTodayDateString();

  try {
    const userDoc = await getDoc(userStatsRef);
    if (!userDoc.exists()) {
      console.error('User stats doc not found for streak update.');
      return;
    }

    const stats = userDoc.data() as UserStats;
    const lastCompleted = stats.lastCompletedDate;

    // --- 1. Already completed a task today ---
    if (lastCompleted === today) {
      console.log('Streak already updated today.');
      return; // Do nothing
    }

    // --- 2. Check if yesterday was the last completed date ---
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (lastCompleted === yesterday) {
      // --- 3. Streak is continued! ---
      console.log('Streak continued!');
      await updateDoc(userStatsRef, {
        currentStreak: increment(1),
        lastCompletedDate: today,
      });
    } else {
      // --- 4. Streak is broken or just started ---
      console.log('Streak broken or started new.');
      await updateDoc(userStatsRef, {
        currentStreak: 1, // Reset to 1
        lastCompletedDate: today,
      });
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
};

/**
 * Checks if the user's streak is broken, but does NOT award a streak.
 * This is for checking when the app first loads.
 * @param userId The UID of the user.
 */
export const checkStreak = async (userId: string) => {
  const userStatsRef = doc(db, 'users', userId);
  const today = getTodayDateString();

  try {
    const userDoc = await getDoc(userStatsRef);
    if (!userDoc.exists()) return;

    const stats = userDoc.data() as UserStats;
    const lastCompleted = stats.lastCompletedDate;

    // If they've already completed a task today, or have no streak, do nothing
    if (lastCompleted === today || stats.currentStreak === 0) {
      return;
    }

    // Check if the last completion was *before* yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastCompleted !== yesterday) {
      // --- Streak is broken! ---
      console.log(`Streak broken. Last completed: ${lastCompleted}`);
      await updateDoc(userStatsRef, {
        currentStreak: 0, // Reset to 0
      });
    }
  } catch (error) {
    console.error('Error checking streak:', error);
  }
};