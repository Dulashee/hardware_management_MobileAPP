import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { taskAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge } from '../components/Card';

/**
 * Task Detail Screen
 */
const TaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;
  const { isAdmin } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskAPI.getById(taskId);
      setTask(response.data.data.task);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTask();
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      await taskAPI.updateStatus(taskId, { status: newStatus });
      Alert.alert('Success', `Task marked as ${newStatus}`);
      fetchTask();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const uploadProof = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploading(true);
        const asset = result.assets[0];
        const formData = new FormData();
        const normalizedUri =
          asset.uri && asset.uri.startsWith('file://') ? asset.uri : `file://${asset.uri}`;
        formData.append('proofImages', {
          uri: normalizedUri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || asset.uri.split('/').pop() || 'proof.jpg',
        });

        await taskAPI.uploadProof(taskId, formData);
        Alert.alert('Success', 'Proof uploaded successfully');
        fetchTask();
      }
    } catch (err) {
      console.error('Task proof upload error:', err?.message || err, err?.response?.data);
      Alert.alert('Error', err.response?.data?.message || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Completed Task',
      'Are you sure you want to delete this completed task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await taskAPI.delete(taskId);
              Alert.alert('Success', 'Completed task deleted successfully');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete task');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const getNextStatus = () => {
    const transitions = {
      pending: 'in-progress',
      'in-progress': 'completed',
    };
    return transitions[task?.status];
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) return <LoadingIndicator text="Loading task..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchTask} />;
  if (!task) return <ErrorMessage message="Task not found" />;

  const nextStatus = getNextStatus();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{task.title}</Text>
          <StatusBadge status={task.status} type={getStatusBadgeType(task.status)} />
        </View>

        {task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority:</Text>
            <Text style={[styles.infoValue, { color: theme.colors.primary, fontWeight: 'bold' }]}>
              {task.priority?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={styles.infoValue}>{task.dueDate ? formatDate(task.dueDate) : 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned By:</Text>
            <Text style={styles.infoValue}>{task.assignedBy?.name || 'N/A'}</Text>
          </View>
          {task.completedBy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed By:</Text>
              <Text style={styles.infoValue}>{task.completedBy?.name || 'N/A'}</Text>
            </View>
          )}
        </View>

        {task.proofOfWork && task.proofOfWork.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof of Work</Text>
            <View style={styles.proofGrid}>
              {task.proofOfWork.map((proof, index) => (
                <Image key={index} source={{ uri: toAbsoluteFileUrl(proof.url) }} style={styles.proofImage} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.actions}>
          {nextStatus && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => handleStatusUpdate(nextStatus)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>
                  Mark as {nextStatus === 'in-progress' ? 'In Progress' : 'Completed'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={uploadProof}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>📷 Upload Proof</Text>
            )}
          </TouchableOpacity>
          {isAdmin() && task.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteTask}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Delete Completed Task</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  section: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  description: { fontSize: theme.fontSize.md, color: theme.colors.text, lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { fontSize: theme.fontSize.md, color: theme.colors.textLight, fontWeight: '600' },
  infoValue: { fontSize: theme.fontSize.md, color: theme.colors.text, flex: 1, textAlign: 'right', marginLeft: theme.spacing.md },
  proofGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  proofImage: { width: 100, height: 100, borderRadius: theme.borderRadius.md },
  actions: { gap: theme.spacing.md },
  actionButton: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  primaryButton: { backgroundColor: theme.colors.primary },
  secondaryButton: { backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.primary },
  deleteButton: { backgroundColor: theme.colors.danger },
  actionButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.md, fontWeight: '600' },
  secondaryButtonText: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: '600' },
});

export default TaskDetailScreen;
