import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import OrderListScreen from '../screens/OrderListScreen';
import OrderCreateScreen from '../screens/OrderCreateScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import TaskListScreen from '../screens/TaskListScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import TaskCreateScreen from '../screens/TaskCreateScreen';
import RepairListScreen from '../screens/RepairListScreen';
import RepairCreateScreen from '../screens/RepairCreateScreen';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import RepairEditScreen from '../screens/RepairEditScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import SupplierManagementScreen from '../screens/SupplierManagementScreen';
import NoticeManagementScreen from '../screens/NoticeManagementScreen';
import { theme } from '../utils/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main Tab Navigator (Authenticated Users)
 * Conditionally renders tabs based on user role
 */
const MainTabs = () => {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1B2A',
          height: 60,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: theme.fontSize.lg,
          lineHeight: 24,
        },
        headerTitleAlign: 'center',
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceDark,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      {/* Products tab - visible to admin, staff, and customers */}
      <Tab.Screen name="Products" component={ProductListScreen} />
      <Tab.Screen name="Orders" component={OrderListScreen} />
      {/* Tasks tab - visible to admin and staff only */}
      {(isAdmin() || isStaff()) && (
        <Tab.Screen name="Tasks" component={TaskListScreen} />
      )}
      {/* Notices tab - visible to admin only */}
      {isAdmin() && (
        <Tab.Screen name="Notices" component={NoticeManagementScreen} />
      )}
      {(isAdmin() || isStaff()) && (
        <Tab.Screen name="Suppliers" component={SupplierManagementScreen} />
      )}
      {/* Repairs tab - visible to admin and staff only */}
      {(isAdmin() || isStaff()) && (
        <Tab.Screen name="Repairs" component={RepairListScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

/**
 * App Navigator
 * Manages authentication flow and main navigation
 */
const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth">
            {(props) => <AuthStack {...props} />}
          </Stack.Screen>
        )}
        {/* Product Screens */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
        {/* Order Screens */}
        <Stack.Screen name="OrderCreate" component={OrderCreateScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        {/* Task Screens */}
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen name="TaskCreate" component={TaskCreateScreen} />
        {/* Repair Screens */}
        <Stack.Screen name="RepairCreate" component={RepairCreateScreen} />
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} />
        <Stack.Screen name="RepairEdit" component={RepairEditScreen} />
        {/* Admin Screens */}
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/**
 * Authentication Stack
 * Includes Login and Register screens
 */
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
