import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { UnlockedItem, UserStats } from '../types';
import {useTheme } from '../context/ThemeContext';
// import { CheckCircle } from 'lucide-react-native'; // You'll need an icon library, or we can use text

export default function SelectThemeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [ownedThemes, setOwnedThemes] = useState<UnlockedItem[]>([]);
  const [activeTheme, setActiveTheme] = useState('');
  const [loading, setLoading] = useState(true);

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

  // --- 1. Listen for owned themes and user stats ---
  useEffect(() => {
    if (!user) return;

    // A. Listen for owned items
    const unlockedItemsRef = collection(db, 'users', user.uid, 'unlockedItems');
    const unsubItems = onSnapshot(unlockedItemsRef, (snapshot) => {
      const themes = snapshot.docs
        .map(doc => doc.data() as UnlockedItem)
        .filter(item => item.type === 'theme'); // Only show themes
      setOwnedThemes(themes);
      setLoading(false);
    });

    // B. Listen for user's active theme
    const userStatsRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userStatsRef, (doc) => {
      setActiveTheme((doc.data() as UserStats).activeTheme);
    });

    return () => {
      unsubItems();
      unsubStats();
    };
  }, [user]);

  // --- 2. Handle Equip Logic ---
  const handleEquip = async (item: UnlockedItem) => {
    if (!user || item.id === activeTheme) return; // Don't do anything if it's already active

    try {
      const userStatsRef = doc(db, 'users', user.uid);
      await updateDoc(userStatsRef, {
        activeTheme: item.id,
      });
      router.back(); // Close the modal on success
    } catch (error) {
      console.error('Equip failed:', error);
    }
  };

  // --- 3. Render Function ---
  const renderItem = ({ item }: { item: UnlockedItem }) => {
    const isActive = item.id === activeTheme;
    return (
      <Pressable
        style={[styles.itemCard, isActive && styles.itemCardActive]}
        onPress={() => handleEquip(item)}
      >
        <Text style={[styles.itemName, isActive && styles.itemNameActive]}>
          {item.name}
        </Text>
        {isActive && <Text style={styles.activeText}>Active</Text>}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Select Your Theme' }} />
      
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={ownedThemes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text style={styles.headerText}>Your Unlocked Themes</Text>}
        />
      )}
    </View>
  );
}