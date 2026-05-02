import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { authAPI, taskAPI } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';

/**
 * Task Create Screen - Simplified version
 */
const TaskCreateScreen = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [staffUsers, setStaffUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
  });

  React.useEffect(() => {
    const fetchAssignableUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await authAPI.getAllUsers();
        const users = response.data?.data?.users || [];
        const assignable = users.filter((user) => user.role === 'staff' || user.role === 'admin');
        setStaffUsers(assignable);
        if (assignable.length > 0) {
          setFormData((prev) => ({ ...prev, assignedTo: assignable[0]._id }));
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load staff users');
      } finally {
        setUsersLoading(false);
      }
    };

    fetchAssignableUsers();
  }, []);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Task title is required');
      return;
    }
    if (!formData.assignedTo) {
      Alert.alert('Validation Error', 'Please select a staff member');
      return;
    }

    try {
      setSubmitting(true);
      await taskAPI.create({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: formData.dueDate.trim() || undefined,
      });
      Alert.alert('Success', 'Task created successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Task</Text>
        <FormInput label="Title *" value={formData.title} onChangeText={(text) => setFormData({ ...formData, title: text })} placeholder="Task title" />
        <FormInput label="Description" value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Task description" multiline numberOfLines={3} />
        <FormInput label="Due Date (YYYY-MM-DD)" value={formData.dueDate} onChangeText={(text) => setFormData({ ...formData, dueDate: text })} placeholder="2024-12-31" />

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Assign To *</Text>
          {usersLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <View style={styles.priorityOptions}>
              {staffUsers.map((user) => (
                <TouchableOpacity
                  key={user._id}
                  style={[styles.priorityOption, formData.assignedTo === user._id && styles.priorityOptionActive]}
                  onPress={() => setFormData({ ...formData, assignedTo: user._id })}
                >
                  <Text style={[styles.priorityOptionText, formData.assignedTo === user._id && styles.priorityOptionTextActive]}>
                    {user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityOptions}>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <TouchableOpacity key={p} style={[styles.priorityOption, formData.priority === p && styles.priorityOptionActive]} onPress={() => setFormData({ ...formData, priority: p })}>
                <Text style={[styles.priorityOptionText, formData.priority === p && styles.priorityOptionTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Create Task</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  title: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.lg },
  inputContainer: { marginBottom: theme.spacing.lg },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.sm },
  priorityOptions: { flexDirection: 'row', gap: theme.spacing.sm },
  priorityOption: { flex: 1, padding: theme.spacing.sm, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  priorityOptionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  priorityOptionText: { fontSize: theme.fontSize.sm, color: theme.colors.textLight, fontWeight: '600' },
  priorityOptionTextActive: { color: '#FFFFFF' },
  submitButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.lg },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.md, fontWeight: '600' },
});

export default TaskCreateScreen;
