import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { repairAPI } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import FilterTabs from '../components/FilterTabs';
import { StatusBadge } from '../components/Card';

/**
 * Repair List Screen
 */
const RepairListScreen = ({ navigation }) => {
  const { isAdmin, isStaff } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'received', label: 'Received' },
    { key: 'diagnosing', label: 'Diagnosing' },
    { key: 'in-repair', label: 'In Repair' },
    { key: 'completed', label: 'Completed' },
    { key: 'returned', label: 'Returned' },
  ];

  const fetchRepairs = async (status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (status !== 'all') params.status = status;
      const response = await repairAPI.getAll(params);
      setRepairs(response.data.data.repairs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load repairs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRepairs(activeStatus); }, []));

  const handleRefresh = () => { setRefreshing(true); fetchRepairs(activeStatus); };
  const handleStatusChange = (status) => { setActiveStatus(status); fetchRepairs(status); };
  const handleRepairPress = (repair) => { navigation.navigate('RepairDetail', { repairId: repair._id }); };

  const getStatusBadgeType = (status) => {
    const types = { received: 'default', diagnosing: 'info', 'in-repair': 'warning', completed: 'success', returned: 'info', cancelled: 'danger' };
    return types[status] || 'default';
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const renderRepair = ({ item }) => (
    <TouchableOpacity style={styles.repairCard} onPress={() => handleRepairPress(item)}>
      <View style={styles.repairHeader}>
        <Text style={styles.repairNumber}>{item.repairNumber}</Text>
        <StatusBadge status={item.status} type={getStatusBadgeType(item.status)} />
      </View>
      <View style={styles.repairBody}>
        <Text style={styles.productName}>{item.product?.name || 'Product'}</Text>
        <Text style={styles.customerName}>{item.customer.name}</Text>
      </View>
      <Text style={styles.repairDate}>Received: {formatDate(item.receivedDate)}</Text>
    </TouchableOpacity>
  );

  if (loading) return <LoadingIndicator text="Loading repairs..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => fetchRepairs(activeStatus)} />;

  return (
    <View style={styles.container}>
      <FilterTabs tabs={statusTabs} activeTab={activeStatus} onTabPress={handleStatusChange} />
      {repairs.length === 0 ? (
        <EmptyState icon="🔧" title="No repairs found" subtitle="Create a repair request" />
      ) : (
        <FlatList data={repairs} renderItem={renderRepair} keyExtractor={(item) => item._id} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />} />
      )}
      {/* Show FAB only for admin and staff */}
      {(isAdmin() || isStaff()) && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RepairCreate')}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.md },
  repairCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  repairHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  repairNumber: { fontSize: theme.fontSize.md, fontWeight: 'bold', color: theme.colors.text },
  repairBody: { marginBottom: theme.spacing.sm },
  productName: { fontSize: theme.fontSize.md, color: theme.colors.text, marginBottom: 2 },
  customerName: { fontSize: theme.fontSize.sm, color: theme.colors.textLight },
  repairDate: { fontSize: theme.fontSize.xs, color: theme.colors.textLight, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  fab: { position: 'absolute', bottom: theme.spacing.xl, right: theme.spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', ...theme.shadows.lg },
  fabText: { fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' },
});

export default RepairListScreen;
