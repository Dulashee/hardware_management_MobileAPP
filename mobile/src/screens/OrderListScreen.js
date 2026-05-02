import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { orderAPI } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import FilterTabs from '../components/FilterTabs';
import { StatusBadge } from '../components/Card';

/**
 * Order List Screen
 * Displays all orders with status filters
 */
const OrderListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  /**
   * Fetch orders from API
   */
  const fetchOrders = async (page = 1, status = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit: 20 };
      if (status !== 'all') params.status = status;

      const response = await orderAPI.getAll(params);
      const { orders: orderList, pagination: pag } = response.data.data;

      setOrders(page === 1 ? orderList : [...orders, ...orderList]);
      setPagination(pag);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders(1, activeStatus);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(1, activeStatus);
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    fetchOrders(1, status);
  };

  const loadMore = () => {
    if (pagination.current < pagination.pages && !loading) {
      fetchOrders(pagination.current + 1, activeStatus);
    }
  };

  const handleOrderPress = (order) => {
    navigation.navigate('OrderDetail', { orderId: order._id });
  };

  const handleCreateOrder = () => {
    navigation.navigate('OrderCreate');
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
    });
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>{item.orderNumber}</Text>
        <StatusBadge status={item.status} type={getStatusBadgeType(item.status)} />
      </View>
      <View style={styles.orderBody}>
        <Text style={styles.customerName}>{item.customer.name}</Text>
        <Text style={styles.customerPhone}>{item.customer.phone}</Text>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>LKR {item.totalAmount.toFixed(2)}</Text>
        <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (loading && orders.length > 0) {
      return <LoadingIndicator text="Loading more..." style={styles.footerLoader} />;
    }
    return null;
  };

  if (loading && orders.length === 0) {
    return <LoadingIndicator text="Loading orders..." />;
  }

  if (error && orders.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => fetchOrders(1, activeStatus)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FilterTabs
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabPress={handleStatusChange}
      />
      {orders.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No orders found"
          subtitle="Create your first order"
        />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={handleCreateOrder}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  orderNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  orderBody: {
    marginBottom: theme.spacing.sm,
  },
  customerName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  orderTotal: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  orderDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  footerLoader: {
    height: 60,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  fabText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default OrderListScreen;
