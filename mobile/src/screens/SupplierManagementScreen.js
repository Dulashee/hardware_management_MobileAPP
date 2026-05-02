import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supplierAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

const initialForm = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
};

const toSriLankaPhoneDigits = (value) => value.replace(/\D/g, '').slice(0, 10);
const isValidSriLankaPhone = (digitsOnly) => /^\d{10}$/.test(digitsOnly);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const SupplierManagementScreen = () => {
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);

  const [uploadingContract, setUploadingContract] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [contractModalVisible, setContractModalVisible] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setError('');
      setLoading(true);

      const response = await supplierAPI.getAll({ isActive: true });
      setSuppliers(response.data?.data?.suppliers || []);
    } catch (err) {
      console.log('FETCH SUPPLIERS ERROR:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSuppliers();
    }, [])
  );

  const validate = () => {
    const email = form.email.trim().toLowerCase();
    const phoneDigits = toSriLankaPhoneDigits(form.phone);

    if (!form.name.trim() || !email || !phoneDigits) {
      Alert.alert('Validation Error', 'Name, email and phone are required');
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!isValidSriLankaPhone(phoneDigits)) {
      Alert.alert('Validation Error', 'Phone number must contain exactly 10 digits');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    const email = form.email.trim().toLowerCase();
    const phoneDigits = toSriLankaPhoneDigits(form.phone);

    try {
      setCreating(true);

      await supplierAPI.create({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        email: email,
        phone: phoneDigits,
      });

      setForm(initialForm);
      await fetchSuppliers();

      Alert.alert('Success', 'Supplier created successfully');
    } catch (err) {
      console.log('CREATE SUPPLIER ERROR:', err.response?.data || err.message);

      Alert.alert(
        'Error',
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          'Failed to create supplier'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (supplierId) => {
    Alert.alert('Delete Supplier', 'Are you sure?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supplierAPI.delete(supplierId);
            await fetchSuppliers();
            Alert.alert('Success', 'Supplier deleted successfully');
          } catch (err) {
            console.log('DELETE SUPPLIER ERROR:', err.response?.data || err.message);

            Alert.alert(
              'Error',
              err.response?.data?.message || 'Failed to delete supplier'
            );
          }
        },
      },
    ]);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);

    setEditForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
    });

    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    const email = editForm.email.trim().toLowerCase();
    const phoneDigits = toSriLankaPhoneDigits(editForm.phone);

    if (!editForm.name.trim() || !email || !phoneDigits) {
      Alert.alert('Validation Error', 'Name, email and phone are required');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    if (!isValidSriLankaPhone(phoneDigits)) {
      Alert.alert('Validation Error', 'Phone number must contain exactly 10 digits');
      return;
    }

    try {
      await supplierAPI.update(editingSupplier._id, {
        name: editForm.name.trim(),
        contactPerson: editForm.contactPerson.trim(),
        email: email,
        phone: phoneDigits,
      });

      setEditModalVisible(false);
      setEditingSupplier(null);
      await fetchSuppliers();

      Alert.alert('Success', 'Supplier updated successfully');
    } catch (err) {
      console.log('UPDATE SUPPLIER ERROR:', err.response?.data || err.message);

      Alert.alert(
        'Error',
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          'Failed to update supplier'
      );
    }
  };

  const openContractModal = (supplier) => {
    setSelectedSupplier(supplier);
    setContractModalVisible(true);
  };

  const handleUploadContract = async () => {
    if (!selectedSupplier?._id) {
      Alert.alert('Error', 'No supplier selected');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      const formData = new FormData();
      formData.append('contract', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf',
      });

      setUploadingContract(true);

      await supplierAPI.uploadContract(selectedSupplier._id, formData);

      Alert.alert('Success', 'Contract uploaded successfully');
      await fetchSuppliers();
      setContractModalVisible(false);
    } catch (err) {
      console.log('CONTRACT UPLOAD ERROR:', err.response?.data || err.message);

      Alert.alert(
        'Error',
        err.response?.data?.message || err.message || 'Failed to upload contract'
      );
    } finally {
      setUploadingContract(false);
    }
  };

  const viewContract = (url) => {
    const absoluteUrl = toAbsoluteFileUrl(url);

    if (absoluteUrl) {
      Linking.openURL(absoluteUrl);
    } else {
      Alert.alert('Error', 'Invalid contract URL');
    }
  };

  const contractDocuments =
    selectedSupplier?.documents?.filter((doc) => doc.type === 'contract') || [];

  if (loading) {
    return <LoadingIndicator text="Loading suppliers..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchSuppliers} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {isAdminUser && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Supplier</Text>

          <FormInput
            label="Name *"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            placeholder="Supplier name"
          />

          <FormInput
            label="Contact Person"
            value={form.contactPerson}
            onChangeText={(text) => setForm({ ...form, contactPerson: text })}
            placeholder="Person name"
          />

          <FormInput
            label="Email *"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            keyboardType="email-address"
            placeholder="supplier@email.com"
          />

          <FormInput
            label="Phone *"
            value={form.phone}
            onChangeText={(text) =>
              setForm({ ...form, phone: toSriLankaPhoneDigits(text) })
            }
            keyboardType="phone-pad"
            placeholder="07XXXXXXXX"
          />

          <TouchableOpacity
            style={[styles.button, creating && styles.disabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            <Text style={styles.buttonText}>
              {creating ? 'Saving...' : 'Save Supplier'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {suppliers.length === 0 ? (
        <EmptyState
          icon="🏭"
          title="No suppliers yet"
          subtitle={isAdminUser ? 'Add your first supplier above' : 'No suppliers available'}
        />
      ) : (
        <View style={styles.listContainer}>
          {suppliers.map((item) => (
            <View key={item._id} style={styles.supplierCard}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>

                {isAdminUser && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(item._id)}
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.meta}>{item.contactPerson || 'No contact person'}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              <Text style={styles.meta}>{item.phone}</Text>

              {isAdminUser && (
                <TouchableOpacity
                  style={styles.contractButton}
                  onPress={() => openContractModal(item)}
                >
                  <Text style={styles.contractButtonText}>
                    📄 View/Upload Contracts
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Supplier</Text>

            <FormInput
              label="Name *"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
              placeholder="Supplier name"
            />

            <FormInput
              label="Contact Person"
              value={editForm.contactPerson}
              onChangeText={(text) =>
                setEditForm({ ...editForm, contactPerson: text })
              }
              placeholder="Person name"
            />

            <FormInput
              label="Email *"
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              keyboardType="email-address"
              placeholder="supplier@email.com"
            />

            <FormInput
              label="Phone *"
              value={editForm.phone}
              onChangeText={(text) =>
                setEditForm({ ...editForm, phone: toSriLankaPhoneDigits(text) })
              }
              keyboardType="phone-pad"
              placeholder="07XXXXXXXX"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdate}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={contractModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContractModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Contracts - {selectedSupplier?.name}
            </Text>

            <ScrollView style={styles.contractList}>
              {contractDocuments.length === 0 ? (
                <Text style={styles.noContracts}>No contracts uploaded yet</Text>
              ) : (
                contractDocuments.map((doc, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.contractItem}
                    onPress={() => viewContract(doc.url)}
                  >
                    <Text style={styles.contractName}>📄 {doc.filename}</Text>
                    <Text style={styles.contractDate}>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.uploadButton, uploadingContract && styles.disabled]}
              onPress={handleUploadContract}
              disabled={uploadingContract}
            >
              <Text style={styles.uploadButtonText}>
                {uploadingContract ? 'Uploading...' : 'Upload New Contract'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setContractModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  formTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  disabled: {
    opacity: 0.7,
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  supplierCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  editText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
  meta: {
    color: theme.colors.textLight,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  contractButton: {
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  contractButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    color: '#111111',
    fontWeight: '700',
  },
  contractList: {
    maxHeight: 300,
    marginVertical: theme.spacing.md,
  },
  noContracts: {
    textAlign: 'center',
    color: theme.colors.textLight,
    padding: theme.spacing.lg,
  },
  contractItem: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  contractName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  contractDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  uploadButtonText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
});

export default SupplierManagementScreen;