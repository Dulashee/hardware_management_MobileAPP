import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { repairAPI, productAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Repair Edit Screen - Allows staff to update repair details
 */
const RepairEditScreen = ({ route, navigation }) => {
  const { repairId } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [formData, setFormData] = useState({
    product: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    issue: '',
    estimatedCost: '',
    warrantyClaim: false,
    technicianNotes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch repair details
        const repairResponse = await repairAPI.getById(repairId);
        const repair = repairResponse.data.data.repair;
        
        setFormData({
          product: repair.product?._id || '',
          customerName: repair.customer.name || '',
          customerPhone: repair.customer.phone || '',
          customerEmail: repair.customer.email || '',
          issue: repair.issue || '',
          estimatedCost: repair.estimatedCost?.toString() || '',
          warrantyClaim: repair.warrantyClaim || false,
          technicianNotes: repair.technicianNotes || '',
        });
        
        setExistingPhotos(repair.damagePhotos || []);
        
        // Fetch products
        const productsResponse = await productAPI.getAll({ limit: 100 });
        const productList = productsResponse.data?.data?.products || [];
        setProducts(productList);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load repair');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repairId]);

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        setNewPhotos([...newPhotos, ...result.assets]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeExistingPhoto = (index) => {
    const photo = existingPhotos[index];
    console.log('🗑️ Marking photo for deletion:', photo.publicId);
    console.log('🗑️ Photo URL:', photo.url);
    
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          // Track the photo ID for deletion using functional update
          setDeletedPhotoIds(prevIds => {
            const newIds = [...prevIds, photo.publicId];
            console.log('✅ Updated deletedPhotoIds:', newIds);
            return newIds;
          });
          // Remove from display
          const updated = [...existingPhotos];
          updated.splice(index, 1);
          setExistingPhotos(updated);
          console.log('✅ Remaining photos:', updated.length);
        },
      },
    ]);
  };

  const removeNewPhoto = (index) => {
    const updated = [...newPhotos];
    updated.splice(index, 1);
    setNewPhotos(updated);
  };

  const handleSubmit = async () => {
    if (!formData.product || !formData.customerName || !formData.customerPhone || !formData.issue) {
      Alert.alert('Validation Error', 'All required fields must be filled');
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('📤 Submitting repair update...');
      console.log('📝 formData.product:', formData.product);
      console.log('📝 deletedPhotoIds:', deletedPhotoIds);
      console.log('📝 newPhotos count:', newPhotos.length);
      
      const formDataObj = new FormData();
      formDataObj.append('product', formData.product);
      formDataObj.append('customer[name]', formData.customerName.trim());
      formDataObj.append('customer[phone]', formData.customerPhone.trim());
      if (formData.customerEmail.trim()) {
        formDataObj.append('customer[email]', formData.customerEmail.trim());
      }
      formDataObj.append('issue', formData.issue.trim());
      if (formData.estimatedCost) {
        formDataObj.append('estimatedCost', parseFloat(formData.estimatedCost));
      }
      formDataObj.append('warrantyClaim', formData.warrantyClaim);
      if (formData.technicianNotes.trim()) {
        formDataObj.append('technicianNotes', formData.technicianNotes.trim());
      }
      
      // Send deleted photo IDs
      if (deletedPhotoIds.length > 0) {
        const idsString = JSON.stringify(deletedPhotoIds);
        console.log('📤 Sending deletedPhotoIds:', idsString);
        formDataObj.append('deletedPhotoIds', idsString);
      } else {
        console.log('ℹ️ No photos to delete');
      }
      
      // Add new photos
      newPhotos.forEach((photo, index) => {
        formDataObj.append('damagePhotos', {
          uri: photo.uri,
          name: photo.fileName || `damage-${index}.jpg`,
          type: photo.mimeType || 'image/jpeg',
        });
      });
      
      await repairAPI.update(repairId, formDataObj);
      
      Alert.alert('Success', 'Repair updated successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update repair');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingIndicator text="Loading repair..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => navigation.goBack()} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Edit Repair Request</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Product *</Text>
          {loadingProducts ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product._id}
                  style={[styles.productChip, formData.product === product._id && styles.productChipSelected]}
                  onPress={() => setFormData({ ...formData, product: product._id })}
                >
                  <Text style={[styles.productChipText, formData.product === product._id && styles.productChipTextSelected]}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        
        <FormInput label="Customer Name *" value={formData.customerName} onChangeText={(text) => setFormData({ ...formData, customerName: text })} placeholder="Customer name" />
        <FormInput label="Customer Phone *" value={formData.customerPhone} onChangeText={(text) => setFormData({ ...formData, customerPhone: text })} placeholder="Phone number" keyboardType="phone-pad" />
        <FormInput label="Customer Email" value={formData.customerEmail} onChangeText={(text) => setFormData({ ...formData, customerEmail: text })} placeholder="Email (optional)" keyboardType="email-address" />
        <FormInput label="Issue Description *" value={formData.issue} onChangeText={(text) => setFormData({ ...formData, issue: text })} placeholder="Describe the issue" multiline numberOfLines={3} />
        <FormInput label="Estimated Cost" value={formData.estimatedCost} onChangeText={(text) => setFormData({ ...formData, estimatedCost: text })} placeholder="0.00" keyboardType="decimal-pad" />
        <FormInput label="Technician Notes" value={formData.technicianNotes} onChangeText={(text) => setFormData({ ...formData, technicianNotes: text })} placeholder="Add notes" multiline numberOfLines={3} />
        
        {/* Existing Photos */}
        {existingPhotos.length > 0 && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Existing Photos</Text>
            <View style={styles.photoPreviewGrid}>
              {existingPhotos.map((photo, index) => (
                <TouchableOpacity key={index} onPress={() => openImageModal(toAbsoluteFileUrl(photo.url))} activeOpacity={0.8}>
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: toAbsoluteFileUrl(photo.url) }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeExistingPhoto(index)}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* New Photos */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Add More Photos (Optional)</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={pickImages}>
            <Text style={styles.photoPickerText}>📷 Select Photos (Max 5)</Text>
          </TouchableOpacity>
          
          {newPhotos.length > 0 && (
            <View style={styles.photoPreviewGrid}>
              {newPhotos.map((photo, index) => (
                <View key={index} style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeNewPhoto(index)}>
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
        
        <TouchableOpacity style={[styles.warrantyToggle, formData.warrantyClaim && styles.warrantyToggleActive]} onPress={() => setFormData({ ...formData, warrantyClaim: !formData.warrantyClaim })}>
          <Text style={[styles.warrantyText, formData.warrantyClaim && styles.warrantyTextActive]}>
            {formData.warrantyClaim ? '✓ Warranty Claim' : '○ Warranty Claim'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Update Repair</Text>}
        </TouchableOpacity>
      </View>

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
  title: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.lg },
  inputContainer: { marginBottom: theme.spacing.lg },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  productChip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.borderRadius.lg, backgroundColor: theme.colors.surface, marginRight: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  productChipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  productChipText: { color: theme.colors.textLight, fontWeight: '600' },
  productChipTextSelected: { color: '#FFFFFF' },
  photoPicker: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', alignItems: 'center' },
  photoPickerText: { fontSize: theme.fontSize.md, color: theme.colors.primary, fontWeight: '600' },
  photoPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  photoPreviewContainer: { position: 'relative' },
  photoPreview: { width: 80, height: 80, borderRadius: theme.borderRadius.md },
  removePhotoBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: theme.colors.danger, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  warrantyToggle: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', marginBottom: theme.spacing.lg },
  warrantyToggleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  warrantyText: { fontSize: theme.fontSize.md, color: theme.colors.textLight, fontWeight: '600' },
  warrantyTextActive: { color: '#FFFFFF' },
  submitButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.lg, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: theme.fontSize.md, fontWeight: '600' },
  imageModalOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  imageModalCloseText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  fullScreenImage: { width: '100%', height: '100%' },
});

export default RepairEditScreen;
