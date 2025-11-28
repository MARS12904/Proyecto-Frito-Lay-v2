import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ResponsiveCard } from '../../components/ResponsiveLayout';
import ProductImage from '../../components/ProductImage';
import { BorderRadius, Colors, Dimensions, FontSizes, Shadows, Spacing } from '../../constants/theme';
import { useCart } from '../../contexts/CartContext';
import { useStock } from '../../contexts/StockContext';
import { getProductsByCategory, Product, productCategories, products, searchProducts } from '../../data/products';

export default function CatalogScreen() {
  return <CatalogContent />;
}

function CatalogContent() {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  
  const { addToCart, isInCart, isWholesaleMode, updateQuantity } = useCart();
  const { getProductStock, isProductAvailable, reduceStock } = useStock();

  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== 'Todos') {
      const categoryData = productCategories.find(cat => cat.name === selectedCategory);
      if (categoryData) {
        filtered = getProductsByCategory(categoryData.id);
      }
    }

    if (searchQuery) {
      filtered = searchProducts(searchQuery);
    }

    setFilteredProducts(filtered);
  }, [selectedCategory, searchQuery]);

  const handleAddToCart = async (product: Product) => {
    if (!product.isAvailable) {
      Alert.alert('Error', 'Producto no disponible');
      return;
    }

    if (isWholesaleMode) {
      setSelectedProduct(product);
      setQuantity(product.minOrderQuantity || 12);
      setShowQuantityModal(true);
    } else {
      const desiredQty = 1;
      if (!isProductAvailable(product.id, desiredQty)) {
        Alert.alert('Stock insuficiente', 'No hay stock suficiente para agregar este producto.');
        return;
      }
      // Ya no reducimos el stock aquí, solo se reduce al procesar el pago
      addToCart(product, desiredQty);
      Alert.alert('Éxito', `${product.name} agregado al carrito`);
    }
  };

  const handleConfirmAddToCart = async () => {
    if (selectedProduct) {
      if (!isProductAvailable(selectedProduct.id, quantity)) {
        Alert.alert('Stock insuficiente', 'No hay stock suficiente para la cantidad seleccionada.');
        return;
      }
      // Ya no reducimos el stock aquí, solo se reduce al procesar el pago
      addToCart(selectedProduct, quantity);
      Alert.alert('Éxito', `${selectedProduct.name} agregado al carrito (${quantity} unidades)`);
      setShowQuantityModal(false);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (selectedProduct) {
      // Validar mínimo de 12 productos
      const minQty = selectedProduct.minOrderQuantity || 12;
      const finalQuantity = Math.max(minQty, newQuantity);
      setQuantity(finalQuantity);
    }
  };

  const handleQuantityTextChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1) {
      setQuantity(num);
    } else if (text === '') {
      // Al borrar, mostrar vacío temporalmente, se validará al confirmar
      setQuantity(selectedProduct?.minOrderQuantity || 12);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const currentPrice = isWholesaleMode ? item.wholesalePrice : item.price;
    const savings = item.price - item.wholesalePrice;
    const isInCartItem = isInCart(item.id);

    return (
      <ResponsiveCard style={styles.productCard} padding="md">
        <View style={styles.productImageContainer}>
          <ProductImage 
            source={{ uri: item.image }} 
            style={styles.productImage}
            fallbackIcon="bag-outline"
            fallbackColor={Colors.light.primary}
          />
          {getProductStock(item.id) === 0 && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Agotado</Text>
            </View>
          )}
          {!item.isAvailable && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>No disponible</Text>
            </View>
          )}
          {isWholesaleMode && savings > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>-S/ {savings.toFixed(2)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productBrand}>{item.brand}</Text>
            <Text style={styles.productWeight}>{item.weight}</Text>
          </View>
          
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDescription}>{item.description}</Text>
          
          <View style={styles.productTags}>
            {item.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={styles.productFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>S/ {currentPrice.toFixed(2)}</Text>
              {isWholesaleMode && savings > 0 && (
                <Text style={styles.originalPrice}>S/ {item.price.toFixed(2)}</Text>
              )}
            </View>
            <Text style={styles.productStock}>
              Stock: {getProductStock(item.id)}
            </Text>
          </View>


          <TouchableOpacity
            style={[
              styles.addButton,
              (!item.isAvailable || isInCartItem || getProductStock(item.id) === 0) && styles.addButtonDisabled
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={!item.isAvailable || isInCartItem || getProductStock(item.id) === 0}
          >
            <Ionicons 
              name={isInCartItem ? "checkmark" : "add"} 
              size={20} 
              color={Colors.light.background} 
            />
            <Text style={styles.addButtonText}>
              {isInCartItem ? 'En carrito' : 'Agregar'}
            </Text>
          </TouchableOpacity>
        </View>
      </ResponsiveCard>
    );
  };

  const renderCategory = ({ item }: { item: typeof productCategories[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.name && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(item.name)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        selectedCategory === item.name && styles.categoryTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo Frito-Lay</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            placeholderTextColor={Colors.light.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          data={[{ id: 'all', name: 'Todos', icon: '🍿' }, ...productCategories]}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={Dimensions.isSmallScreen ? 1 : 2}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={Dimensions.isSmallScreen ? undefined : styles.row}
      />

      {/* Modal para seleccionar cantidad */}
      <Modal
        visible={showQuantityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Cantidad</Text>
            <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
            <Text style={styles.modalPrice}>
              S/ {(selectedProduct?.wholesalePrice || 0).toFixed(2)} por unidad
            </Text>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= (selectedProduct?.minOrderQuantity || 12)}
              >
                <Ionicons name="remove" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.quantityInput}
                value={String(quantity)}
                onChangeText={handleQuantityTextChange}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(quantity + 1)}
              >
                <Ionicons name="add" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.minOrderHint}>
              Mínimo: {selectedProduct?.minOrderQuantity || 12} unidades
            </Text>

            <Text style={styles.totalText}>
              Total: S/ {((selectedProduct?.wholesalePrice || 0) * quantity).toFixed(2)}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuantityModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAddToCart}
              >
                <Text style={styles.confirmButtonText}>Agregar al Carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    backgroundColor: Colors.light.backgroundCard,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    ...Shadows.sm,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: FontSizes.md,
    color: Colors.light.text,
  },
  categoriesContainer: {
    backgroundColor: Colors.light.backgroundCard,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoriesList: {
    paddingHorizontal: Spacing.lg,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryIcon: {
    fontSize: FontSizes.md,
    marginRight: Spacing.xs,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: Colors.light.background,
  },
  productsList: {
    padding: Dimensions.isSmallScreen ? Spacing.md : Spacing.lg,
  },
  row: {
    justifyContent: 'space-around',
  },
  productCard: {
    flex: 1,
    margin: Spacing.xs,
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: '100%',
    height: Dimensions.isSmallScreen ? 100 : 120,
    borderRadius: BorderRadius.md,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableText: {
    color: Colors.light.background,
    fontWeight: 'bold',
    fontSize: FontSizes.sm,
  },
  savingsBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.light.success,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    color: Colors.light.background,
    fontSize: FontSizes.xs,
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  productBrand: {
    fontSize: FontSizes.xs,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  productWeight: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
  },
  productName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  productDescription: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
  productTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tagText: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.success,
  },
  originalPrice: {
    fontSize: FontSizes.sm,
    color: Colors.light.textLight,
    textDecorationLine: 'line-through',
    marginLeft: Spacing.xs,
  },
  productStock: {
    fontSize: FontSizes.xs,
    color: Colors.light.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  addButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  addButtonText: {
    color: Colors.light.background,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '80%',
    maxWidth: 400,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalProductName: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalPrice: {
    fontSize: FontSizes.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  quantityText: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginHorizontal: Spacing.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginHorizontal: Spacing.md,
    minWidth: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  minOrderHint: {
    fontSize: FontSizes.sm,
    color: Colors.light.warning,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  totalText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.light.success,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
});
