import { Link, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/config';
import { Boss } from '../../types'; // We'll use our Boss type

export default function BossesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 20,
      marginTop: 40,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 50,
      color: theme.textSecondary,
      fontSize: 16,
    },
    bossCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    bossName: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    hpBarBackground: {
      width: '100%',
      height: 10,
      backgroundColor: theme.border,
      borderRadius: 5,
      marginTop: 15,
      overflow: 'hidden',
    },
    hpBarFill: {
      height: '100%',
      backgroundColor: '#FF3B30', // Red for HP
      borderRadius: 5,
    },
    hpText: {
      textAlign: 'right',
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 5,
    },
  });

  // --- 1. Listen for real-time boss updates ---
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const bossesQuery = query(
      collection(db, 'bosses'),
      where('ownerId', '==', user.uid),
      where('isComplete', '==', false) // Only show active bosses
    );

    const unsubscribe = onSnapshot(bossesQuery, (snapshot) => {
      const userBosses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Note: 'attacks' will be loaded on the detail screen
      } as Boss));
      setBosses(userBosses);
      setLoading(false);
    });

    // Cleanup: Unsubscribe when the component unmounts
    return () => unsubscribe();
  }, [user]);

  const handleCreateBoss = () => {
    router.push('/create-boss');
  };

  const renderBossItem = ({ item }: { item: Boss }) => {
  const hpPercent = (item.currentHp / item.totalHp) * 100;
  return (
    // Use Link to make the whole card a button
    // href is the path, and we pass the bossId in params
    <Link href={{ pathname: '/boss/[id]', params: { id: item.id } }} asChild>
      <Pressable style={styles.bossCard}>
        <Text style={styles.bossName}>{item.name}</Text>
        <View style={styles.hpBarBackground}>
          <View style={[styles.hpBarFill, { width: `${hpPercent}%` }]} />
        </View>
        <Text style={styles.hpText}>{item.currentHp} / {item.totalHp} HP</Text>
      </Pressable>
    </Link>
  );
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Bosses</Text>
      <Button title="Create New Boss" onPress={handleCreateBoss} />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bosses}
          renderItem={renderBossItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>You have no active bosses. Create one!</Text>}
          contentContainerStyle={{ paddingTop: 20 }}
        />
      )}
    </View>
  );
}