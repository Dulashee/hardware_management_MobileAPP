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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { orderAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge } from '../components/Card';

/**
 * Order Detail Screen
 * Displays full order details with status updates
 */
const OrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered'];

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderAPI.getById(orderId);
      setOrder(response.data.data.order);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      await orderAPI.updateStatus(orderId, { status: newStatus });
      Alert.alert('Success', `Order status updated to ${newStatus}`);
      fetchOrder();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? Stock will be restored.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderAPI.cancel(orderId);
              Alert.alert('Success', 'Order cancelled successfully');
              fetchOrder();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const handleUploadPaymentProof = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to upload payment proof.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      // Create FormData with proper file handling for React Native
      const formData = new FormData();
      const imageUri = result.assets[0].uri;
      const filename = `payment-proof-${Date.now()}.jpg`;
      
      // For React Native, we need to use the URI directly without file:// prefix in some cases
      formData.append('paymentProof', {
        uri: imageUri,
        name: filename,
        type: 'image/jpeg',
      });

      console.log('Uploading payment proof...', { uri: imageUri, filename, type: 'image/jpeg' });

      // Upload payment proof
      setUploadingProof(true);
      const response = await orderAPI.uploadPaymentProof(orderId, formData);
      console.log('Payment proof uploaded:', response);
      Alert.alert('Success', 'Payment proof uploaded successfully');
      fetchOrder();
    } catch (err) {
      console.error('Error uploading payment proof:', err);
      const errorMessage = err.message || 'Failed to upload payment proof';
      Alert.alert('Error', `${errorMessage}\n\nPlease check your connection and try again.`);
    } finally {
      setUploadingProof(false);
    }
  };

  const getNextStatus = () => {
    const currentIndex = statusFlow.indexOf(order?.status);
    if (currentIndex === -1 || currentIndex >= statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  const getStatusBadgeType = (status) => {
    const types = {
      pending: 'warning',
      confirmed: 'info',
      shipped: 'default',
      delivered: 'success',
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingIndicator text="Loading order details..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchOrder} />;
  }

  if (!order) {
    return <ErrorMessage message="Order not found" />;
  }

  const nextStatus = order.status !== 'cancelled' && order.status !== 'delivered' 
    ? getNextStatus() 
    : null;

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
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <StatusBadge status={order.status} type={getStatusBadgeType(order.status)} />
        </View>

        {/* Status Timeline */}
        <View style={styles.timeline}>
          {statusFlow.map((status, index) => {
            const isActive = status === order.status;
            const isCompleted = statusFlow.indexOf(order.status) > index;
            return (
              <View key={status} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    isCompleted && styles.timelineDotCompleted,
                    isActive && styles.timelineDotActive,
                  ]}
                />
                {index < statusFlow.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      isCompleted && styles.timelineLineCompleted,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.timelineLabel,
                    (isActive || isCompleted) && styles.timelineLabelActive,
                  ]}
                >
                  {status}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{order.customer.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{order.customer.phone}</Text>
          </View>
          {order.customer.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{order.customer.email}</Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              {item.product?.image && (
                <Image source={{ uri: toAbsoluteFileUrl(item.product.image) }} style={styles.itemImage} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product?.name || 'Product'}</Text>
                <Text style={styles.itemSKU}>SKU: {item.product?.sku || 'N/A'}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetail}>
                    LKR {item.unitPrice.toFixed(2)} x {item.quantity}
                  </Text>
                  <Text style={styles.itemSubtotal}>
                    LKR {(item.unitPrice * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>LKR {order.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Additional Info */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Payment Proof - Mandatory for order processing */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Proof</Text>
            {!order.paymentProof && (
              <TouchableOpacity
                style={[styles.uploadButton, uploadingProof && styles.buttonDisabled]}
                onPress={handleUploadPaymentProof}
                disabled={uploadingProof}
              >
                {uploadingProof ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload Proof</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {!order.paymentProof ? (
            <View style={styles.paymentProofPrompt}>
              <Text style={styles.promptIcon}>📸</Text>
              <Text style={styles.promptText}>
                Please upload payment proof to proceed with this order
              </Text>
            </View>
          ) : (
            <View style={styles.paymentProofContainer}>
              <Image
                source={{ uri: toAbsoluteFileUrl(order.paymentProof) }}
                style={styles.paymentProofImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.reuploadButton}
                onPress={handleUploadPaymentProof}
                disabled={uploadingProof}
              >
                <Text style={styles.reuploadButtonText}>
                  {uploadingProof ? 'Uploading...' : 'Re-upload'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
          </View>
          {order.createdBy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created By:</Text>
              <Text style={styles.infoValue}>{order.createdBy.name}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
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
                  Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleCancel}
              disabled={updating}
            >
              <Text style={styles.actionButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
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
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  orderNumber: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  timelineDotCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineDotActive: {
    backgroundColor: theme.colors.primary,
  },
  timelineLine: {
    position: 'absolute',
    top: 12,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.border,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    textTransform: 'capitalize',
  },
  timelineLabelActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  uploadButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  paidStatus: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  paymentProofContainer: {
    marginTop: theme.spacing.md,
  },
  paymentProofPrompt: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  promptIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  promptText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  paymentProofImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  reuploadButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  reuploadButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
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
  itemCard: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  itemSKU: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  itemSubtotal: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
  },
  totalLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  notesText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  actions: {
    gap: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});

export default OrderDetailScreen;
