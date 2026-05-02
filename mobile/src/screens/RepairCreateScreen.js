import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { repairAPI, productAPI } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';

/**
 * Repair Create Screen - Simplified
 */
const RepairCreateScreen = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    issue: '',
    estimatedCost: '',
    warrantyClaim: false,
  });

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await productAPI.getAll({ limit: 100 });
        const productList = response.data?.data?.products || [];
        setProducts(productList);
        if (productList.length > 0) {
          setFormData((prev) => ({ ...prev, product: productList[0]._id }));
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        setSelectedPhotos([...selectedPhotos, ...result.assets]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removePhoto = (index) => {
    const updated = [...selectedPhotos];
    updated.splice(index, 1);
    setSelectedPhotos(updated);
  };

  const handleSubmit = async () => {
    if (!formData.product || !formData.customerName || !formData.customerPhone || !formData.issue) {
      Alert.alert('Validation Error', 'All required fields must be filled');
      return;
    }

    try {
      setSubmitting(true);
      
      // If there are photos, use FormData
      if (selectedPhotos.length > 0) {
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
        
        selectedPhotos.forEach((photo, index) => {
          formDataObj.append('damagePhotos', {
            uri: photo.uri,
            name: photo.fileName || `damage-${index}.jpg`,
            type: photo.mimeType || 'image/jpeg',
          });
        });
        
        await repairAPI.create(formDataObj);
      } else {
        // No photos, use JSON
        await repairAPI.create({
          product: formData.product,
          customer: {
            name: formData.customerName.trim(),
            phone: formData.customerPhone.trim(),
            email: formData.customerEmail.trim() || undefined,
          },
          issue: formData.issue.trim(),
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
          warrantyClaim: formData.warrantyClaim,
        });
      }
      
      Alert.alert('Success', 'Repair request created');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create repair');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Repair Request</Text>
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
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Damage Photos (Optional)</Text>
          <TouchableOpacity style={styles.photoPicker} onPress={pickImages}>
            <Text style={styles.photoPickerText}>📷 Select Photos (Max 5)</Text>
          </TouchableOpacity>
          
          {selectedPhotos.length > 0 && (
            <View style={styles.photoPreviewGrid}>
              {selectedPhotos.map((photo, index) => (
                <View key={index} style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(index)}>
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
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Create Repair</Text>}
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
});

export default RepairCreateScreen;
