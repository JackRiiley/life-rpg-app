import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebase/config'; // Import your db config
import { UserStats } from '../types';
import { checkAchievements, updateProgress } from './achievementService';

/**
 * Grants XP and Coins to a user and handles level-ups.
 * @param userId The UID of the user.
 * @param xpAmount The amount of XP to grant.
 * @param coinAmount The amount of Coins to grant.
 */
export const grantRewards = async (userId: string, xpAmount: number, coinAmount: number) => {
  if (!userId) return;

  const userStatsRef = doc(db, 'users', userId);
  try {
    const userDoc = await getDoc(userStatsRef);
    if (!userDoc.exists()) {
      console.error("User stats doc not found!");
      return;
    }
    
    let stats = userDoc.data() as UserStats;
    let leveledUp = false;

    // --- Grant XP & Handle Level Up ---
    if (xpAmount > 0) {
      // Check for valid number, default to 0
      const currentXp = (stats.currentXp && !isNaN(stats.currentXp)) ? stats.currentXp : 0;
      stats.currentXp = currentXp + xpAmount;
      console.log(`+${xpAmount} XP! New total: ${stats.currentXp}`);

      if (stats.currentXp >= stats.xpToNextLevel) {
        leveledUp = true;
        stats.level += 1;
        const remainingXp = stats.currentXp - stats.xpToNextLevel;
        stats.currentXp = remainingXp;
        stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.5);
        stats.attributePoints += 1;
        stats.rank = getRank(stats.level);
        
        Alert.alert(
          "LEVEL UP!",
          `You are now Level ${stats.level} (Rank ${stats.rank})!\n\nYou have 1 new attribute point to spend.`
        );
      }
    }

    // --- Grant Coins ---
    if (coinAmount > 0) {
      // Check for valid number, default to 0
      const currentCoins = (stats.coins && !isNaN(stats.coins)) ? stats.coins : 0;
      stats.coins = currentCoins + coinAmount;
      console.log(`+${coinAmount} Coins! New total: ${stats.coins}`);
    }
    
    // --- UPDATE FIRESTORE ---
    await updateDoc(userStatsRef, {
      currentXp: stats.currentXp,
      coins: stats.coins, // Add coins to the update
      // Only update these if a level-up occurred
      ...(leveledUp && { 
        level: stats.level,
        xpToNextLevel: stats.xpToNextLevel,
        attributePoints: stats.attributePoints,
        rank: stats.rank,
      })
    });

    // --- CHECK ACHIEVEMENTS (Must be done AFTER update) ---
    
    // 1. Check for coin achievements (if we earned any)
    if (coinAmount > 0) {
      await updateProgress(userId, 'totalCoinsEarned', coinAmount);
    }
    
    // 2. Check for level achievements (if we leveled up)
    if (leveledUp) {
      // Get the *final* updated stats to check against
      const finalDoc = await getDoc(userStatsRef);
      const finalStats = finalDoc.data() as UserStats;
      await checkAchievements(userId, finalStats); // Just check, don't increment
    }

  } catch (error) {
    console.error("Error granting rewards:", error);
  }
};

// --- RANK HELPER ---

/**
 * Calculates a user's Rank based on their level.
 * @param level The user's current level.
 * @returns A string representing the user's Rank (e.g., "E", "D", "S").
 */
const getRank = (level: number): string => {
  if (level >= 50) return 'S';
  if (level >= 40) return 'A';
  if (level >= 30) return 'B';
  if (level >= 20) return 'C';
  if (level >= 10) return 'D';
  return 'E'; // Default starting rank
};