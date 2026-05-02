import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { productAPI, supplierAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';
import LoadingIndicator from '../components/LoadingIndicator';

/**
 * Add/Edit Product Screen
 * Form for creating or updating products with image upload
 */
const AddEditProductScreen = ({ route, navigation }) => {
  const { mode, productId } = route.params;
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    minStock: '10',
    location: '',
    supplier: '',
  });

  const [errors, setErrors] = useState({});
  const [imageUri, setImageUri] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  /**
   * Fetch product data if editing
   */
  useEffect(() => {
    if (isEdit && productId) {
      fetchProduct();
    }
    fetchSuppliers();
  }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getById(productId);
      const product = response.data.data.product;

      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock: product.stock?.toString() || '',
        minStock: product.minStock?.toString() || '10',
        location: product.location || '',
        supplier: product.supplier?._id || '',
      });

      if (product.image) {
        setImageUri(toAbsoluteFileUrl(product.image));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load product');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierAPI.getAll({ isActive: true });
      setSuppliers(response.data.data.suppliers);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  };

  /**
   * Pick image from gallery or camera
   */
  const pickImage = async () => {
    Alert.alert(
      'Select Image',
      'Choose image source',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Camera access is needed');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            handleImageResult(result);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            handleImageResult(result);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

    const handleImageResult = (result) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selected = result.assets[0];
      setImageUri(selected.uri);
      setImageFile({
        uri: selected.uri,
        type: selected.mimeType || 'image/jpeg',
        name: selected.fileName || selected.uri.split('/').pop() || 'product.jpg',
      });
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (!/^[A-Z0-9-]+$/i.test(formData.sku)) {
      newErrors.sku = 'SKU must be alphanumeric (letters, numbers, hyphens)';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.stock || isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Valid stock quantity is required';
    }

    if (formData.minStock && (isNaN(parseInt(formData.minStock)) || parseInt(formData.minStock) < 0)) {
      newErrors.minStock = 'Valid minimum stock is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit form
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setSubmitting(true);

       if (imageFile) {
        const formDataObj = new FormData();
        
        formDataObj.append('name', formData.name.trim());
        formDataObj.append('sku', formData.sku.trim().toUpperCase());
        formDataObj.append('category', formData.category.trim());
        formDataObj.append('description', formData.description.trim());
        formDataObj.append('price', parseFloat(formData.price));
        formDataObj.append('stock', parseInt(formData.stock));
        formDataObj.append('minStock', parseInt(formData.minStock) || 10);
        formDataObj.append('location', formData.location.trim());
        
        if (formData.supplier) {
          formDataObj.append('supplier', formData.supplier);
        }

        formDataObj.append('image', {
          uri: imageFile.uri,
          type: imageFile.type || 'image/jpeg',
          name: imageFile.name || 'product.jpg',
        });

        if (isEdit) {
          await productAPI.update(productId, formDataObj);
          Alert.alert('Success', 'Product updated successfully');
        } else {
          await productAPI.create(formDataObj);
          Alert.alert('Success', 'Product created successfully');
        }
      } else {
        const productData = {
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          category: formData.category.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          minStock: parseInt(formData.minStock) || 10,
          location: formData.location.trim(),
          supplier: formData.supplier || undefined,
        };

        if (isEdit) {
          await productAPI.update(productId, productData);
          Alert.alert('Success', 'Product updated successfully');
        } else {
          await productAPI.create(productData);
          Alert.alert('Success', 'Product created successfully');
        }
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save product');
      console.error('Error saving product:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator text="Loading product..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{isEdit ? 'Edit Product' : 'Add New Product'}</Text>

        {/* Image Picker */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Product Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>Tap to add image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <FormInput
          label="Product Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          error={errors.name}
          placeholder="Enter product name"
        />

        <FormInput
          label="SKU *"
          value={formData.sku}
          onChangeText={(text) => setFormData({ ...formData, sku: text.toUpperCase() })}
          error={errors.sku}
          placeholder="e.g., HW-001"
        />

        <FormInput
          label="Category *"
          value={formData.category}
          onChangeText={(text) => setFormData({ ...formData, category: text })}
          error={errors.category}
          placeholder="e.g., Tools, Electronics"
        />

        <FormInput
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Product description (optional)"
          multiline
          numberOfLines={3}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <FormInput
              label="Price *"
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              error={errors.price}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfWidth}>
            <FormInput
              label="Stock *"
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
              error={errors.stock}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <FormInput
          label="Minimum Stock"
          value={formData.minStock}
          onChangeText={(text) => setFormData({ ...formData, minStock: text })}
          error={errors.minStock}
          placeholder="10"
          keyboardType="numeric"
        />

        <FormInput
          label="Location"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
          placeholder="Storage location (optional)"
        />

        {/* Supplier Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Supplier</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {suppliers.map((supplier) => (
              <TouchableOpacity
                key={supplier._id}
                style={[
                  styles.supplierChip,
                  formData.supplier === supplier._id && styles.supplierChipSelected,
                ]}
                onPress={() => setFormData({ ...formData, supplier: supplier._id })}
              >
                <Text
                  style={[
                    styles.supplierChipText,
                    formData.supplier === supplier._id && styles.supplierChipTextSelected,
                  ]}
                >
                  {supplier.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEdit ? 'Update Product' : 'Create Product'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  imageSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  imagePicker: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.lg,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  placeholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  supplierChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  supplierChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  supplierChipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  supplierChipTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});

export default AddEditProductScreen;
