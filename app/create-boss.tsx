import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Colours from '../constants/Colours';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { UserStats } from '../types';

export default function CreateBossScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('easy');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;

    if (name.trim() === '') {
      Alert.alert('Invalid Input', 'Please enter a valid name.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch the user's stats to get their level
      const userStatsRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userStatsRef);
      if (!userDoc.exists()) {
        throw new Error("User stats not found!");
      }
      const stats = userDoc.data() as UserStats;
      const playerLevel = stats.level > 0 ? stats.level : 1;

      // 2. Calculate HP based on level and difficulty
      const baseHp = 100; // HP for a Lvl 1 boss
      let totalHp;

      switch (selectedDifficulty) {
        case 'medium':
          totalHp = Math.floor(baseHp * playerLevel * 1.5); // 1.5x modifier
          break;
        case 'hard':
          totalHp = Math.floor(baseHp * playerLevel * 2); // 2x modifier
          break;
        case 'easy':
        default:
          totalHp = Math.floor(baseHp * playerLevel); // 1x modifier
      }

      // 3. Create the new boss document
      await addDoc(collection(db, 'bosses'), {
        ownerId: user.uid,
        name: name.trim(),
        totalHp: totalHp,
        currentHp: totalHp,
        isComplete: false,
        createdAt: Timestamp.now(),
        difficulty: selectedDifficulty, // Good to save this
      });
      
      router.back();

    } catch (error) {
      console.error("Error creating boss:", error);
      Alert.alert("Error", "Could not create the boss.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* This gives us a nice header with a "Back" button */}
      <Stack.Screen options={{ title: 'Create New Boss' }} />

      <Text style={styles.label}>Boss Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Deep Clean the House"
        placeholderTextColor={Colours.light.placeholder}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.difficultyContainer}>
        <Pressable
          style={[styles.difficultyButton, selectedDifficulty === 'easy' && styles.easySelected]}
          onPress={() => setSelectedDifficulty('easy')}
        >
          <Text style={styles.difficultyButtonText}>Easy</Text>
        </Pressable>
        <Pressable
          style={[styles.difficultyButton, selectedDifficulty === 'medium' && styles.mediumSelected]}
          onPress={() => setSelectedDifficulty('medium')}
        >
          <Text style={styles.difficultyButtonText}>Medium</Text>
        </Pressable>
        <Pressable
          style={[styles.difficultyButton, selectedDifficulty === 'hard' && styles.hardSelected]}
          onPress={() => setSelectedDifficulty('hard')}
        >
          <Text style={styles.difficultyButtonText}>Hard</Text>
        </Pressable>
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Create Boss" onPress={handleCreate} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colours.light.background,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colours.light.text,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    height: 44,
    borderColor: Colours.light.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    fontSize: 16,
    color: Colours.light.text,
    backgroundColor: Colours.light.card,
  },
  buttonContainer: {
    marginTop: 30,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colours.light.border,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  easySelected: {
    borderColor: '#34C759', // Green
    backgroundColor: '#34c75920',
  },
  mediumSelected: {
    borderColor: '#FF9500', // Orange
    backgroundColor: '#ff950020',
  },
  hardSelected: {
    borderColor: '#FF3B30', // Red
    backgroundColor: '#ff3b3020',
  },
});