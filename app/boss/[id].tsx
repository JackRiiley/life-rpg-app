import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import Colours from '../../constants/Colours';
import { db } from '../../firebase/config';
import { Boss, BossAttack } from '../../types';
// We'll re-use our TaskItem component to display attacks!
import TaskItem from '../../components/TaskItem';
import { useAuth } from '../../context/AuthContext';
import { grantRewards } from '../../services/gameLogic';
import { updateProgress } from '../../services/achievementService';
import { updateDoc, increment, writeBatch } from 'firebase/firestore';

export default function BossDetailScreen() {
  // Get the 'id' from the URL (e.g., /boss/xyz)
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  
  const [boss, setBoss] = useState<Boss | null>(null);
  const [attacks, setAttacks] = useState<BossAttack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // --- 1. Listen to the Boss document ---
    const bossRef = doc(db, 'bosses', id);
    const unsubscribeBoss = onSnapshot(bossRef, (doc) => {
      if (doc.exists()) {
        setBoss({ id: doc.id, ...doc.data() } as Boss);
      } else {
        console.error("Boss not found!");
        Alert.alert("Error", "Boss not found.");
      }
      setLoading(false);
    });

    // --- 2. Listen to the Attacks subcollection ---
    const attacksQuery = collection(db, 'bosses', id, 'attacks');
    const unsubscribeAttacks = onSnapshot(attacksQuery, (snapshot) => {
      const bossAttacks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BossAttack));
      setAttacks(bossAttacks);
    });

    // Cleanup
    return () => {
      unsubscribeBoss();
      unsubscribeAttacks();
    };
  }, [id]);

  // --- TODO: Add Attack Logic ---
  const handleAddAttack = () => {
    router.push({
    pathname: '/create-attack',
    params: { bossId: id }
  });
  };

  const handleCompleteAttack = async (attack: BossAttack) => {
    // Check for user and if attack is already complete
    if (!user || !boss || attack.isComplete) return;

    console.log(`Completing attack: ${attack.title}`);
    
    // We use a writeBatch to make all our database changes safely
    const batch = writeBatch(db);

    try {
      // --- 1. Grant Rewards (XP & Coins) ---
      // We call this first, but it's not part of the batch.
      // (This is fine, as it updates a different document)
      await grantRewards(user.uid, attack.xp, attack.coins);
      // Also update task progress for achievements
      await updateProgress(user.uid, 'tasksCompleted', 1);

      // --- 2. Mark Attack as Complete ---
      const attackRef = doc(db, 'bosses', id, 'attacks', attack.id);
      batch.update(attackRef, { isComplete: true });

      // --- 3. Damage the Boss ---
      const bossRef = doc(db, 'bosses', id);
      const newHp = boss.currentHp - attack.damage;
      
      // Check if this attack defeats the boss
      if (newHp <= 0) {
        console.log("BOSS DEFEATED!");
        batch.update(bossRef, {
          currentHp: 0, // Don't go below 0
          isComplete: true, // Mark boss as done
        });
        
        // Grant a massive bonus for defeating the boss!
        await grantRewards(user.uid, 500, 100); // e.g., 500 XP, 100 Coins
        
        Alert.alert(
          "Boss Defeated!",
          `You've defeated ${boss.name}!\n\n+500 XP, +100 Coins`
        );
        
        // Send user back to the boss list
        router.back();

      } else {
        // Boss is damaged but not defeated
        batch.update(bossRef, {
          currentHp: increment(-attack.damage), // Safely subtract HP
        });
      }

      // --- 4. Commit all changes ---
      await batch.commit();
      
    } catch (error) {
      console.error("Error completing attack: ", error);
      Alert.alert("Error", "Could not complete the attack.");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  if (!boss) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Boss not found.</Text>
      </View>
    );
  }

  // --- Calculate HP ---
  const hpPercent = (boss.currentHp / boss.totalHp) * 100;

  return (
    <View style={styles.container}>
      {/* Header will show the boss name */}
      <Stack.Screen options={{ title: boss.name }} />
      
      {/* --- Boss HP Card --- */}
      <View style={styles.bossCard}>
        <Text style={styles.bossName}>{boss.name}</Text>
        <View style={styles.hpBarBackground}>
          <View style={[styles.hpBarFill, { width: `${hpPercent}%` }]} />
        </View>
        <Text style={styles.hpText}>{boss.currentHp} / {boss.totalHp} HP</Text>
      </View>

      {/* --- Attacks List --- */}
      <FlatList
        data={attacks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={{
              id: item.id,
              title: item.title,
              xp: item.xp,
              type: 'todo', // Just to satisfy the type
              isComplete: item.isComplete, // <-- Use the real value
            }}
            onToggleComplete={() => handleCompleteAttack(item)}
            // Pass an async no-op function to satisfy the type
            onDelete={async () => {
              Alert.alert("Not Yet", "Delete functionality coming soon!");
            }}
          />
        )}
        ListHeaderComponent={<Text style={styles.listHeader}>Attacks</Text>}
        ListEmptyComponent={<Text style={styles.emptyText}>No attacks created yet.</Text>}
      />
      
      <View style={styles.buttonContainer}>
        <Button title="Add Attack" onPress={handleAddAttack} />
      </View>
    </View>
  );
}

// --- Styles (many are re-used) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colours.light.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colours.light.text,
  },
  listHeader: {
    fontSize: 22,
    fontWeight: '600',
    color: Colours.light.text,
    marginBottom: 10,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: Colours.light.textSecondary,
    fontSize: 16,
  },
  bossCard: {
    backgroundColor: Colours.light.card,
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
    color: Colours.light.text,
  },
  hpBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: Colours.light.border,
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
    color: Colours.light.textSecondary,
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 20,
  },
});