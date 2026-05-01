import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

/**
 * Reusable Card Component
 * Styled container with shadow for displaying content
 */
export const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

/**
 * Stat Card for Dashboard
 */
export const StatCard = ({ title, value, icon, color }) => {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIcon}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );
};

/**
 * Status Badge Component
 */
export const StatusBadge = ({ status, type = 'default' }) => {
  const getStatusColor = () => {
    const colors = {
      success: theme.colors.success,
      danger: theme.colors.danger,
      warning: theme.colors.warning,
      info: theme.colors.info,
      default: theme.colors.secondary,
    };
    return colors[type] || colors.default;
  };

  return (
    <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.badgeText}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statIconText: {
    fontSize: 20,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default Card;
