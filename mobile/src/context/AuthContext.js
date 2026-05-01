import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';

const AuthContext = createContext();

/**
 * Authentication Context Provider
 * Manages user authentication state, login/logout functionality, and token persistence
 * Connects to backend authentication endpoints
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize auth state on app startup
   * Checks for stored token and auto-login if available
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('authToken');
        const storedUser = await SecureStore.getItemAsync('userData');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user with credentials
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);

      // Call backend login endpoint
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data.data;

      setToken(token);
      setUser(user);

      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user
   * @param {Object} userData - User registration data
   */
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      // Call backend registration endpoint
      const response = await authAPI.register(userData);
      const { token, user } = response.data.data;

      setToken(token);
      setUser(user);

      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user and clear stored data
   */
  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  /**
   * Update user profile
   * @param {Object} updates - User data updates
   */
  const updateUser = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Update user error:', err);
    }
  };

  /**
   * Check if current user is admin
   */
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  /**
   * Check if current user is staff
   */
  const isStaff = () => {
    return user?.role === 'staff';
  };

  /**
   * Check if current user is customer
   */
  const isCustomer = () => {
    return user?.role === 'customer';
  };

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check (e.g., 'manage_products', 'manage_users')
   */
  const hasPermission = (permission) => {
    const permissions = {
      manage_products: ['admin', 'staff'],
      manage_orders: ['admin', 'staff'],
      manage_tasks: ['admin'],
      manage_repairs: ['admin', 'staff'],
      manage_notices: ['admin'],
      manage_suppliers: ['admin', 'staff'],
      manage_users: ['admin'],
      view_all_tasks: ['admin'],
      view_repairs: ['admin', 'staff'],
    };

    return permissions[permission]?.includes(user?.role) || false;
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    isAdmin,
    isStaff,
    isCustomer,
    hasPermission,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
