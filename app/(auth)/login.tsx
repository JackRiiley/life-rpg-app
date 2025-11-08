import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config'; // Import your auth config

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password.');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Sign-in successful.
        // The `onAuthStateChanged` listener in AuthContext will handle the redirect.
        console.log('User logged in:', userCredential.user.email);
        // We don't even need to call router.replace() here,
        // our AuthContext + RootLayout will detect the 'user'
        // state change and automatically navigate to (tabs).
      })
      .catch((error) => {
        // Handle errors
        Alert.alert('Login Failed', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
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

      <Button title="Login" onPress={handleLogin} />

      <View style={styles.linkContainer}>
        <Text>Don't have an account? </Text>
        {/* This <Link> component from expo-router creates a native link */}
        <Link href="/(auth)/register" style={styles.link}>
          Register
        </Link>
      </View>
    </View>
  );
}

// Added some basic styles to make it look decent
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