import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import Colours from '../constants/Colours';
import { db } from '../firebase/config';
// We'll add a simple Picker for the attribute
// You may need to install this: npx expo install @react-native-picker/picker
// import { Picker } from '@react-native-picker/picker'; 
// For now, we'll just use a text input to keep it simple.

export default function CreateAttackScreen() {
  const router = useRouter();
  // Get the 'bossId' that we will pass from the previous screen
  const { bossId } = useLocalSearchParams<{ bossId: string }>();

  const [title, setTitle] = useState('');
  const [attribute, setAttribute] = useState('strength'); // Default to strength
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!bossId) {
      Alert.alert("Error", "No boss ID found.");
      return;
    }
    
    // Standardize the attribute input
    const validAttribute = attribute || 'strength';
    if (title.trim() === '' || !['strength', 'intellect', 'stamina'].includes(validAttribute)) {
      Alert.alert('Invalid Input', 'Please enter a valid title and attribute (strength, intellect, stamina).');
      return;
    }

    setLoading(true);

    // --- NEW: Auto-calculate Rewards ---
    // All attacks have the same base power and rewards
    const baseDamage = 20; 
    const xpNum = Math.floor(baseDamage / 5) + 10; // 14 XP
    const coinsNum = Math.floor(baseDamage / 20) + 5; // 6 Coins
    // --- END NEW LOGIC ---

    try {
      // Create the new attack in the subcollection
      const attacksRef = collection(db, 'bosses', bossId, 'attacks');
      await addDoc(attacksRef, {
        title: title.trim(),
        baseDamage: baseDamage, // Save baseDamage
        xp: xpNum,
        coins: coinsNum,
        attribute: validAttribute,
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

      <Text style={styles.label}>Attribute (strength, intellect, stamina)</Text>
      <TextInput
        style={styles.input}
        placeholder="strength"
        value={attribute}
        onChangeText={(text) => setAttribute(text.toLowerCase().trim())}
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