import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProductImage from '@/components/ProductImage';
import { BorderRadius, FontSizes, Shadows, Spacing } from '@/constants/theme';
import { useAppColors } from '@/contexts/ThemeContext';
import { Product } from '@/data/products';
import { useCart } from '@/contexts/CartContext';

interface ProductHorizontalListProps {
  title: string;
  subtitle?: string;
  products: Product[];
  onSeeAll?: () => void;
  onProductPress?: (product: Product) => void;
}

export default function ProductHorizontalList({
  title,
  subtitle,
  products,
  onSeeAll,
  onProductPress,
}: ProductHorizontalListProps) {
  const colors = useAppColors();
  const { isWholesaleMode } = useCart();

  if (products.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todo</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {products.map((product) => {
          const price = isWholesaleMode ? product.wholesalePrice : product.price;
          return (
            <TouchableOpacity
              key={product.id}
              style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }, Shadows.sm]}
              onPress={() => onProductPress?.(product)}
              activeOpacity={0.85}
            >
              {product.promotion && (
                <View style={[styles.promoBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.promoText}>{product.promotion.description}</Text>
                </View>
              )}
              <ProductImage source={{ uri: product.image }} style={styles.image} />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>S/ {price.toFixed(2)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: FontSizes.lg, fontWeight: '700' },
  subtitle: { fontSize: FontSizes.sm, marginTop: 2 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: FontSizes.sm, fontWeight: '600' },
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    width: 140,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  promoBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    zIndex: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  promoText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  image: { width: '100%', height: 90, borderRadius: BorderRadius.md, marginBottom: Spacing.xs },
  name: { fontSize: FontSizes.sm, fontWeight: '600', lineHeight: 18 },
  brand: { fontSize: FontSizes.xs, marginTop: 2 },
  price: { fontSize: FontSizes.md, fontWeight: '700', marginTop: 4 },
});
