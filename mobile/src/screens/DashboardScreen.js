import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { productAPI, orderAPI, taskAPI, repairAPI, noticeAPI, toAbsoluteFileUrl } from '../services/api';
import { StatCard, StatusBadge } from '../components/Card';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';

/**
 * Dashboard Screen
 * Displays key metrics and quick actions with real-time data
 */
const DashboardScreen = ({ navigation }) => {
  const { user, logout, isAdmin, isStaff, isCustomer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    activeTasks: 0,
    openRepairs: 0,
  });
  const [products, setProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [activeNotices, setActiveNotices] = useState([]);

  /**
   * Fetch dashboard data
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const requests = [
        productAPI.getAll({ limit: isAdmin() || isStaff() ? 1 : 20 }),
        orderAPI.getAll({ limit: 5 }),
        noticeAPI.getActive(),
      ];

      if (isAdmin()) {
        requests.push(orderAPI.getStats(), taskAPI.getStats(), repairAPI.getStats(), productAPI.getLowStock());
      }

      const results = await Promise.allSettled(requests);
      const productsRes = results[0];
      const recentOrdersRes = results[1];
      const noticesRes = results[2];
      const ordersRes = isAdmin() ? results[3] : null;
      const tasksRes = isAdmin() ? results[4] : null;
      const repairsRes = isAdmin() ? results[5] : null;
      const lowStockRes = isAdmin() ? results[6] : null;

      // Process products count or products list
      if (productsRes.status === 'fulfilled') {
        if (isAdmin() || isStaff()) {
          setStats((prev) => ({ ...prev, totalProducts: productsRes.value.data.data.pagination.total }));
        } else {
          // For customers, store the actual products
          setProducts(productsRes.value.data.data.products);
        }
      }

      // Process active notices
      if (noticesRes.status === 'fulfilled') {
        setActiveNotices(noticesRes.value.data.data.notices || []);
      }

      // Process order stats
      if (ordersRes && ordersRes.status === 'fulfilled') {
        const orderStats = ordersRes.value.data.data;
        const pending = orderStats.byStatus.find((s) => s._id === 'pending');
        setStats((prev) => ({
          ...prev,
          pendingOrders: pending?.count || 0,
        }));
      }

      // Process task stats
      if (tasksRes && tasksRes.status === 'fulfilled') {
        const taskStats = tasksRes.value.data.data;
        const activeTasks = taskStats.byStatus
          .filter((s) => ['pending', 'in-progress'].includes(s._id))
          .reduce((sum, s) => sum + s.count, 0);
        setStats((prev) => ({ ...prev, activeTasks }));
      }

      // Process repair stats
      if (repairsRes && repairsRes.status === 'fulfilled') {
        const repairStats = repairsRes.value.data.data;
        const openRepairs = repairStats.byStatus
          .filter((s) => ['received', 'diagnosing', 'in-repair'].includes(s._id))
          .reduce((sum, s) => sum + s.count, 0);
        setStats((prev) => ({ ...prev, openRepairs }));
      }

      // Process low stock
      if (lowStockRes && lowStockRes.status === 'fulfilled') {
        setLowStockProducts(lowStockRes.value.data.data.products.slice(0, 5));
      }

      // Process recent orders
      if (recentOrdersRes.status === 'fulfilled') {
        setRecentOrders(recentOrdersRes.value.data.data.orders);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const statsData = [
    { title: 'Total Products', value: stats.totalProducts.toString(), icon: '📦', color: theme.colors.primary },
    { title: 'Pending Orders', value: stats.pendingOrders.toString(), icon: '📋', color: theme.colors.warning },
    { title: 'Active Tasks', value: stats.activeTasks.toString(), icon: '✅', color: theme.colors.success },
    { title: 'Open Repairs', value: stats.openRepairs.toString(), icon: '🔧', color: theme.colors.info },
  ];

  // Filter stats based on role
  const filteredStats = isAdmin() || isStaff() 
    ? statsData 
    : [statsData[1]]; // Only pending orders for customers

  const quickActions = [
    { title: 'Products', icon: '📦', screen: 'Products' },
    { title: 'Orders', icon: '📋', screen: 'Orders' },
    { title: 'Tasks', icon: '✅', screen: 'Tasks' },
    { title: 'Repairs', icon: '🔧', screen: 'Repairs' },
  ];

  // Filter quick actions based on role
  const filteredActions = isAdmin() || isStaff()
    ? quickActions
    : [quickActions[0], quickActions[1]]; // Products and Orders for customers

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNoticeTypeIcon = (type) => {
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

  const getNoticePriorityColor = (priority) => {
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

  if (loading) {
    return <LoadingIndicator text="Loading dashboard..." />;
  }

  if (error && stats.totalProducts === 0) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Active Notices Section */}
      {activeNotices.length > 0 && (
        <View style={styles.noticesSection}>
          <Text style={styles.noticesTitle}>📢 Announcements</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.noticesScroll}
          >
            {activeNotices.map((notice) => (
              <View key={notice._id} style={styles.noticeCard}>
                {notice.bannerImage && (
                  <Image 
                    source={{ uri: toAbsoluteFileUrl(notice.bannerImage) }} 
                    style={styles.noticeBanner} 
                  />
                )}
                <View style={styles.noticeContent}>
                  <View style={styles.noticeHeader}>
                    <Text style={styles.noticeTitleText}>
                      {getNoticeTypeIcon(notice.type)} {notice.title}
                    </Text>
                  </View>
                  <Text style={styles.noticeText} numberOfLines={2}>
                    {notice.content}
                  </Text>
                  <View style={styles.noticeFooter}>
                    <View style={[styles.noticePriorityBadge, { backgroundColor: getNoticePriorityColor(notice.priority) }]}>
                      <Text style={styles.noticePriorityText}>{notice.priority}</Text>
                    </View>
                    <Text style={styles.noticeDate}>{formatDate(notice.createdAt)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {filteredStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {filteredActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick access navigation only for customers - product list removed */}

      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderItem}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <StatusBadge status={order.status} type={getStatusBadgeType(order.status)} />
              </View>
              <View style={styles.orderBody}>
                <Text style={styles.orderCustomer}>{order.customer.name}</Text>
                <Text style={styles.orderTotal}>LKR {order.totalAmount.toFixed(2)}</Text>
              </View>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(isAdmin() || isStaff()) && lowStockProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Low Stock Alerts</Text>
          {lowStockProducts.map((product) => (
            <View key={product._id} style={styles.lowStockItem}>
              <Text style={styles.lowStockName}>{product.name}</Text>
              <Text style={styles.lowStockValue}>
                {product.stock}/{product.minStock} units
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: '#0D1B2A',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  noticesSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  noticesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  noticesScroll: {
    paddingRight: theme.spacing.lg,
  },
  noticeCard: {
    width: 300,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  noticeBanner: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.backgroundDark,
  },
  noticeContent: {
    padding: theme.spacing.md,
  },
  noticeHeader: {
    marginBottom: theme.spacing.sm,
  },
  noticeTitleText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  noticeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticePriorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  noticePriorityText: {
    color: '#fff',
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  noticeDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLighter,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    gap: theme.spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  productCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
  },
  productInfo: {
    padding: theme.spacing.md,
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  productStock: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  productSKU: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  viewAllButton: {
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  orderItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  orderNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  orderCustomer: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  orderTotal: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  orderDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
    ...theme.shadows.sm,
  },
  lowStockName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  lowStockValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
