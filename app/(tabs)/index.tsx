import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';
import { AddTaskForm } from '../../components/AddTaskForm';
import TaskItem from '../../components/TaskItem';
import Colours from '../../constants/Colours';
import { useAuth } from '../../context/AuthContext'; // Import our auth hook
import { db } from '../../firebase/config'; // Import our db
import { grantRewards } from '../../services/gameLogic';
import { ActiveQuest, SectionTask, Task } from '../../types';

export default function HomeScreen() {
  const { user } = useAuth(); // Get the logged-in user
  const [tasks, setTasks] = useState<Task[]>([]); // List of tasks
  const [randomQuests, setRandomQuests] = useState<ActiveQuest[]>([]);
  

  // --- Combined Task Loading and Reset Logic ---
  useEffect(() => {
    // We only run this logic if the user is loaded
    if (!user) {
      return;
    }

    // This will hold our real-time listener, so we can clean it up
    let unsubscribeFromTasks: () => void = () => {};
    let unsubscribeFromDailies: () => void = () => {};

    // We define an async function inside the effect
    const setupTasksAndDailies = async () => {
      try {
        // --- 1. Run Reset Logic FIRST ---
        console.log('Checking if dailies need reset...');
        const today = new Date().toISOString().split('T')[0];
        const userStatsRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userStatsRef);

        if (!userDoc.exists()) {
          console.error('User stats doc not found for reset.');
          return; // Stop if no user doc
        }

        const lastReset = userDoc.data()?.lastResetDate;

        // If it's a new day, run the reset
        if (lastReset !== today) {
          console.log(`Last reset was ${lastReset}. Today is ${today}. Resetting...`);
          
          // Find all 'daily' tasks for this user that are 'isComplete: true'
          const dailiesToResetQuery = query(
            collection(db, 'tasks'),
            where('ownerId', '==', user.uid),
            where('type', '==', 'daily'),
            where('isComplete', '==', true)
          );
          
          const snapshot = await getDocs(dailiesToResetQuery);
          
          // Use a "batch" to update all of them at once
          const batch = writeBatch(db);
          snapshot.docs.forEach((taskDoc) => {
            batch.update(taskDoc.ref, { isComplete: false });
          });
          
          // 3. Also update the user's lastResetDate to today
          batch.update(userStatsRef, { lastResetDate: today });

          // --- NEW: Roll Random Dailies ---
          
          // 4. Clear out any old 'activeDailies' from yesterday
          const oldDailiesQuery = query(collection(db, 'users', user.uid, 'activeDailies'));
          const oldDailiesSnapshot = await getDocs(oldDailiesQuery);
          oldDailiesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

          // 5. Fetch the entire quest pool
          const poolSnapshot = await getDocs(collection(db, 'questPool'));
          const questPool = poolSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // 6. Shuffle the pool and pick 3
          // (This is a simple but effective shuffle)
          const shuffled = questPool.sort(() => 0.5 - Math.random());
          const newDailies = shuffled.slice(0, 3);

          // 7. Add the 3 new quests to the user's subcollection
          newDailies.forEach(quest => {
            const newDailyRef = doc(collection(db, 'users', user.uid, 'activeDailies'));
            batch.set(newDailyRef, {
              ...quest,
              isComplete: false,
              type: 'daily', // Mark it as a daily
              ownerId: user.uid, // Add for potential rule use
              originalQuestId: quest.id
            });
          });
          
          console.log(`Rolled ${newDailies.length} new daily quests.`);
          // --- End New Daily Logic ---

          // 8. NOW we commit all changes (habits, new quests, reset date)
          await batch.commit();
          
          // 5. NOW we show the alert, AFTER it's all done
          console.log('Dailies reset successfully.');
          Alert.alert("Quests Reset!", "Your daily quests have been reset for today.");
        
        } else {
          console.log('Dailies are already up-to-date.');
        }

        // --- 2. NOW, Attach the REAL-TIME listener ---
        // This code only runs AFTER the reset logic is finished
        console.log('Attaching task listener...');
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('ownerId', '==', user.uid)
          // We could add orderBy('createdAt') here, but it requires a Firestore Index
        );

        // Store the unsubscribe function
        unsubscribeFromTasks = onSnapshot(tasksQuery, (snapshot) => {
          const userTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Task));
          setTasks(userTasks); // This updates the UI
          console.log('Task list updated from snapshot.');
        });

        // --- NEW: Attach listener for Random Daily Quests ---
        const activeDailiesQuery = query(collection(db, 'users', user.uid, 'activeDailies'));
        
        unsubscribeFromDailies = onSnapshot(activeDailiesQuery, (snapshot) => {
          const userDailies = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ActiveQuest));
          setRandomQuests(userDailies);
          console.log('Random quest list updated from snapshot.');
        });

      } catch (error) {
        console.error("Error during task setup/reset:", error);
        Alert.alert('Error', 'Could not load or reset your tasks.');
      }
    };

    // Call the function
    setupTasksAndDailies();

    // Cleanup: This runs when the component unmounts
    return () => {
      console.log('Detaching task listener.');
      unsubscribeFromTasks(); // This stops the listener
      unsubscribeFromDailies();
    };
    
  }, [user]); // Re-run this effect if the user changes
  
  // --- 3. Update Task (Toggle Complete) ---
  const handleToggleComplete = async (task: Task) => {
    if (!user) return; // Can't do anything if there's no user

    const taskRef = doc(db, 'tasks', task.id);

    try {
      // Grant XP *only* if we are completing the task
      if (!task.isComplete) { 
        const taskXp = task.xp || 20;
        await grantRewards(user.uid, taskXp, 5); // 20 XP (from taskXp) and 5 Coins // <-- Use our new function
      }
      
      // Finally, toggle the task's completion status
      await updateDoc(taskRef, {
        isComplete: !task.isComplete
      });
      
      // Note: We won't remove XP if they un-complete it.
      
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // --- 4. Delete Task ---
  const handleDeleteTask = async (task: Task) => {
    const taskRef = doc(db, 'tasks', task.id);
    try {
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // --- 5. Complete Random Quest ---
  const handleCompleteRandomQuest = async (quest: ActiveQuest) => {
    if (!user) return;

    // 1. Grant the XP
    await grantRewards(user.uid, quest.xp || 25, 10); // Use the quest's XP value

    // 2. Delete the quest from the user's 'activeDailies'
    const questRef = doc(db, 'users', user.uid, 'activeDailies', quest.id);
    try {
      await deleteDoc(questRef);
    } catch (error) {
      console.error("Error completing random quest:", error);
    }
  };

  // Helper component to render each task in the list
  const renderTask = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onToggleComplete={handleToggleComplete} // Pass the function directly
      onDelete={handleDeleteTask}           // Pass the function directly
  />
  );

  // Combine our two lists into sections
  const sections = [
    {
      title: 'Daily Quests',
      data: randomQuests as SectionTask[], // Use the union type
    },
    {
      title: 'Your Habits',
      data: tasks as SectionTask[], // Use the union type
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Quests</Text>
      
      {/* --- Add Task Form --- */}
      <AddTaskForm />

      {/* --- Task Lists --- */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        
        // This is the new, single renderItem function
        renderItem={({ item, section }) => {
          
          // Check which section this item belongs to
          if (section.title === 'Daily Quests') {
            // We know this is an ActiveQuest. We cast it for the handler.
            const quest = item as ActiveQuest;
            return (
              <TaskItem
                task={quest}
                onToggleComplete={() => handleCompleteRandomQuest(quest)}
                onDelete={async () => {}} // <-- FIX for Error 1 (added async)
              />
            );
          }

          // Otherwise, it's a "Your Habits" task
          return (
            <TaskItem
              task={item} // 'item' is a Task, which is fine
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
            />
          );
        }}
        
        renderSectionHeader={({ section: { title, data } }) => (
          // Only show the header if there is data in that section
          data.length > 0 ? <Text style={styles.listHeader}>{title}</Text> : null
        )}
        ListEmptyComponent={<Text style={styles.emptyListText}>No quests yet. Add one!</Text>}
        contentContainerStyle={{ paddingBottom: 50 }}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colours.light.background, // Use background color
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colours.light.text,
    marginBottom: 20,
    marginTop: 40, // Add space at the top
  },
  // --- List Header ---
  listHeader: {
    fontSize: 22,
    fontWeight: '600',
    color: Colours.light.text,
    marginBottom: 10,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 30,
    color: Colours.light.textSecondary,
    fontSize: 16,
  },
});