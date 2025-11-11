import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebase/config'; // Import your db config

/**
 * Grants a specified amount of XP to a user and handles level-ups.
 * @param userId The UID of the user to grant XP to.
 * @param amount The amount of XP to grant.
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
    
    let { currentXp, level, xpToNextLevel } = userDoc.data();
    
    currentXp += amount;
    console.log(`+${amount} XP! New total: ${currentXp}`);

    // Check for Level Up
    if (currentXp >= xpToNextLevel) {
      level += 1;
      const remainingXp = currentXp - xpToNextLevel;
      currentXp = remainingXp;
      xpToNextLevel = Math.floor(xpToNextLevel * 1.5); // The level-up formula

      Alert.alert("LEVEL UP!", `You are now Level ${level}!`);
    }
    
    // Update the user's stats in Firestore
    await updateDoc(userStatsRef, {
      currentXp,
      level,
      xpToNextLevel
    });

  } catch (error) {
    console.error("Error granting XP:", error);
  }
};

// We will add functions for Ranks, Coins, and Attributes here later.