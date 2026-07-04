import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CategoryScroller from '@/components/home/CategoryScroller';
import ProductHorizontalList from '@/components/home/ProductHorizontalList';
import PromoCarousel from '@/components/home/PromoCarousel';
import { BorderRadius, FontSizes, Shadows, Spacing } from '@/constants/theme';
import { homePromos, quickOffers } from '@/data/homeContent';
import { Product, products as localProducts } from '@/data/products';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useAppColors } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { productsService } from '@/services/productsService';
import { formatFirstName } from '@/utils/format';

export default function HomeScreen() {
  const { user } = useAuth();
  const { isWholesaleMode, toggleWholesaleMode } = useCart();
  const colors = useAppColors();
  const { headerPaddingTop } = useResponsive();
  const [products, setProducts] = useState<Product[]>(localProducts);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    const remote = await productsService.getAllProducts();
    if (remote.length >= localProducts.length) {
      setProducts(remote);
    } else {
      setProducts(localProducts);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const newProducts = products.filter((p) => p.tags.includes('nuevo') || p.tags.includes('edicion-limitada')).slice(0, 8);
  const promoProducts = products.filter((p) => p.promotion).slice(0, 8);
  const featuredProducts = promoProducts.length > 0 ? promoProducts : products.slice(0, 8);
  const bestSellers = [...products].sort((a, b) => b.stock - a.stock).slice(0, 8);

  const goCatalog = (categoryId?: string) => {
    router.push(categoryId ? `/(tabs)/catalog?category=${categoryId}` : '/(tabs)/catalog');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); }} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: headerPaddingTop }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>¡Hola, {formatFirstName(user?.name)}!</Text>
            <TouchableOpacity style={styles.locationRow} onPress={() => router.push('/profile/delivery-addresses')}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {user?.deliveryAddresses?.find((a) => a.isDefault)?.address ?? 'Agregar dirección de entrega'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(tabs)/catalog')} activeOpacity={0.9}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>Buscar snacks Frito Lay...</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.wholesaleBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.wholesaleTitle, { color: colors.text }]}>Modo {isWholesaleMode ? 'Mayorista' : 'Minorista'}</Text>
          <Text style={[styles.wholesaleSub, { color: colors.textSecondary }]}>
            {isWholesaleMode ? 'Precios especiales activos' : 'Activa para precios de comerciante'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.wholesaleToggle, { backgroundColor: isWholesaleMode ? colors.primary : colors.border }]} onPress={toggleWholesaleMode}>
          <View style={[styles.wholesaleKnob, isWholesaleMode && styles.wholesaleKnobOn]} />
        </TouchableOpacity>
      </View>

      <PromoCarousel promos={homePromos} onPromoPress={(p) => goCatalog(p.categoryId)} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersRow}>
        {quickOffers.map((o) => (
          <TouchableOpacity key={o.id} style={[styles.offerChip, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => goCatalog()}>
            <Text style={styles.offerEmoji}>{o.icon}</Text>
            <Text style={[styles.offerLabel, { color: colors.text }]}>{o.label}</Text>
            <Text style={[styles.offerDiscount, { color: colors.primary }]}>{o.discount}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <CategoryScroller onCategoryPress={goCatalog} />
      <ProductHorizontalList title="🔥 Ofertas del momento" products={featuredProducts} onSeeAll={() => goCatalog()} onProductPress={() => goCatalog()} />
      <ProductHorizontalList title="✨ Novedades" subtitle="Lo más reciente de Frito Lay Perú" products={newProducts.length ? newProducts : products.slice(0, 6)} onSeeAll={() => goCatalog()} onProductPress={() => goCatalog()} />
      <ProductHorizontalList title="⭐ Más pedidos" products={bestSellers} onSeeAll={() => goCatalog()} onProductPress={() => goCatalog()} />

      <View style={[styles.brandFooter, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.brandFooterTitle, { color: colors.primary }]}>Frito-Lay Perú</Text>
        <Text style={[styles.brandFooterSub, { color: colors.textSecondary }]}>Tu aliado en reabastecimiento</Text>
      </View>
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  greeting: { color: '#fff', fontSize: FontSizes.xl, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, maxWidth: 240 },
  locationText: { color: '#FFD700', fontSize: FontSizes.sm, flex: 1 },
  cartBtn: { padding: Spacing.sm, position: 'relative' },
  cartBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#FFD700', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 10, fontWeight: '800', color: '#E31E24' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, ...Shadows.sm },
  searchPlaceholder: { fontSize: FontSizes.md, flex: 1 },
  wholesaleBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  wholesaleTitle: { fontSize: FontSizes.md, fontWeight: '700' },
  wholesaleSub: { fontSize: FontSizes.xs, marginTop: 2 },
  wholesaleToggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', padding: 3 },
  wholesaleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  wholesaleKnobOn: { alignSelf: 'flex-end' },
  offersRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md },
  offerChip: { alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1, minWidth: 80 },
  offerEmoji: { fontSize: 24 },
  offerLabel: { fontSize: FontSizes.xs, fontWeight: '600', marginTop: 2 },
  offerDiscount: { fontSize: FontSizes.xs, fontWeight: '800' },
  brandFooter: { marginHorizontal: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', ...Shadows.sm },
  brandFooterTitle: { fontSize: FontSizes.lg, fontWeight: '800' },
  brandFooterSub: { fontSize: FontSizes.sm, marginTop: 4 },
});
