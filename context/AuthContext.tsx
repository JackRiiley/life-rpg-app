import { User, onAuthStateChanged } from 'firebase/auth';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase/config'; // Import our auth service

// Define what the context will hold
interface AuthContextType {
  user: User | null; // The Firebase User object or null
  loading: boolean;  // To show a loading spinner while we check auth
}

// Create the context
// We provide a default value, but it will be overridden by the Provider
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true 
});

// Create a "Provider" component
// This component will wrap our entire app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is the magic!
    // Firebase's `onAuthStateChanged` hook subscribes to the auth state
    // It runs once on load, and again *any time* the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);        // Set the user (or null)
      setLoading(false);  // We're done loading
    });

    // Cleanup function
    // This unsubscribes from the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // The value we provide to all children
  const value = {
    user,
    loading,
  };

  // We don't render anything until we're done loading
  // You could show a splash screen here
  if (loading) {
    return null; // Or <AppLoadingScreen />
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Finally, create a custom hook
// This makes it easy for other components to get the auth state
export const useAuth = () => {
  return useContext(AuthContext);
};