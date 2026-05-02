import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image, Modal } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { repairAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge } from '../components/Card';
import FormInput from '../components/FormInput';

/**
 * Repair Detail Screen
 */
const RepairDetailScreen = ({ route, navigation }) => {
  const { repairId } = route.params;
  const { isStaff, isAdmin } = useAuth();
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [actualCost, setActualCost] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { fetchRepair(); }, [repairId]);

  const fetchRepair = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await repairAPI.getById(repairId);
      setRepair(response.data.data.repair);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load repair');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchRepair(); };

  const handleStatusUpdate = async (newStatus) => {
    // If marking as completed, require actual cost
    if (newStatus === 'completed') {
      setPendingStatus(newStatus);
      setActualCost(repair.actualCost?.toString() || '');
      setCostModalVisible(true);
      return;
    }

    try {
      setUpdating(true);
      await repairAPI.updateStatus(repairId, { status: newStatus });
      Alert.alert('Success', `Status updated to ${newStatus}`);
      fetchRepair();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCostSubmit = async () => {
    if (!actualCost || parseFloat(actualCost) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid actual cost');
      return;
    }

    try {
      setUpdating(true);
      await repairAPI.updateStatus(repairId, {
        status: pendingStatus,
        actualCost: parseFloat(actualCost),
      });
      Alert.alert('Success', `Status updated to ${pendingStatus}`);
      setCostModalVisible(false);
      fetchRepair();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeType = (status) => {
    const types = { received: 'default', diagnosing: 'info', 'in-repair': 'warning', completed: 'success', returned: 'info', cancelled: 'danger' };
    return types[status] || 'default';
  };

  const getNextStatus = () => {
    const transitions = { received: 'diagnosing', diagnosing: 'in-repair', 'in-repair': 'completed', completed: 'returned' };
    return transitions[repair?.status];
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  if (loading) return <LoadingIndicator text="Loading repair..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchRepair} />;
  if (!repair) return <ErrorMessage message="Repair not found" />;

  const nextStatus = getNextStatus();

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.repairNumber}>{repair.repairNumber}</Text>
          <View style={styles.headerActions}>
            {(isAdmin() || isStaff()) && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('RepairEdit', { repairId })}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
            <StatusBadge status={repair.status} type={getStatusBadgeType(repair.status)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product & Customer</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Product:</Text><Text style={styles.infoValue}>{repair.product?.name || 'N/A'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Customer:</Text><Text style={styles.infoValue}>{repair.customer.name}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone:</Text><Text style={styles.infoValue}>{repair.customer.phone}</Text></View>
          {repair.customer.email && <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{repair.customer.email}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue</Text>
          <Text style={styles.issueText}>{repair.issue}</Text>
        </View>

        {repair.damagePhotos && repair.damagePhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Damage Photos ({repair.damagePhotos.length})</Text>
            <View style={styles.photoGrid}>
              {repair.damagePhotos.map((photo, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => openImageModal(toAbsoluteFileUrl(photo.url))}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: toAbsoluteFileUrl(photo.url) }} 
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost & Status</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Estimated:</Text><Text style={styles.infoValue}>LKR {repair.estimatedCost?.toFixed(2) || 'N/A'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Actual:</Text><Text style={styles.infoValue}>LKR {repair.actualCost?.toFixed(2) || 'N/A'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Warranty:</Text><Text style={styles.infoValue}>{repair.warrantyClaim ? 'Yes' : 'No'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Received:</Text><Text style={styles.infoValue}>{formatDate(repair.receivedDate)}</Text></View>
        </View>

        {nextStatus && (
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => handleStatusUpdate(nextStatus)} disabled={updating}>
            {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionButtonText}>Mark as {nextStatus}</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Actual Cost Modal */}
      <Modal
        visible={costModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Actual Cost</Text>
            <Text style={styles.modalDescription}>
              Please enter the final actual cost before marking this repair as completed.
            </Text>
            <FormInput
              label="Actual Cost *"
              value={actualCost}
              onChangeText={setActualCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCostModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCostSubmit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Confirm & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity 
            style={styles.imageModalClose} 
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  repairNumber: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.text, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  editButton: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: 'transparent', borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.primary },
  editButtonText: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600' },
  section: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.lg },
  sectionTitle: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoLabel: { fontSize: theme.fontSize.md, color: theme.colors.textLight, fontWeight: '600' },
  infoValue: { fontSize: theme.fontSize.md, color: theme.colors.text, flex: 1, textAlign: 'right', marginLeft: theme.spacing.md },
  issueText: { fontSize: theme.fontSize.md, color: theme.colors.text, lineHeight: 22 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  photo: { width: 100, height: 100, borderRadius: theme.borderRadius.md },
  actionButton: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  primaryButton: { backgroundColor: theme.colors.primary },
  actionButtonText: { color: '#111111', fontSize: theme.fontSize.md, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: theme.colors.surfaceDark, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, width: '90%', maxHeight: '80%', borderWidth: 1, borderColor: theme.colors.border },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.sm },
  modalDescription: { fontSize: theme.fontSize.sm, color: theme.colors.textLight, marginBottom: theme.spacing.lg, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md },
  modalButton: { flex: 1, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary },
  cancelButtonText: { color: theme.colors.primary, fontWeight: '600' },
  saveButton: { backgroundColor: theme.colors.primary },
  saveButtonText: { color: '#111111', fontWeight: '700' },
  imageModalOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  imageModalCloseText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  fullScreenImage: { width: '100%', height: '100%' },
});

export default RepairDetailScreen;
