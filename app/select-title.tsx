import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/config';
import { UserStats } from '../types';

// A simple type for our list
interface UnlockedTitle {
  id: string; // The achievement ID or 'default'
  name: string; // The title name, e.g., "Novice"
}

export default function SelectTitleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme(); // Use our theme
  const [unlockedTitles, setUnlockedTitles] = useState<UnlockedTitle[]>([]);
  const [activeTitle, setActiveTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // --- 1. Listen for unlocked titles and user stats ---
  useEffect(() => {
    if (!user) return;

    // A. Listen for unlocked achievements
    const achievementsRef = collection(db, 'users', user.uid, 'unlockedAchievements');
    const unsubAchievements = onSnapshot(achievementsRef, (snapshot) => {
      const titles: UnlockedTitle[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().unlockedTitle, // Get the 'unlockedTitle' field
      }));
      
      // Manually add the default "Newbie" title to the list
      titles.unshift({ id: 'default', name: 'Newbie' });

      setUnlockedTitles(titles);
      setLoading(false);
    });

    // B. Listen for user's active title
    const userStatsRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
      setActiveTitle((doc.data() as UserStats).selectedTitle);
    });

    return () => {
      unsubAchievements();
      unsubStats();
    };
  }, [user]);

  // --- 2. Handle Equip Logic ---
  const handleEquip = async (item: UnlockedTitle) => {
    if (!user || item.name === activeTitle) return; // Don't do anything if it's already active

    try {
      const userStatsRef = doc(db, 'users', user.uid);
      await updateDoc(userStatsRef, {
        selectedTitle: item.name,
      });
      router.back(); // Close the modal on success
    } catch (error) {
      console.error('Equip failed:', error);
      Alert.alert("Error", "Could not equip title.");
    }
  };

  // --- 3. Render Function ---
  const renderItem = ({ item }: { item: UnlockedTitle }) => {
    const isActive = item.name === activeTitle;
    return (
      <Pressable
        style={[styles.itemCard, isActive && styles.itemCardActive]}
        onPress={() => handleEquip(item)}
      >
        <Text style={[styles.itemName, isActive && styles.itemNameActive]}>
          "{item.name}"
        </Text>
        {isActive && <Text style={styles.activeText}>Active</Text>}
      </Pressable>
    );
  };

  // --- Dynamic Styles ---
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.background,
    },
    headerText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 15,
    },
    itemCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      borderWidth: 2,
      borderColor: theme.card, // No border by default
    },
    itemCardActive: {
      borderColor: theme.tint, // Highlight active theme
    },
    itemName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      fontStyle: 'italic',
    },
    itemNameActive: {
      color: theme.tint,
    },
    activeText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.tint,
    },
  });
  // --- End Styles ---

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Select Your Title' }} />
      
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={unlockedTitles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.headerText}>Your Unlocked Titles</Text>}
        />
      )}
    </View>
  );
}