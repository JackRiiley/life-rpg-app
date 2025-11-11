import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
  updateDoc
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebase/config';
import { Achievement, ProgressStat, UserStats } from '../types';
/**
* --- Step 3: Unlocks an achievement for the user ---
 * This function is now idempotent (safe to call multiple times).
 */
async function unlockAchievement(
  userStatsRef: any,
  userId: string,
  achievement: any
) {
  try {
    const achievementId = achievement.id;
    const newAchievementRef = doc(
      db,
      'users',
      userId,
      'unlockedAchievements',
      achievementId
    );

    let wasNewlyUnlocked = false;

    await runTransaction(db, async (transaction) => {
      // --- ALL READS FIRST ---
      const userDoc = await transaction.get(userStatsRef);
      const achDoc = await transaction.get(newAchievementRef); // Read the achievement doc

      if (!userDoc.exists()) throw new Error("User document not found!");
      
      // --- CHECK IF ALREADY UNLOCKED (inside transaction) ---
      if (achDoc.exists()) {
        // console.log(`Achievement ${achievementId} already unlocked. Skipping.`);
        return; // Already have it, do nothing.
      }
      
      // If we are here, it's a new unlock
      wasNewlyUnlocked = true;
      const userData = userDoc.data() as UserStats;

      // --- ALL WRITES LAST ---
      // 1. WRITE the new achievement (using create, not set)
      transaction.set(newAchievementRef, { // <-- USE create
        ...achievement.data(),
        unlockedAt: new Date(),
      });

      // 2. WRITE the new title (if they don't have one)
      if (!userData.selectedTitle) {
        transaction.update(userStatsRef, {
          selectedTitle: achievement.data().unlockedTitle,
        });
      }
    });

    // 3. Notify the user (only if it was a new unlock)
    if (wasNewlyUnlocked) {
      Alert.alert(
        'Achievement Unlocked!',
        `${achievement.data().title}\n\nYou've earned the title: "${
          achievement.data().unlockedTitle
        }"`
      );
    }
  } catch (error) {
    console.error('Error unlocking achievement:', error);
  }
}

// --- 3. REPLACE checkAchievements ---
/**
 * --- Step 2: Checks all achievements against the user's current stats ---
 * Now uses a for...of loop to 'await' unlocks.
 */
export async function checkAchievements(userId: string, userStats: UserStats) {
  try {
    const unlockedSnapshot = await getDocs(
      collection(db, 'users', userId, 'unlockedAchievements')
    );
    const unlockedIds = new Set(unlockedSnapshot.docs.map((doc) => doc.id));
    const masterListSnapshot = await getDocs(collection(db, 'achievements'));
    const userStatsRef = doc(db, 'users', userId);

    for (const achievementDoc of masterListSnapshot.docs) {
      const achievementId = achievementDoc.id;
      
      // --- CHANGE 1: Cast the data to our new type ---
      const achievement = achievementDoc.data() as Achievement;

      // Condition 1: User has NOT unlocked this yet
      if (!unlockedIds.has(achievementId)) {
        let shouldUnlock = false;
        const stat = achievement.statToTrack;
        const threshold = achievement.unlockThreshold;

        // --- CHANGE 2: Simplified 'if/else' logic ---
        // This structure helps TypeScript understand the types.
        if (stat === 'level') {
          if (userStats.level >= threshold) shouldUnlock = true;
        } else {
          // If stat is not 'level', TypeScript knows it MUST be a ProgressStat
          // so this access is now safe.
          if (userStats.progress[stat] >= threshold) shouldUnlock = true;
        }
        // --- End of changes ---

        if (shouldUnlock) {
          console.log(`Unlocking achievement: ${achievementId}`);
          await unlockAchievement(userStatsRef, userId, achievementDoc);
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

/**
 * --- Step 1: The main function we call from our app ---
 * It increments a progress stat and then triggers the achievement checker.
 */
export const updateProgress = async (
  userId: string,
  stat: ProgressStat,
  amount: number
) => {
  if (!userId || amount <= 0) return;

  try {
    const userStatsRef = doc(db, 'users', userId);
    const statKey = `progress.${stat}`; // e.g., "progress.tasksCompleted"

    // 1. Increment the progress stat
    await updateDoc(userStatsRef, {
      [statKey]: increment(amount),
    });

    // 2. Get the user's *new* stats
    const updatedUserDoc = await getDoc(userStatsRef);
    const updatedStats = updatedUserDoc.data() as UserStats;

    // 3. Run the checker
    await checkAchievements(userId, updatedStats);
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};