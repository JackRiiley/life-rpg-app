import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebase/config'; // Import your db config
import { UserStats } from '../types';

/**
 * Grants a specified amount of XP to a user and handles level-ups.
 */
export const grantXp = async (userId: string, amount: number) => {
  if (!userId || amount <= 0) return;

  const userStatsRef = doc(db, 'users', userId);
  try {
    const userDoc = await getDoc(userStatsRef);
    if (!userDoc.exists()) {
      console.error("User stats doc not found!");
      return;
    }
    
    // We cast the data to our new type
    let stats = userDoc.data() as UserStats;

    stats.currentXp += amount;
    console.log(`+${amount} XP! New total: ${stats.currentXp}`);

    let leveledUp = false;

    // --- UPDATED LEVEL UP LOGIC ---
    if (stats.currentXp >= stats.xpToNextLevel) {
      leveledUp = true;
      stats.level += 1; // Increment level
      
      // Carry over remaining XP
      const remainingXp = stats.currentXp - stats.xpToNextLevel;
      stats.currentXp = remainingXp;
      
      // Calculate new XP required
      stats.xpToNextLevel = Math.floor(stats.xpToNextLevel * 1.5);
      
      // --- NEW V2 LOGIC ---
      stats.attributePoints += 1; // Grant 1 attribute point
      stats.rank = getRank(stats.level); // Calculate new Rank
      
      Alert.alert(
        "LEVEL UP!",
        `You are now Level ${stats.level} (Rank ${stats.rank})!\n\nYou have 1 new attribute point to spend.`
      );
    }
    
    // --- UPDATE FIRESTORE ---
    // We update only the fields that can change
    await updateDoc(userStatsRef, {
      currentXp: stats.currentXp,
      level: stats.level,
      xpToNextLevel: stats.xpToNextLevel,
      // Only update these if a level-up occurred
      ...(leveledUp && {
        attributePoints: stats.attributePoints,
        rank: stats.rank,
      })
    });

  } catch (error) {
    console.error("Error granting XP:", error);
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