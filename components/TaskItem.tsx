import React, { useState } from 'react';
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from 'react-native';

// We'll re-define the Task interface here for this component's props
// In a larger app, we'd put this in a central 'types.ts' file
interface Task {
  id: string;
  title: string;
  isComplete: boolean;
  xp: number;
  type: 'daily' | 'todo';
}

// Define the props our component will accept
type TaskItemProps = {
  task: Task;
  onToggleComplete: (task: Task) => Promise<void>; // <-- Changed to Promise<void>
  onDelete: (task: Task) => Promise<void>;           // <-- Changed to Promise<void>
};

// We use React.memo to prevent re-rendering items that haven't changed
const TaskItem = React.memo(({ task, onToggleComplete, onDelete }: TaskItemProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
    setIsLoading(true);
    await onToggleComplete(task);
    // Don't set loading false here, as component might unmount if list re-sorts
    // Let's keep it simple for now and set it.
    setIsLoading(false); 
    };

    const handleDelete = async () => {
        setIsLoading(true);
        await onDelete(task);
        // No need to set false, component will be deleted
    };

    if (isLoading) {
    // Show a full-item spinner while loading
    return (
      <View style={[styles.taskItem, styles.loadingContainer]}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <View style={styles.taskItem}>
      <Pressable onPress={handleToggle} style={styles.taskTextContainer}>
        {/* Style the text differently if it's complete */}
        <Text style={[styles.taskTitle, task.isComplete && styles.taskComplete]}>
          {task.title}
        </Text>
        {/* Show a small 'Daily' tag */}
        {task.type === 'daily' && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Daily</Text>
          </View>
        )}
      </Pressable>
      <Button title="Delete" color="red" onPress={handleDelete} />
    </View>
  );
});

// These are the styles we are moving from home.tsx
const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff', // Changed from f9f9f9
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 4,
    borderRadius: 8, // Added rounded corners
    shadowColor: '#000', // Added a light shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  taskTitle: {
    fontSize: 18,
    color: '#333',
  },
  taskComplete: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  tag: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28, // Match button's approximate height
  },
});

export default TaskItem;