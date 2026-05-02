import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { orderAPI, productAPI, toAbsoluteFileUrl } from '../services/api';
import { theme } from '../utils/theme';
import FormInput from '../components/FormInput';
import LoadingIndicator from '../components/LoadingIndicator';
import EmptyState from '../components/EmptyState';

/**
 * Order Create Screen
 * Simplified order creation with full product list
 */
const OrderCreateScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');

  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([{ key: 'all', label: 'All' }]);

  // Handle product passed from ProductDetailScreen
  useEffect(() => {
    if (route.params?.productToOrder) {
      const product = route.params.productToOrder;
      setCart([{ product, quantity: 1, unitPrice: product.price }]);
      // Clear the param so it doesn't re-add on navigation back
      navigation.setParams({ productToOrder: null });
    }
  }, [route.params?.productToOrder]);

  // Fetch all products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  /**
   * Fetch products from API
   */
  const fetchProducts = async (search = '', category = 'all') => {
    try {
      setLoadingProducts(true);
      const params = { limit: 100 };
      if (search) params.search = search;
      if (category !== 'all') params.category = category;

      const response = await productAPI.getAll(params);
      const { products: productList } = response.data.data;

      setProducts(productList);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(productList.map((p) => p.category).filter(Boolean)),
      ];
      setCategories([
        { key: 'all', label: 'All' },
        ...uniqueCategories.map((cat) => ({ key: cat, label: cat })),
      ]);
    } catch (err) {
      console.error('Error fetching products:', err);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  /**
   * Handle search
   */
  const handleSearch = (text) => {
    setSearchText(text);
    fetchProducts(text, activeCategory);
  };

  /**
   * Handle category filter
   */
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    fetchProducts(searchText, category);
  };

  /**
   * Add product to cart
   */
  const addToCart = (product) => {
    const existing = cart.find((item) => item.product._id === product._id);
    if (existing) {
      // Update quantity if already in cart
      setCart(
        cart.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1, unitPrice: product.price }]);
    }
  };

  /**
   * Update quantity
   */
  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCart(
      cart.map((item) =>
        item.product._id === productId ? { ...item, quantity } : item
      )
    );
  };

  /**
   * Remove from cart
   */
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product._id !== productId));
  };

  /**
   * Calculate total
   */
  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  };

  /**
   * Submit order
   */
  const handleSubmit = async () => {
    if (cart.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product');
      return;
    }

    try {
      setSubmitting(true);

      const orderData = {
        customer: {
          name: user?.name || 'Customer',
          phone: user?.phone || '',
          email: user?.email || undefined,
        },
        items: cart.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        notes: notes.trim() || undefined,
      };

      await orderAPI.create(orderData);
      Alert.alert('Success', 'Order created successfully');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create order');
      console.error('Error creating order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Render product card
   */
  const renderProduct = ({ item }) => {
    const inCart = cart.find((c) => c.product._id === item._id);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, inCart && styles.productCardDisabled]}
        onPress={() => !inCart && addToCart(item)}
        activeOpacity={inCart ? 1 : 0.7}
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
          <Text style={styles.productPrice}>LKR {item.price.toFixed(2)}</Text>
          <Text style={styles.productStock}>Stock: {item.stock}</Text>
        </View>
        <View style={styles.productAction}>
          {inCart ? (
            <View style={styles.inCartBadge}>
              <Text style={styles.inCartText}>✓ In Cart</Text>
            </View>
          ) : (
            <Text style={styles.addButtonText}>+ Add</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FormInput
          value={searchText}
          onChangeText={handleSearch}
          placeholder="Search products..."
          style={styles.searchInput}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryTab,
                activeCategory === cat.key && styles.categoryTabActive,
              ]}
              onPress={() => handleCategoryChange(cat.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartSummaryContent}>
            <Text style={styles.cartSummaryText}>
              🛒 {cart.length} item{cart.length > 1 ? 's' : ''} | LKR
              {calculateTotal().toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.viewCartButton}
              onPress={() => setCartModalVisible(true)}
            >
              <Text style={styles.viewCartButtonText}>View Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Product List */}
      {loadingProducts ? (
        <LoadingIndicator text="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState icon="📦" title="No products found" subtitle="Try adjusting your search" />
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cart Modal */}
      <Modal
        visible={cartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shopping Cart</Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart}
              keyExtractor={(item) => item.product._id}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  {item.product.image ? (
                    <Image
                      source={{ uri: toAbsoluteFileUrl(item.product.image) }}
                      style={styles.cartItemImage}
                    />
                  ) : (
                    <View style={[styles.cartItemImage, styles.cartImagePlaceholder]}>
                      <Text>📦</Text>
                    </View>
                  )}
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      LKR {item.unitPrice.toFixed(2)} x {item.quantity} = LKR
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.product._id, item.quantity - 1)}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.product._id, item.quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product._id)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListFooterComponent={
                <>
                  <View style={styles.cartTotal}>
                    <Text style={styles.cartTotalLabel}>Total:</Text>
                    <Text style={styles.cartTotalValue}>LKR {calculateTotal().toFixed(2)}</Text>
                  </View>

                  <FormInput
                    label="Notes (Optional)"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Order notes..."
                    multiline
                    numberOfLines={2}
                  />
                </>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Submit Button */}
      {cart.length > 0 && (
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Create Order (LKR {calculateTotal().toFixed(2)})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    padding: theme.spacing.md,
    paddingBottom: 0,
  },
  searchInput: {
    marginBottom: 0,
  },
  categoryScroll: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#111111',
  },
  cartSummary: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.md,
  },
  cartSummaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartSummaryText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: '#111111',
  },
  viewCartButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#111111',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  viewCartButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: '#111111',
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  productCardDisabled: {
    opacity: 0.6,
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
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  productStock: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
  productAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: theme.spacing.md,
  },
  addButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  inCartBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  inCartText: {
    fontSize: theme.fontSize.xs,
    color: '#111111',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalClose: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textLight,
  },
  cartItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  cartImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
  },
  cartItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: theme.spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
  },
  cartTotalLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  cartTotalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  paymentOption: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  paymentOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  paymentOptionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: '600',
  },
  paymentOptionTextActive: {
    color: '#FFFFFF',
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  submitButton: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default OrderCreateScreen;
