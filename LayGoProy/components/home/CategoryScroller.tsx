import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, FontSizes, Spacing } from '@/constants/theme';
import { productCategories } from '@/data/products';
import { useAppColors } from '@/contexts/ThemeContext';

interface CategoryScrollerProps {
  onCategoryPress: (categoryId: string) => void;
}

export default function CategoryScroller({ onCategoryPress }: CategoryScrollerProps) {
  const colors = useAppColors();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorías</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {productCategories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => onCategoryPress(cat.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{cat.icon}</Text>
            <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
              {cat.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    minWidth: 72,
  },
  emoji: { fontSize: 28, marginBottom: 4 },
  label: { fontSize: FontSizes.xs, fontWeight: '600' },
});
