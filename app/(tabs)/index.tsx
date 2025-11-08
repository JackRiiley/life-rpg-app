import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import TaskItem from '../../components/TaskItem';
import Colours from '../../constants/Colours';
import { useAuth } from '../../context/AuthContext'; // Import our auth hook
import { db } from '../../firebase/config'; // Import our db

// Define the shape of a Task object
interface Task {
  id: string;
  title: string;
  isComplete: boolean;
  xp: number;
  type: 'daily' | 'todo'; // <-- Add this line
}

export default function HomeScreen() {
  const { user } = useAuth(); // Get the logged-in user
  const [tasks, setTasks] = useState<Task[]>([]); // List of tasks
  const [newTaskTitle, setNewTaskTitle] = useState(''); // Text from the input
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isDaily, setIsDaily] = useState(false);

  // --- Combined Task Loading and Reset Logic ---
  useEffect(() => {
    // We only run this logic if the user is loaded
    if (!user) {
      return;
    }

    // This will hold our real-time listener, so we can clean it up
    let unsubscribeFromTasks: () => void = () => {};

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

          // 4. Commit all changes to the database
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
    };
    
  }, [user]); // Re-run this effect if the user changes

  // --- 2. Create Task ---
  const handleAddTask = async () => {
    if (newTaskTitle.trim() === '') {
      Alert.alert('Empty Task', 'Please enter a task title.');
      return;
    }

    if (!user) return; // Can't add if no user

    setIsAddingTask(true);

    if (user) {
      try {
        const difficulty = 'easy';
        const xpValue = 20;
        const taskType = isDaily ? 'daily' : 'todo';

        // Add a new document to the 'tasks' collection
        await addDoc(collection(db, 'tasks'), {
          title: newTaskTitle,
          isComplete: false,
          ownerId: user.uid,
          createdAt: Timestamp.now(), // Good for sorting later
          difficulty: difficulty,
          xp: xpValue,
          type: taskType // Set the task type
        });
        setNewTaskTitle(''); // Clear the input field
        setIsDaily(false);
      } catch (error) {
        console.error('Error adding task:', error);
        Alert.alert('Error', 'Could not add task.');
      } finally {
        setIsAddingTask(false);
      }
    }
  };
  
  // --- 3. Update Task (Toggle Complete) ---
  const handleToggleComplete = async (task: Task) => { // Make sure your Task interface includes `xp: number`
    if (!user) return; // Can't do anything if there's no user

    const taskRef = doc(db, 'tasks', task.id);
    const userStatsRef = doc(db, 'users', user.uid); // Get a ref to the user's stats doc

    try {
      // --- A: Grant XP if we are completing the task ---
      if (!task.isComplete) { 
        // We are toggling *to* complete
        
        // --- B: Get the user's current stats ---
        const userDoc = await getDoc(userStatsRef);
        if (!userDoc.exists()) {
          console.error("User stats doc not found!");
          return;
        }
        
        let { currentXp, level, xpToNextLevel } = userDoc.data();
        
        // --- C: Add the XP ---
        const taskXp = task.xp || 20; // Default to 20 if xp not on task
        currentXp += taskXp;
        console.log(`+${taskXp} XP! New total: ${currentXp}`);

        // --- D: Check for Level Up ---
        if (currentXp >= xpToNextLevel) {
          level += 1; // LEVEL UP!
          const remainingXp = currentXp - xpToNextLevel; // Carry over XP
          currentXp = remainingXp;
          xpToNextLevel = Math.floor(xpToNextLevel * 1.5); // Increase next level's cost (e.g., 100, 150, 225)

          Alert.alert("LEVEL UP!", `You are now Level ${level}!`);
        }
        
        // --- E: Update the user's stats in Firestore ---
        await updateDoc(userStatsRef, {
          currentXp,
          level,
          xpToNextLevel
        });
      }
      
      // --- F: Finally, toggle the task's completion status ---
      await updateDoc(taskRef, {
        isComplete: !task.isComplete
      });
      
      // If we are *un-completing* a task, we should probably remove the XP...
      // but for V1, let's keep it simple. We won't remove XP.

    } catch (error) {
      console.error('Error updating task/XP:', error);
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

  // Helper component to render each task in the list
  const renderTask = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onToggleComplete={handleToggleComplete} // Pass the function directly
      onDelete={handleDeleteTask}           // Pass the function directly
  />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Quests</Text>
      
      {/* --- Add Task Form --- */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a new quest..."
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            editable={!isAddingTask} // Disable input while loading
          />
          {/* Show spinner OR button */}
          {isAddingTask ? (
            <ActivityIndicator style={styles.addSpinner} />
          ) : (
            <Button title="Add" onPress={handleAddTask} disabled={isAddingTask} />
          )}
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Make it a Daily Quest?</Text>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isDaily ? '#f5dd4b' : '#f4f3f4'}
            onValueChange={setIsDaily}
            value={isDaily}
          />
        </View>
      </View>

      {/* --- Task List --- */}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        ListHeaderComponent={<Text style={styles.listHeader}>Today's Quests</Text>}
        ListEmptyComponent={<Text style={styles.emptyListText}>No quests yet. Add one!</Text>}
        // This adds a bit of space at the bottom of the list
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
  // --- New Form Styles ---
  formContainer: {
    backgroundColor: Colours.light.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 44, // Taller input
    borderColor: Colours.light.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginRight: 8,
    fontSize: 16,
    color: Colours.light.text,
  },
  addSpinner: {
    paddingHorizontal: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginTop: 5,
  },
  switchLabel: {
    fontSize: 16,
    color: Colours.light.textSecondary,
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