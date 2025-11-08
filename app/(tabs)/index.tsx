import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Import our auth hook
import { db } from '../../firebase/config'; // Import our db

// Define the shape of a Task object
interface Task {
  id: string;
  title: string;
  isComplete: boolean;
  // We can add difficulty, type ('daily', 'todo'), etc. later
}

export default function HomeScreen() {
  const { user } = useAuth(); // Get the logged-in user
  const [tasks, setTasks] = useState<Task[]>([]); // List of tasks
  const [newTaskTitle, setNewTaskTitle] = useState(''); // Text from the input

  // --- 1. Read Tasks (Real-time) ---
  useEffect(() => {
    // This effect runs when the 'user' object is available
    if (user) {
      // Create a query to get tasks for this user
      const tasksQuery = query(
        collection(db, 'tasks'), 
        where('ownerId', '==', user.uid)
      );

      // onSnapshot listens for real-time updates
      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const userTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));
        setTasks(userTasks);
      });

      // Cleanup: Unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [user]); // Re-run this effect if the user changes

  // --- 2. Create Task ---
  const handleAddTask = async () => {
    if (newTaskTitle.trim() === '') {
      Alert.alert('Empty Task', 'Please enter a task title.');
      return;
    }

    if (user) {
      try {
        // Add a new document to the 'tasks' collection
        await addDoc(collection(db, 'tasks'), {
          title: newTaskTitle,
          isComplete: false,
          ownerId: user.uid,
          createdAt: Timestamp.now() // Good for sorting later
        });
        setNewTaskTitle(''); // Clear the input field
      } catch (error) {
        console.error('Error adding task:', error);
        Alert.alert('Error', 'Could not add task.');
      }
    }
  };
  
  // --- 3. Update Task (Toggle Complete) ---
  const handleToggleComplete = async (task: Task) => {
    const taskRef = doc(db, 'tasks', task.id);
    try {
      // We'll add XP logic here later!
      await updateDoc(taskRef, {
        isComplete: !task.isComplete
      });
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

  // Helper component to render each task in the list
  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <Pressable onPress={() => handleToggleComplete(item)} style={styles.taskTextContainer}>
        {/* Style the text differently if it's complete */}
        <Text style={[styles.taskTitle, item.isComplete && styles.taskComplete]}>
          {item.title}
        </Text>
      </Pressable>
      <Button title="Delete" color="red" onPress={() => handleDeleteTask(item)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Quests</Text>
      
      {/* --- Add Task Form --- */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new quest..."
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
        />
        <Button title="Add" onPress={handleAddTask} />
      </View>

      {/* --- Task List --- */}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text>No quests yet. Add one!</Text>}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 8,
    marginRight: 8,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
  },
  taskComplete: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
});