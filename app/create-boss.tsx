import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import Colours from '../constants/Colours';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

export default function CreateBossScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [totalHp, setTotalHp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!user) return;

    const hp = parseInt(totalHp);
    if (name.trim() === '' || isNaN(hp) || hp <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid name and a positive HP number.');
      return;
    }

    setLoading(true);
    try {
      // Create the new boss document
      await addDoc(collection(db, 'bosses'), {
        ownerId: user.uid,
        name: name.trim(),
        totalHp: hp,
        currentHp: hp, // Start with full health
        isComplete: false,
        createdAt: Timestamp.now(),
      });
      
      // Go back to the previous screen (bosses list)
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

      <Text style={styles.label}>Total HP</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 1000"
        placeholderTextColor={Colours.light.placeholder}
        value={totalHp}
        onChangeText={setTotalHp}
        keyboardType="number-pad"
      />

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
});