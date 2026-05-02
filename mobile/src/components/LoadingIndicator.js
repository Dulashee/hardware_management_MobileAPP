import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

/**
 * Loading Indicator Component
 * Displays a spinner with optional loading text
 * 
 * @param {Object} props
 * @param {string} props.text - Loading message to display
 * @param {Object} props.style - Additional custom styles
 */
const LoadingIndicator = ({ text = 'Loading...', style }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
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
  text: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
  },
});

export default LoadingIndicator;
