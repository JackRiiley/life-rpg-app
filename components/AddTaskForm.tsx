import { addDoc, collection, Timestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext'; // We need the user to add 'ownerId'
import { useTheme } from '../context/ThemeContext';
import { db } from '../firebase/config';

export const AddTaskForm = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isDaily, setIsDaily] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const styles = StyleSheet.create({
    formContainer: {
      backgroundColor: theme.card,
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
      height: 44,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingLeft: 10,
      marginRight: 8,
      fontSize: 16,
      color: theme.text,
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
      color: theme.textSecondary,
    },
  });

  const handleAddTask = async () => {
    if (newTaskTitle.trim() === '') {
      Alert.alert('Empty Task', 'Please enter a task title.');
      return;
    }
    if (!user) return;

    setIsAddingTask(true);
    try {
      const difficulty = 'easy';
      const xpValue = 20;
      const taskType = isDaily ? 'daily' : 'todo';

      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle,
        isComplete: false,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        difficulty: difficulty,
        xp: xpValue,
        type: taskType,
      });
      setNewTaskTitle('');
      setIsDaily(false);
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Could not add task.');
    } finally {
      setIsAddingTask(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new habit..."
          placeholderTextColor={theme.placeholder}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          editable={!isAddingTask}
        />
        {isAddingTask ? (
          <ActivityIndicator style={styles.addSpinner} />
        ) : (
          <Button title="Add" onPress={handleAddTask} disabled={isAddingTask} />
        )}
      </View>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Make it a Daily Habit?</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDaily ? '#f5dd4b' : '#f4f3f4'}
          onValueChange={setIsDaily}
          value={isDaily}
        />
      </View>
    </View>
  );
};
