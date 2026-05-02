import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { taskAPI } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import FilterTabs from '../components/FilterTabs';
import { StatusBadge } from '../components/Card';

/**
 * Task List Screen
 * Displays assigned tasks with status filters
 */
const TaskListScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const fetchTasks = async (status = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (status !== 'all') params.status = status;

      const response = isAdmin()
        ? await taskAPI.getAll(params)
        : await taskAPI.getMyTasks(params);
      setTasks(response.data.data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTasks(activeStatus);
    }, [activeStatus])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks(activeStatus);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    fetchTasks(status);
  };

  const handleTaskPress = (task) => {
    navigation.navigate('TaskDetail', { taskId: task._id });
  };

  const getStatusBadgeType = (status) => {
    const types = {
      pending: 'warning',
      'in-progress': 'info',
      completed: 'success',
      cancelled: 'danger',
    };
    return types[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: theme.colors.success,
      medium: theme.colors.warning,
      high: theme.colors.danger,
      urgent: '#FF0000',
    };
    return colors[priority] || theme.colors.textLight;
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskPress(item)}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <View
            style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(item.priority) },
            ]}
          />
          <Text style={styles.taskTitle}>{item.title}</Text>
        </View>
        <StatusBadge status={item.status} type={getStatusBadgeType(item.status)} />
      </View>
      {item.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.taskFooter}>
        <Text style={styles.taskPriority}>
          Priority: {item.priority?.toUpperCase()}
        </Text>
        {item.dueDate && (
          <Text
            style={[
              styles.taskDueDate,
              isOverdue(item.dueDate, item.status) && styles.overdueText,
            ]}
          >
            {isOverdue(item.dueDate, item.status) ? '⚠️ ' : ''}Due: {formatDate(item.dueDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingIndicator text="Loading tasks..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => fetchTasks(activeStatus)} />;
  }

  return (
    <View style={styles.container}>
      <FilterTabs
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabPress={handleStatusChange}
      />
      {tasks.length === 0 ? (
        <EmptyState icon="✅" title="No tasks found" subtitle="You're all caught up!" />
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
      {/* Show FAB only for admin to create tasks */}
      {isAdmin() && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('TaskCreate')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  taskTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  taskDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  taskPriority: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  taskDueDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  overdueText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TaskListScreen;