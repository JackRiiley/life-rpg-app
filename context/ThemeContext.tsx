import { doc, onSnapshot } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Theme, Themes } from '../constants/Colours'; // Use your 'Colours.ts' file
import { db } from '../firebase/config';
import { UserStats } from '../types';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: Theme; // The active theme palette
  themeName: string; // The name of the theme (e.g., 'dark')
}

// Create the context
const ThemeContext = createContext<ThemeContextType>({
  theme: Themes.light, // Default
  themeName: 'light',
});

// Create the "Provider" component
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeTheme, setActiveTheme] = useState<ThemeContextType>({
    theme: Themes.light,
    themeName: 'light',
  });

  useEffect(() => {
    if (user) {
      // Listen to the user's stats doc
      const userStatsRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userStatsRef, (doc) => {
        if (doc.exists()) {
          const stats = doc.data() as UserStats;
          const themeName = stats.activeTheme || 'default_light';

          // Set the new theme
          if (themeName === 'theme_dark') {
            setActiveTheme({ theme: Themes.dark, themeName: 'dark' });
          } else if (themeName === 'theme_forest') {
            setActiveTheme({ theme: Themes.forest, themeName: 'forest' });
          } else {
            // Default to light
            setActiveTheme({ theme: Themes.light, themeName: 'light' });
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <ThemeContext.Provider value={activeTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Create a custom hook to use the theme
export const useTheme = () => {
  return useContext(ThemeContext);
};