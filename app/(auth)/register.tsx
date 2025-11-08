import { Link, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../../firebase/config'; // Import your auth config

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Account created
        console.log('User registered:', userCredential.user.email);
        // AuthContext will detect this and navigate to (tabs)
      })
      .catch((error) => {
        // Handle errors
        Alert.alert('Registration Failed', error.message);
      });
  };

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