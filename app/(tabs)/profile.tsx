import { signOut } from 'firebase/auth';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Import our hook
import { auth } from '../../firebase/config';

export default function ProfileScreen() {
  const { user } = useAuth(); // Get the current user object

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        // Sign-out successful.
        // AuthContext will detect this and navigate to (auth)
        console.log('User signed out');
      })
      .catch((error) => {
        console.error('Sign out error:', error);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>
        {/* Show the user's email, if they exist */}
        Logged in as: {user ? user.email : '...'}
      </Text>

      <Button title="Sign Out" onPress={handleSignOut} />

      {/* We'll add XP and Level here later */}
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
    marginBottom: 20,
  },
  email: {
    fontSize: 16,
    marginBottom: 40,
  },
});