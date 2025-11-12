import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, increment, onSnapshot, updateDoc } from 'firebase/firestore'; // Import onSnapshot
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase/config';
import { UserStats } from '../../types';

export default function ProfileScreen() {
  const { user } = useAuth(); // Get the current user object
  const router = useRouter();
  const { theme } = useTheme();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Defining styles using the current theme
  const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.background, // Use background color
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
    marginTop: 40, // Add space at the top
  },
  // We'll wrap stats in a card
  statsCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  email: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 20,
  },
  statsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  xpText: {
    fontSize: 16,
    marginTop: 8,
    color: theme.textSecondary,
  },
  xpBarBackground: {
    width: '100%',
    height: 20,
    backgroundColor: theme.border, // Use border color for background
    borderRadius: 10,
    marginTop: 15,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: theme.tint, // Use tint color for XP
    borderRadius: 10,
  },
  // Make the sign out button pop a bit
  signOutButton: {
    marginTop: 'auto', // Pushes it to the bottom
    backgroundColor: '#FF3B30', // A red color
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  levelRankContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.tint, // Use the accent color
  },
  pointsContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f4f4f8', // A slightly different background
    borderRadius: 8,
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  attributesList: {
    width: '100%',
    marginTop: 15,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  attributeName: {
    fontSize: 18,
    color: theme.text,
  },
  attributeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    // This pushes the button to the right
    flex: 1,
    textAlign: 'right',
    marginRight: 15,
  },
  increaseButton: {
    backgroundColor: theme.tint,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  increaseButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22, // Fixes vertical alignment
  },
  coinContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  coinText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E6A700', // A nice gold color
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center', // Center the title
    marginBottom: 15, // Add space below it
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.tint, // Use the accent color
    fontStyle: 'italic',
  },
  changeThemeButton: {
  backgroundColor: theme.tint, // Blue
  padding: 12,
  borderRadius: 10,
  alignItems: 'center',
  marginBottom: 10, // Space between buttons
  },
  changeThemeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

  // --- 1. Listen for real-time stats updates ---
  useEffect(() => {
    if (user) {
      setLoading(true);
      const userStatsRef = doc(db, 'users', user.uid);

      // onSnapshot listens for any changes to this document
      const unsubscribe = onSnapshot(userStatsRef, (doc) => {
        if (doc.exists()) {
          setStats(doc.data() as UserStats);
        } else {
          console.error("User stats document not found!");
        }
        setLoading(false);
      });

      // Cleanup: Unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [user]); // Re-run if the user ever changes

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.error('Sign out error:', error));
  };

  // Change it to this (and add a check for division by zero, which is good practice):
  const getXpBarWidth = (): DimensionValue => {
    if (stats && stats.xpToNextLevel > 0) {
      const percentage = (stats.currentXp / stats.xpToNextLevel) * 100;
      return `${percentage}%`;
    }
    return '0%';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // --- NEW: Handle Attribute Increase ---
  const handleIncreaseAttribute = async (attribute: 'strength' | 'intellect' | 'stamina') => {
    // We can only spend points if we have a user and stats
    if (!user || !stats) return;

    // Check if we have points to spend
    if (stats.attributePoints <= 0) {
      Alert.alert("No Points", "You don't have any attribute points to spend!");
      return;
    }

    try {
      const userStatsRef = doc(db, 'users', user.uid);

      // We use dot notation to update a nested object field
      const attributeKey = `attributes.${attribute}`;

      // Use a transaction to safely update stats
      await updateDoc(userStatsRef, {
        [attributeKey]: increment(1),     // Increase the attribute (e.g., attributes.strength)
        attributePoints: increment(-1), // Decrease available points
      });

      // The onSnapshot listener will automatically pick up this
      // change and update the UI.

    } catch (error) {
      console.error("Error updating attribute:", error);
      Alert.alert("Error", "Could not update your attribute.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      {/* --- Stats Display --- */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.email}>
            {stats.email}
          </Text>

          {/* --- NEW: Title Display --- */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>"{stats.selectedTitle}"</Text>
          </View>

          {/* --- Level & Rank --- */}
          <View style={styles.levelRankContainer}>
            <Text style={styles.levelText}>Level {stats.level}</Text>
            <Text style={styles.rankText}>Rank: {stats.rank}</Text>
          </View>

          {/* --- NEW: Coins Display --- */}
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>💰 {stats.coins} Coins</Text>
          </View>
          
          {/* --- XP Progress Bar --- */}
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: getXpBarWidth() }]} />
          </View>
          <Text style={styles.xpText}>
            {stats.currentXp} / {stats.xpToNextLevel} XP
          </Text>

          {/* --- Attribute Points --- */}
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>
              Available Points: {stats.attributePoints}
            </Text>
          </View>

          {/* --- NEW: Attributes List --- */}
          <View style={styles.attributesList}>
            {/* STRENGTH */}
            <View style={styles.attributeRow}>
              <Text style={styles.attributeName}>💪 Strength</Text>
              <Text style={styles.attributeValue}>{stats.attributes.strength}</Text>
              <Pressable
                style={styles.increaseButton}
                onPress={() => handleIncreaseAttribute('strength')}
                disabled={stats.attributePoints <= 0} // Disable if no points
              >
                <Text style={styles.increaseButtonText}>+</Text>
              </Pressable>
            </View>
            
            {/* INTELLECT */}
            <View style={styles.attributeRow}>
              <Text style={styles.attributeName}>🧠 Intellect</Text>
              <Text style={styles.attributeValue}>{stats.attributes.intellect}</Text>
              <Pressable
                style={styles.increaseButton}
                onPress={() => handleIncreaseAttribute('intellect')}
                disabled={stats.attributePoints <= 0}
              >
                <Text style={styles.increaseButtonText}>+</Text>
              </Pressable>
            </View>

            {/* STAMINA */}
            <View style={styles.attributeRow}>
              <Text style={styles.attributeName}>🏃 Stamina</Text>
              <Text style={styles.attributeValue}>{stats.attributes.stamina}</Text>
              <Pressable
                style={styles.increaseButton}
                onPress={() => handleIncreaseAttribute('stamina')}
                disabled={stats.attributePoints <= 0}
              >
                <Text style={styles.increaseButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Pressable style={styles.changeThemeButton} onPress={() => router.push('/select-theme')}>
        <Text style={styles.changeThemeButtonText}>Change Theme</Text>
      </Pressable>

      {/* We use Pressable for a custom button */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}