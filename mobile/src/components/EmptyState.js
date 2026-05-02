import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

/**
 * Empty State Component
 * Displays when list has no data
 * 
 * @param {Object} props
 * @param {string} props.icon - Emoji icon to display
 * @param {string} props.title - Title message
 * @param {string} props.subtitle - Subtitle message
 * @param {Object} props.style - Additional custom styles
 */
const EmptyState = ({ 
  icon = '📭', 
  title = 'No data available', 
  subtitle = 'Try adjusting your filters or search terms',
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
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
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});

export default EmptyState;
