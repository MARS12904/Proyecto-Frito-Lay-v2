import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../constants/theme';

interface ProductImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackColor?: string;
  showFallback?: boolean;
}

// Validar si es una URL válida
const isValidUrl = (url: string): boolean => {
  return url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
};

export default function ProductImage({
  source,
  style,
  fallbackIcon = 'image-outline',
  fallbackColor = Colors.light.textLight,
  showFallback = true,
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Verificar si la URL es válida
  const isUriSource = typeof source === 'object' && 'uri' in source;
  const hasValidUri = isUriSource && isValidUrl(source.uri);

  // Reset error state when source changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [isUriSource ? source.uri : source]);

  const handleImageError = () => {
    console.log('Error loading image:', isUriSource ? source.uri : 'local');
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Si no hay URL válida o hay error, mostrar fallback
  if ((isUriSource && !hasValidUri) || (imageError && showFallback)) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons 
          name={fallbackIcon} 
          size={style?.width ? (style.width as number) * 0.4 : 40} 
          color={fallbackColor} 
        />
      </View>
    );
  }

  return (
    <View style={style}>
      {imageLoading && (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator size="small" color={Colors.light.primary} />
        </View>
      )}
      <Image
        source={source}
        style={[styles.image, style, imageLoading && styles.hiddenImage]}
        onError={handleImageError}
        onLoad={handleImageLoad}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: BorderRadius.md,
  },
  hiddenImage: {
    opacity: 0,
    position: 'absolute',
  },
  fallbackContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  loadingContainer: {
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
});
