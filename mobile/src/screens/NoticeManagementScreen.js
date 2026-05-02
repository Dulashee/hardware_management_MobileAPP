import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { noticeAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

const initialForm = {
  title: '',
  content: '',
  type: 'announcement',
  priority: 'medium',
  targetAudience: 'all',
};

const NoticeManagementScreen = () => {
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin();
  
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingNotice, setEditingNotice] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [editSelectedImage, setEditSelectedImage] = useState(null);

  const fetchNotices = async () => {
    try {
      setError('');
      const response = await noticeAPI.getAll({});
      setNotices(response.data?.data?.notices || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotices();
    }, [])
  );

  const pickImage = async (setSelected) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelected(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = (formData) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Validation Error', 'Title and content are required');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm(form)) return;
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('content', form.content.trim());
      formData.append('type', form.type);
      formData.append('priority', form.priority);
      formData.append('targetAudience', form.targetAudience);
      
      if (selectedImage) {
        formData.append('bannerImage', {
          uri: selectedImage.uri,
          name: selectedImage.fileName || 'notice-banner.jpg',
          type: selectedImage.mimeType || 'image/jpeg',
        });
      }
      
      await noticeAPI.create(formData);
      
      setForm(initialForm);
      setSelectedImage(null);
      fetchNotices();
      Alert.alert('Success', 'Notice created successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create notice');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    setEditForm({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: notice.priority,
      targetAudience: notice.targetAudience,
    });
    setEditSelectedImage(null);
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!validateForm(editForm)) return;
    
    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('title', editForm.title.trim());
      formData.append('content', editForm.content.trim());
      formData.append('type', editForm.type);
      formData.append('priority', editForm.priority);
      formData.append('targetAudience', editForm.targetAudience);
      
      if (editSelectedImage) {
        formData.append('bannerImage', {
          uri: editSelectedImage.uri,
          name: editSelectedImage.fileName || 'notice-banner.jpg',
          type: editSelectedImage.mimeType || 'image/jpeg',
        });
      }
      
      await noticeAPI.update(editingNotice._id, formData);
      
      setEditModalVisible(false);
      setEditingNotice(null);
      fetchNotices();
      Alert.alert('Success', 'Notice updated successfully');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update notice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (noticeId) => {
    Alert.alert('Delete Notice', 'Are you sure you want to delete this notice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await noticeAPI.delete(noticeId);
            fetchNotices();
            Alert.alert('Success', 'Notice deleted successfully');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete notice');
          }
        },
      },
    ]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return theme.colors.danger;
      case 'high':
        return theme.colors.accentDark;
      case 'medium':
        return theme.colors.warning;
      case 'low':
        return theme.colors.success;
      default:
        return theme.colors.textLight;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'promotion':
        return '🎉';
      case 'maintenance':
        return '🔧';
      case 'urgent':
        return '⚠️';
      default:
        return '📋';
    }
  };

  if (loading) return <LoadingIndicator text="Loading notices..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchNotices} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {isAdminUser && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Notice</Text>
          <FormInput label="Title *" value={form.title} onChangeText={(text) => setForm({ ...form, title: text })} placeholder="Notice title" />
          <FormInput label="Content *" value={form.content} onChangeText={(text) => setForm({ ...form, content: text })} placeholder="Notice content" multiline numberOfLines={3} />
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Type</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  const types = ['announcement', 'promotion', 'maintenance', 'urgent'];
                  const currentIndex = types.indexOf(form.type);
                  const nextType = types[(currentIndex + 1) % types.length];
                  setForm({ ...form, type: nextType });
                }}
              >
                <Text style={styles.pickerText}>{getTypeIcon(form.type)} {form.type}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Priority</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  const priorities = ['low', 'medium', 'high', 'critical'];
                  const currentIndex = priorities.indexOf(form.priority);
                  const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                  setForm({ ...form, priority: nextPriority });
                }}
              >
                <Text style={[styles.pickerText, { color: getPriorityColor(form.priority) }]}>{form.priority}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setSelectedImage)}>
            <Text style={styles.imagePickerText}>
              {selectedImage ? '📷 Change Banner Image' : '📷 Select Banner Image'}
            </Text>
          </TouchableOpacity>
          
          {selectedImage && (
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          )}
          
          <TouchableOpacity style={[styles.button, submitting && styles.disabled]} onPress={handleCreate} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? 'Creating...' : 'Create Notice'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {notices.length === 0 ? (
        <EmptyState icon="📋" title="No notices yet" subtitle={isAdminUser ? "Create your first notice above" : "No announcements available"} />
      ) : (
        <View style={styles.listContainer}>
          {notices.map((item) => (
            <View key={item._id} style={styles.noticeCard}>
              {item.bannerImage && (
                <Image source={{ uri: toAbsoluteFileUrl(item.bannerImage) }} style={styles.bannerImage} />
              )}
              <View style={styles.noticeContent}>
                <View style={styles.noticeHeader}>
                  <Text style={styles.noticeTitle}>
                    {getTypeIcon(item.type)} {item.title}
                  </Text>
                  {isAdminUser && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item._id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Text style={styles.noticeText} numberOfLines={3}>{item.content}</Text>
                <View style={styles.noticeFooter}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                    <Text style={styles.priorityText}>{item.priority}</Text>
                  </View>
                  <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Notice</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FormInput label="Title *" value={editForm.title} onChangeText={(text) => setEditForm({ ...editForm, title: text })} placeholder="Notice title" />
              <FormInput label="Content *" value={editForm.content} onChangeText={(text) => setEditForm({ ...editForm, content: text })} placeholder="Notice content" multiline numberOfLines={3} />
              
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Type</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const types = ['announcement', 'promotion', 'maintenance', 'urgent'];
                      const currentIndex = types.indexOf(editForm.type);
                      const nextType = types[(currentIndex + 1) % types.length];
                      setEditForm({ ...editForm, type: nextType });
                    }}
                  >
                    <Text style={styles.pickerText}>{getTypeIcon(editForm.type)} {editForm.type}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Priority</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const priorities = ['low', 'medium', 'high', 'critical'];
                      const currentIndex = priorities.indexOf(editForm.priority);
                      const nextPriority = priorities[(currentIndex + 1) % priorities.length];
                      setEditForm({ ...editForm, priority: nextPriority });
                    }}
                  >
                    <Text style={[styles.pickerText, { color: getPriorityColor(editForm.priority) }]}>{editForm.priority}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {editingNotice?.bannerImage && !editSelectedImage && (
                <Image source={{ uri: toAbsoluteFileUrl(editingNotice.bannerImage) }} style={styles.previewImage} />
              )}
              
              <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setEditSelectedImage)}>
                <Text style={styles.imagePickerText}>
                  {editSelectedImage ? '📷 Change Banner Image' : '📷 Change Banner Image'}
                </Text>
              </TouchableOpacity>
              
              {editSelectedImage && (
                <Image source={{ uri: editSelectedImage.uri }} style={styles.previewImage} />
              )}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdate}>
                <Text style={styles.saveButtonText}>{submitting ? 'Updating...' : 'Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  formCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  formTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.sm },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  row: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  halfWidth: { flex: 1 },
  pickerButton: { backgroundColor: theme.colors.background, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  pickerText: { fontSize: theme.fontSize.md, fontWeight: '600' },
  imagePicker: { backgroundColor: theme.colors.background, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', alignItems: 'center', marginBottom: theme.spacing.sm },
  imagePickerText: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '600' },
  previewImage: { width: '100%', height: 150, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
  button: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', marginTop: theme.spacing.sm },
  buttonText: { color: '#111111', fontWeight: '700', fontSize: theme.fontSize.md },
  disabled: { opacity: 0.7 },
  listContainer: { paddingBottom: theme.spacing.xl },
  noticeCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.md, ...theme.shadows.md, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 150 },
  noticeContent: { padding: theme.spacing.md },
  noticeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.sm },
  noticeTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  actionButton: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  editText: { color: theme.colors.primary, fontWeight: '600' },
  deleteText: { color: theme.colors.danger, fontWeight: '600' },
  noticeText: { fontSize: theme.fontSize.md, color: theme.colors.textLight, marginBottom: theme.spacing.md, lineHeight: 22 },
  noticeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm },
  priorityText: { color: '#fff', fontSize: theme.fontSize.xs, fontWeight: '600' },
  date: { fontSize: theme.fontSize.xs, color: theme.colors.textLighter },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: theme.colors.surfaceDark, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, width: '90%', maxHeight: '80%', borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  modalButtons: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  modalButton: { flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary },
  cancelButtonText: { color: theme.colors.primary, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.primary },
  saveButtonText: { color: '#111111', fontWeight: '700' },
});

export default NoticeManagementScreen;
