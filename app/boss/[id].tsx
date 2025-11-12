import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, increment, onSnapshot, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import TaskItem from '../../components/TaskItem';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../firebase/config';
import { updateProgress } from '../../services/achievementService';
import { grantRewards } from '../../services/gameLogic';
import { updateStreak } from '../../services/streakService';
import { Boss, BossAttack, UserStats } from '../../types';

export default function BossDetailScreen() {
  // Get the 'id' from the URL (e.g., /boss/xyz)
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [boss, setBoss] = useState<Boss | null>(null);
  const [attacks, setAttacks] = useState<BossAttack[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Styles (many are re-used) ---
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
    },
    listHeader: {
      fontSize: 22,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 10,
      marginTop: 20,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 30,
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
    buttonContainer: {
      marginTop: 20,
    },
  });

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

    try {
      // --- 1. Get User Stats for Attribute Bonus ---
      const userStatsRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userStatsRef);
      if (!userDoc.exists()) {
        Alert.alert("Error", "Could not find your user stats.");
        return;
      }
      const stats = userDoc.data() as UserStats;

      // --- 2. Calculate Bonus Damage (USING baseDamage) ---
      // Get the attack's 'baseDamage' and 'attribute'
      const baseDamage = attack.baseDamage || 20; // Default to 20 if 0
      const attributeName = attack.attribute;
      
      // Calculate bonus
      const attributeLevel = stats.attributes[attributeName] || 1; // Default to 1
      const bonusDamage = (attributeLevel * 5); // e.g., (1 Str * 5) = 5 bonus
      const totalDamage = baseDamage + bonusDamage;

      console.log(`Base Damage: ${baseDamage}, Bonus: ${bonusDamage}, Total: ${totalDamage}`);

      // --- 3. Grant Rewards (XP & Coins) ---
      await grantRewards(user.uid, attack.xp, attack.coins);
      await updateProgress(user.uid, 'tasksCompleted', 1);
      await updateStreak(user.uid);

      // --- 4. Prepare the Database Batch ---
      const batch = writeBatch(db);

      // Mark Attack as Complete
      const attackRef = doc(db, 'bosses', id, 'attacks', attack.id);
      batch.update(attackRef, { isComplete: true });

      // Damage the Boss
      const bossRef = doc(db, 'bosses', id);
      const newHp = boss.currentHp - totalDamage;
      
      // Check if this attack defeats the boss
      if (newHp <= 0) {
        console.log("BOSS DEFEATED!");
        batch.update(bossRef, {
          currentHp: 0,
          isComplete: true,
        });
        
        await batch.commit(); // Commit the changes *before* showing alerts

        // Grant a massive bonus for defeating the boss!
        await grantRewards(user.uid, 500, 100); 
        
        Alert.alert(
          "Boss Defeated!",
          `You've defeated ${boss.name}!\n\n+500 XP, +100 Coins`
        );
        router.back(); // Send user back

      } else {
        // Boss is damaged but not defeated
        batch.update(bossRef, {
          currentHp: increment(-totalDamage), // Use totalDamage
        });

        await batch.commit(); // Commit the changes

        // Show a simple alert
        Alert.alert(
          "Attack Landed!",
          `You dealt ${baseDamage} base damage + ${bonusDamage} attribute bonus for ${totalDamage} total damage!`
        );
      }
      
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
              xp: item.xp, // This is the XP we calculated, which is correct
              type: 'todo',
              isComplete: item.isComplete,
            }}
            onToggleComplete={() => handleCompleteAttack(item)}
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