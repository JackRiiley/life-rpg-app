import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Colours from '../constants/Colours';
// We'll add a simple Picker for the attribute
// You may need to install this: npx expo install @react-native-picker/picker
// import { Picker } from '@react-native-picker/picker'; 
// For now, we'll just use a text input to keep it simple.

export default function CreateAttackScreen() {
  const router = useRouter();
  // Get the 'bossId' that we will pass from the previous screen
  const { bossId } = useLocalSearchParams<{ bossId: string }>();

  const [title, setTitle] = useState('');
  const [damage, setDamage] = useState('');
  const [attribute, setAttribute] = useState('strength'); // Default to strength
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!bossId) {
      Alert.alert("Error", "No boss ID found.");
      return;
    }

    const damageNum = parseInt(damage);
    if (title.trim() === '' || isNaN(damageNum) || damageNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid title and positive damage amount.');
      return;
    }

    setLoading(true);

    // --- NEW: Auto-calculate Rewards ---
    // Simple logic: XP is ~1/5 of damage, Coins are ~1/20
    const xpNum = Math.floor(damageNum / 5) + 10; // e.g., 100 damage = 30 XP
    const coinsNum = Math.floor(damageNum / 20) + 5; // e.g., 100 damage = 10 Coins
    // This provides a simple, balanced reward curve.
    // --- END NEW LOGIC ---

    try {
      // Create the new attack in the subcollection
      const attacksRef = collection(db, 'bosses', bossId, 'attacks');
      await addDoc(attacksRef, {
        title: title.trim(),
        damage: damageNum,
        xp: xpNum, // Use the calculated value
        coins: coinsNum, // Use the calculated value
        attribute: attribute.toLowerCase().trim() || 'strength',
        isComplete: false,
      });
      
      router.back(); // Go back to the boss detail screen

    } catch (error) {
      console.error("Error creating attack:", error);
      Alert.alert("Error", "Could not create the attack.");
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Add New Attack' }} />

      <Text style={styles.label}>Attack Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Clean the kitchen"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>HP Damage</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 150"
        value={damage}
        onChangeText={setDamage}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Attribute (strength, intellect, stamina)</Text>
      <TextInput
        style={styles.input}
        placeholder="strength"
        value={attribute}
        onChangeText={setAttribute}
        autoCapitalize="none"
      />

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Add Attack" onPress={handleCreate} />
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
});