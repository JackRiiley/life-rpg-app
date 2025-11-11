import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native'; // We'll add a loading spinner
import { AuthProvider, useAuth } from '../context/AuthContext';

// This new component contains the core auth-based routing logic
function RootLayoutNav() {
  const { user, loading } = useAuth(); // Get auth state
  const segments = useSegments(); // Get the current URL "segments"
  const router = useRouter();     // Get the router to navigate

  useEffect(() => {
    // If we're done loading and there's no user, we check...
    if (!loading && !user) {
      // Are we in a route *outside* the (auth) group?
      if (segments[0] !== '(auth)') {
        // If so, redirect to the login screen
        router.replace('/(auth)/login');
      }
    }
    
    // If we're done loading and there *is* a user...
    if (!loading && user) {
      // Are we in the (auth) group?
      if (segments[0] === '(auth)') {
        // If so, redirect to the main 'home' screen
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, router]); // Re-run this logic when auth state changes

  // Show a loading spinner while we're checking the user's auth status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once loaded, the Stack navigator will manage the (auth) or (tabs) group
  return (
    <Stack>
      {/* These Stack.Screen components define the "groups" */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="create-boss" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-attack" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

// This is the main export
// We wrap our entire app in the AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}