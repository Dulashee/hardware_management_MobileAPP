import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

/**
 * Search Bar Component with Debounce
 * Automatically delays search to reduce API calls
 * 
 * @param {Object} props
 * @param {Function} props.onSearch - Callback with search term
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.debounce - Debounce delay in ms (default: 500)
 * @param {Object} props.style - Additional custom styles
 */
const SearchBar = ({ 
  onSearch, 
  placeholder = 'Search...', 
  debounce = 500,
  style 
}) => {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchText);
    }, debounce);

    return () => clearTimeout(timer);
  }, [searchText, debounce, onSearch]);

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        value={searchText}
        onChangeText={setSearchText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textLight}
        clearButtonMode="while-editing"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2A2A2A',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  input: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    padding: 0,
  },
});

export default SearchBar;
