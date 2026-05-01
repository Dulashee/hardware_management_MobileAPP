import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

/**
 * Error Message Component
 * Displays error message with optional retry button
 * 
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {Function} props.onRetry - Callback function for retry button
 * @param {Object} props.style - Additional custom styles
 */
const ErrorMessage = ({ message = 'Something went wrong', onRetry, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});

export default ErrorMessage;
