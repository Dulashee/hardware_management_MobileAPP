import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { productAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import FilterTabs from '../components/FilterTabs';

/**
 * Product List Screen
 * Displays all products with search, filters, and pagination
 */
const ProductListScreen = ({ navigation }) => {
  const { isAdmin, isStaff } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([{ key: 'all', label: 'All' }]);

  /**
   * Fetch products from API
   */
  const fetchProducts = async (page = 1, search = '', category = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 20,
      };

      if (search) params.search = search;
      if (category !== 'all') params.category = category;

      const response = await productAPI.getAll(params);
      const { products: productList, pagination: pag } = response.data.data;

      setProducts(page === 1 ? productList : [...products, ...productList]);
      setPagination(pag);

      // Extract unique categories
      if (page === 1) {
        const uniqueCategories = [
          ...new Set(productList.map((p) => p.category).filter(Boolean)),
        ];
        setCategories([
          { key: 'all', label: 'All' },
          ...uniqueCategories.map((cat) => ({ key: cat, label: cat })),
        ]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts(1, searchText, activeCategory);
    }, [])
  );

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, searchText, activeCategory);
  };

  /**
   * Handle search
   */
  const handleSearch = useCallback((text) => {
    setSearchText(text);
    fetchProducts(1, text, activeCategory);
  }, [activeCategory]);

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    fetchProducts(1, searchText, category);
  };

  /**
   * Load more products (pagination)
   */
  const loadMore = () => {
    if (pagination.current < pagination.pages && !loading) {
      fetchProducts(pagination.current + 1, searchText, activeCategory);
    }
  };

  /**
   * Navigate to product detail
   */
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product._id });
  };

  /**
   * Navigate to add product
   */
  const handleAddProduct = () => {
    navigation.navigate('AddEditProduct', { mode: 'add' });
  };

  /**
   * Render product card
   */
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
    >
      {item.image ? (
        <Image source={{ uri: toAbsoluteFileUrl(item.image) }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>📦</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productSKU}>SKU: {item.sku}</Text>
        <Text style={styles.productPrice}>LKR {item.price.toFixed(2)}</Text>
        <View style={styles.stockRow}>
          <Text
            style={[
              styles.stockText,
              item.stock < item.minStock && styles.lowStockText,
            ]}
          >
            Stock: {item.stock}
          </Text>
          {item.stock < item.minStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Low Stock</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render footer for pagination
   */
  const renderFooter = () => {
    if (loading && products.length > 0) {
      return <LoadingIndicator text="Loading more..." style={styles.footerLoader} />;
    }
    return null;
  };

  if (loading && products.length === 0) {
    return <LoadingIndicator text="Loading products..." />;
  }

  if (error && products.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => fetchProducts(1, searchText, activeCategory)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search products by name or SKU..."
        style={styles.searchBar}
      />
      <FilterTabs
        tabs={categories}
        activeTab={activeCategory}
        onTabPress={handleCategoryChange}
      />
      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products found"
          subtitle="Try adjusting your search or filters"
        />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
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
      {/* Show FAB only for admin and staff */}
      {(isAdmin() || isStaff()) && (
        <TouchableOpacity style={styles.fab} onPress={handleAddProduct}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    margin: theme.spacing.md,
    marginBottom: 0,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  productImage: {
    width: 100,
    height: 100,
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
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productSKU: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  lowStockText: {
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  lowStockBadge: {
    backgroundColor: theme.colors.danger,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  lowStockBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
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

export default ProductListScreen;
