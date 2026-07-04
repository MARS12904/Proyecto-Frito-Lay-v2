import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, FontSizes, Spacing } from '@/constants/theme';
import { HomePromo } from '@/data/homeContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const CARD_HEIGHT = 160;

interface PromoCarouselProps {
  promos: HomePromo[];
  onPromoPress?: (promo: HomePromo) => void;
}

export default function PromoCarousel({ promos, onPromoPress }: PromoCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + Spacing.md));
    setActiveIndex(index);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {promos.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            activeOpacity={0.9}
            onPress={() => onPromoPress?.(promo)}
          >
            <View style={[styles.card, { backgroundColor: promo.gradient[0] }]}>
              <View style={[styles.cardOverlay, { backgroundColor: promo.gradient[1] }]} />
              {promo.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{promo.badge}</Text>
                </View>
              )}
              <Text style={styles.title}>{promo.title}</Text>
              <Text style={styles.subtitle}>{promo.subtitle}</Text>
              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Ver productos</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {promos.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  scrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '700' },
  title: { color: '#fff', fontSize: FontSizes.xl, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: FontSizes.sm, lineHeight: 20 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: 4 },
  ctaText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.sm, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotActive: { width: 18, backgroundColor: '#E31E24' },
});
