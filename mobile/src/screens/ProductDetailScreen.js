import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { productAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import FormInput from '../components/FormInput';

/**
 * Product Detail Screen
 * Displays full product details with stock adjustment and edit/delete options
 */
const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const { isAdmin, isStaff } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [adjustingStock, setAdjustingStock] = useState(false);

  /**
   * Fetch product details
   */
  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.getById(productId);
      setProduct(response.data.data.product);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  /**
   * Handle stock adjustment
   */
  const handleStockAdjustment = async (type) => {
    const adjustment = parseInt(stockAdjustment);
    
    if (!stockAdjustment || isNaN(adjustment) || adjustment <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid quantity');
      return;
    }

    try {
      setAdjustingStock(true);
      const adjustmentValue = type === 'increase' ? adjustment : -adjustment;
      
      const response = await productAPI.updateStock(productId, {
        adjustment: adjustmentValue,
      });
      
      setProduct(response.data.data.product);
      setStockAdjustment('');
      Alert.alert('Success', `Stock ${type === 'increase' ? 'increased' : 'decreased'} successfully`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update stock');
      console.error('Error updating stock:', err);
    } finally {
      setAdjustingStock(false);
    }
  };

  /**
   * Handle delete product
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productAPI.delete(productId);
              Alert.alert('Success', 'Product deleted successfully');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  /**
   * Navigate to edit screen
   */
  const handleEdit = () => {
    navigation.navigate('AddEditProduct', { mode: 'edit', productId });
  };

  /**
   * Handle order now
   */
  const handleOrderNow = () => {
    navigation.navigate('OrderCreate', { productToOrder: product });
  };

  if (loading) {
    return <LoadingIndicator text="Loading product details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchProduct} />;
  }

  if (!product) {
    return <ErrorMessage message="Product not found" />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme.colors.primary]}
        />
      }
    >
      {product.image ? (
        <Image source={{ uri: toAbsoluteFileUrl(product.image) }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>📦</Text>
        </View>
      )}

      {product.stock < product.minStock && (
        <View style={styles.lowStockBanner}>
          <Text style={styles.lowStockText}>
            ⚠️ Low Stock Alert: Only {product.stock} items remaining
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productSKU}>SKU: {product.sku}</Text>
        <Text style={styles.productPrice}>LKR {product.price.toFixed(2)}</Text>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Product Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{product.category}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Stock:</Text>
            <Text
              style={[
                styles.infoValue,
                product.stock < product.minStock && styles.lowStockValue,
              ]}
            >
              {product.stock} units
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Minimum Stock:</Text>
            <Text style={styles.infoValue}>{product.minStock} units</Text>
          </View>
          {product.location && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{product.location}</Text>
            </View>
          )}
          {product.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{product.description}</Text>
            </View>
          )}
          {product.supplier && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supplier:</Text>
              <Text style={styles.infoValue}>{product.supplier.name}</Text>
            </View>
          )}
        </View>

        {(isAdmin() || isStaff()) && (
          <View style={styles.stockAdjustmentSection}>
            <Text style={styles.sectionTitle}>Adjust Stock</Text>
            <FormInput
              label="Quantity"
              value={stockAdjustment}
              onChangeText={setStockAdjustment}
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
            <View style={styles.adjustmentButtons}>
              <TouchableOpacity
                style={[styles.adjustButton, styles.increaseButton]}
                onPress={() => handleStockAdjustment('increase')}
                disabled={adjustingStock || !stockAdjustment}
              >
                <Text style={styles.adjustButtonText}>+ Increase</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustButton, styles.decreaseButton]}
                onPress={() => handleStockAdjustment('decrease')}
                disabled={adjustingStock || !stockAdjustment}
              >
                <Text style={styles.adjustButtonText}>- Decrease</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(isAdmin() || isStaff()) && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit Product</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Product</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Order Now Button for All Users */}
        <View style={styles.orderSection}>
          <TouchableOpacity style={styles.orderButton} onPress={handleOrderNow}>
            <Text style={styles.orderButtonText}>🛒 Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  productImage: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.surface,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 80,
  },
  lowStockBanner: {
    backgroundColor: theme.colors.warning,
    padding: theme.spacing.md,
  },
  lowStockText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing.lg,
  },
  productName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  productSKU: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  productPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  infoSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  lowStockValue: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  stockAdjustmentSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  adjustButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  increaseButton: {
    backgroundColor: theme.colors.success,
  },
  decreaseButton: {
    backgroundColor: theme.colors.danger,
  },
  adjustButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  actionButtons: {
    gap: theme.spacing.md,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  orderSection: {
    marginTop: theme.spacing.lg,
  },
  orderButton: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
