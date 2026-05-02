import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';

/**
 * User Management Screen
 * Admin-only screen to manage users (view, promote, demote, delete)
 */
const UserManagementScreen = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all users
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.getAllUsers();
      setUsers(response.data.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  /**
   * Handle user role upgrade (customer -> staff)
   */
  const handleUpgradeRole = (userId, currentRole) => {
    if (currentRole === 'admin') {
      Alert.alert('Error', 'Cannot modify admin users');
      return;
    }

    Alert.alert(
      'Upgrade User Role',
      'Are you sure you want to upgrade this user from customer to staff?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            try {
              await authAPI.updateUser(userId, { role: 'staff' });
              Alert.alert('Success', 'User role upgraded to staff');
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update user role');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle user role demotion (staff -> customer)
   */
  const handleDemoteRole = (userId, currentRole) => {
    if (currentRole === 'admin') {
      Alert.alert('Error', 'Cannot modify admin users');
      return;
    }

    Alert.alert(
      'Demote User Role',
      'Are you sure you want to demote this user from staff to customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.updateUser(userId, { role: 'customer' });
              Alert.alert('Success', 'User role demoted to customer');
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update user role');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle user deletion
   */
  const handleDeleteUser = (userId, userName) => {
    if (userId === currentUser?.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.deleteUser(userId);
              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  /**
   * Get role badge color
   */
  const getRoleColor = (role) => {
    const colors = {
      admin: theme.colors.danger,
      staff: theme.colors.primary,
      customer: theme.colors.success,
    };
    return colors[role] || theme.colors.textLight;
  };

  /**
   * Render user item
   */
  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.userActions}>
        {item.role === 'customer' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.upgradeButton]}
            onPress={() => handleUpgradeRole(item._id, item.role)}
          >
            <Text style={styles.actionButtonText}>Upgrade to Staff</Text>
          </TouchableOpacity>
        )}

        {item.role === 'staff' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.demoteButton]}
            onPress={() => handleDemoteRole(item._id, item.role)}
          >
            <Text style={styles.actionButtonText}>Demote to Customer</Text>
          </TouchableOpacity>
        )}

        {item.role !== 'admin' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(item._id, item.name)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && users.length === 0) {
    return <LoadingIndicator text="Loading users..." />;
  }

  if (error && users.length === 0) {
    return <ErrorMessage message={error} onRetry={fetchUsers} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>{users.length} total users</Text>
      </View>

      {users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" subtitle="Users will appear here" />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </View>
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
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  userCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  roleBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  userActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  upgradeButton: {
    backgroundColor: theme.colors.success,
  },
  demoteButton: {
    backgroundColor: theme.colors.warning,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});

export default UserManagementScreen;
