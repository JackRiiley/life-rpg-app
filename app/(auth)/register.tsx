import { Link, useRouter } from 'expo-router'; // 1. Import useRouter
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebase/config';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // 2. Initialize the router

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    try {
      // --- Step 1: Create the user in Firebase Auth ---
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Step 1: User created in Auth');
      
      const user = userCredential.user;

      // --- Step 2: Create the user stats doc in Firestore ---
      const userDocRef = doc(db, 'users', user.uid);
      
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        level: 1,
        currentXp: 0,
        xpToNextLevel: 100,
        lastResetDate: new Date().toISOString().split('T')[0], // Store as 'YYYY-MM-DD'
        coins: 0,
        rank: 'E',
        selectedTitle: 'Newbie',
        activeTheme: 'default_light', // Default theme

        // --- V2 Attributes ---
        attributePoints: 0, // No points to spend at level 1
        attributes: {
          strength: 1,
          intellect: 1,
          stamina: 1,
          // Start all stats at 1
        },
        progress: {
          tasksCompleted: 0,
          totalCoinsEarned: 0,
        }
      });
      console.log('Step 2: User stats doc created in Firestore');

      const defaultItemRef = doc(db, 'users', user.uid, 'unlockedItems', 'default_light');
      await setDoc(defaultItemRef, {
        id: 'default_light',
        name: 'Default Theme',
        type: 'theme',
        unlockedAt: Timestamp.now(), 
      });
      console.log('Step 2.5: Default items added');

      // --- Step 3: Manually redirect AFTER both are successful ---
      // This prevents the race condition.
      router.replace('/(tabs)'); 
      // The AuthContext will also pick this up, but this is more explicit.

    } catch (error: any) {
      // --- Error Handling ---
      console.error('Registration failed:', error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Registration Failed', 'That email address is already in use.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Registration Failed', 'Password should be at least 6 characters.');
      } else if (error.code === 'permission-denied' || error.message.includes('firestore')) {
        Alert.alert('Database Error', 'Failed to create user stats. Did you enable Firestore?');
      } else {
        Alert.alert('Registration Failed', `An error occurred: ${error.message}`);
      }
    }
  };

  // ... rest of the file (return statement, styles) is the same
  // (Paste the rest of your original file here)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Create Account" onPress={handleRegister} />

      <View style={styles.linkContainer}>
        <Text>Already have an account? </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Login
        </Link>
      </View>
    </View>
  );
}

// Re-using the same styles as the login screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    paddingLeft: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: 'blue',
  },
});