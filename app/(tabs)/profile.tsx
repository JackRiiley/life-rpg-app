import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, DimensionValue, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase/config';

// Define the shape of our User's Stats
interface UserStats {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  email: string;
}

export default function ProfileScreen() {
  const { user } = useAuth(); // Get the current user object
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>
        {stats ? stats.email : 'Loading...'}
      </Text>

      {/* --- Stats Display --- */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.levelText}>Level: {stats.level}</Text>
          <Text style={styles.xpText}>
            XP: {stats.currentXp} / {stats.xpToNextLevel}
          </Text>
          
          {/* --- XP Progress Bar --- */}
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: getXpBarWidth() }]} />
          </View>
        </View>
      )}

      <Button title="Sign Out" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    marginBottom: 30,
    color: 'gray',
  },
  statsContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 20,
    fontWeight: '600',
  },
  xpText: {
    fontSize: 16,
    marginTop: 5,
  },
  xpBarBackground: {
    width: '90%',
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginTop: 10,
    overflow: 'hidden', // Ensures the fill stays within the rounded corners
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#007bff', // A nice blue
    borderRadius: 10,
  },
});