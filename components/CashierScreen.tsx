import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Dimensions, Modal
} from 'react-native';
import { DatabaseService } from '../lib/database';
import { mqttService } from '../lib/mqtt';
import { AuthService } from '../lib/auth';
import { Product, CartItem, Transaction, ReceiptData } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BarcodeScannerScreen from './BarcodeScannerScreen';
import { 
  ShoppingCart, ScanLine, Plus, Minus, Trash2, CreditCard, DollarSign, Smartphone, X, Receipt, Package2, ShoppingBag, Search 
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;

export default function CashierScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCurrentUser();
    initializeMQTT();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productList = await DatabaseService.getProducts();
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const initializeMQTT = async () => {
    await mqttService.connect();
  };

  const handleBarcodeScanned = async (barcode: string, product?: Product) => {
    try {
      if (product) {
        addToCart(product);
        setShowBarcodeScanner(false);
        Alert.alert('Produk Ditambahkan', `${product.name} berhasil ditambahkan ke keranjang`);
      }
    } catch (error) {
      console.error('Error handling barcode:', error);
      Alert.alert('Error', 'Failed to process barcode');
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is out of stock');
      return;
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          Alert.alert('Stock Limit', 'Cannot add more items than available stock');
          return prevItems;
        }
        return prevItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { product, quantity: 1 }];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      Alert.alert('Stock Limit', 'Cannot add more items than available stock');
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const getTotalAmount = () => cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      setProcessingPayment(true);
      if (!currentUser) {
        Alert.alert('Error', 'User information not found');
        return;
      }

      const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        items: cartItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        })),
        total: getTotalAmount(),
        paymentMethod,
        receiptPrinted: true,
      };

      const transactionId = await DatabaseService.addTransaction(transaction);

      const receiptData: ReceiptData = {
        transactionId,
        cashierName: currentUser.name,
        items: transaction.items,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        timestamp: Date.now(), // <-- HARUS number, bukan string
        storeName: 'Modern Cashier System',
        storeAddress: 'Jl.ZA PAGAR ALAM, BANDAR LAMPUNG, LAMPUNG',
      };

      try {
        mqttService.printReceipt(receiptData);
        Alert.alert(
          'Transaksi Berhasil!',
          `Pembayaran sebesar Rp ${transaction.total.toLocaleString('id-ID')} berhasil diproses.\n\nStruk sedang dicetak...`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCartItems([]);
                setShowPaymentModal(false);
                setShowCart(false);
              }
            }
          ]
        );
      } catch (printErr) {
        console.error('Gagal mencetak struk:', printErr);
        Alert.alert('Warning', 'Transaksi berhasil tetapi gagal mencetak struk');
        setCartItems([]);
        setShowPaymentModal(false);
        setShowCart(false);
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.includes(searchQuery)
  );

  if (loading) return <LoadingSpinner message="Loading products..." />;

  if (showBarcodeScanner) {
    return (
      <BarcodeScannerScreen
        mode="transaction"
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />
    );
  }

  const CartContent = () => (
    <View style={styles.cartContainer}>
      <View style={styles.cartHeader}>
        <View style={styles.cartHeaderLeft}>
          <ShoppingCart size={20} color="#10B981" />
          <Text style={styles.cartTitle}>Cart</Text>
        </View>
        {cartItems.length > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
          </View>
        )}
        {!isTablet && (
          <TouchableOpacity onPress={() => setShowCart(false)} style={styles.closeCartButton}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
        {cartItems.length > 0 ? cartItems.map(item => (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.cartItemPrice}>
                Rp {item.product.price.toLocaleString('id-ID')}
              </Text>
            </View>
            
            <View style={styles.cartItemRight}>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                >
                  <Minus size={12} color="#64748B" />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{item.quantity}</Text>
                
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.product.id)}
              >
                <Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCart}>
            <ShoppingCart size={40} color="#94A3B8" />
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>Add products to get started</Text>
          </View>
        )}
      </ScrollView>
      
      {cartItems.length > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              Rp {getTotalAmount().toLocaleString('id-ID')}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              processingPayment && styles.checkoutButtonDisabled
            ]}
            onPress={handleCheckout}
            disabled={processingPayment}
          >
            <Receipt size={16} color="#FFFFFF" />
            <Text style={styles.checkoutButtonText}>
              {processingPayment ? 'Processing...' : 'Checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <ShoppingBag size={isTablet ? 24 : 20} color="#10B981" />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>POS System</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentUser?.name || 'Cashier'}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {!isTablet && (
            <TouchableOpacity 
              style={styles.cartIconButton}
              onPress={() => setShowCart(true)}
            >
              <ShoppingCart size={20} color="#64748B" />
              {cartItems.length > 0 && (
                <View style={styles.cartIconBadge}>
                  <Text style={styles.cartIconBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => setShowBarcodeScanner(true)}
          >
            <ScanLine size={16} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Products List */}
        <View style={[styles.productsSection, !isTablet && { paddingBottom: cartItems.length > 0 ? 80 : 12 }]}>
          <View style={styles.searchContainer}>
            <Search size={16} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
            {filteredProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToCart(product)}
              >
                <View style={styles.productIcon}>
                  <Package2 size={16} color="#2563EB" />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <View style={styles.productMeta}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{product.category}</Text>
                    </View>
                    <Text style={styles.productStock}>Stock: {product.stock}</Text>
                  </View>
                  <Text style={styles.productPrice}>
                    Rp {product.price.toLocaleString('id-ID')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(product)}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            
            {filteredProducts.length === 0 && (
              <View style={styles.emptyProducts}>
                <Package2 size={40} color="#94A3B8" />
                <Text style={styles.emptyProductsText}>No products found</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Cart - Desktop/Tablet only */}
        {isTablet && (
          <View style={styles.cartSection}>
            <CartContent />
          </View>
        )}
      </View>

      {/* Mobile Cart Modal */}
      {!isTablet && (
        <Modal
          visible={showCart}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCart(false)}
        >
          <View style={styles.cartModalOverlay}>
            <View style={styles.cartModalContent}>
              <CartContent />
            </View>
          </View>
        </Modal>
      )}

      {/* Mobile Cart Button */}
      {!isTablet && cartItems.length > 0 && !showCart && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity 
            style={styles.floatingCartButton}
            onPress={() => setShowCart(true)}
          >
            <ShoppingCart size={18} color="#FFFFFF" />
            <Text style={styles.floatingCartText}>
              Cart ({cartItems.length}) • Rp {getTotalAmount().toLocaleString('id-ID')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Method</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'cash' && styles.paymentMethodSelected
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <DollarSign size={20} color={paymentMethod === 'cash' ? '#FFFFFF' : '#64748B'} />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === 'cash' && styles.paymentMethodTextSelected
                ]}>
                  Cash
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'card' && styles.paymentMethodSelected
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <CreditCard size={20} color={paymentMethod === 'card' ? '#FFFFFF' : '#64748B'} />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === 'card' && styles.paymentMethodTextSelected
                ]}>
                  Card
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'digital' && styles.paymentMethodSelected
                ]}
                onPress={() => setPaymentMethod('digital')}
              >
                <Smartphone size={20} color={paymentMethod === 'digital' ? '#FFFFFF' : '#64748B'} />
                <Text style={[
                  styles.paymentMethodText,
                  paymentMethod === 'digital' && styles.paymentMethodTextSelected
                ]}>
                  Digital
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryText}>
                Total: Rp {getTotalAmount().toLocaleString('id-ID')}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.payButton}
              onPress={processPayment}
              disabled={processingPayment}
            >
              <Text style={styles.payButtonText}>
                {processingPayment ? 'Processing...' : 'Pay & Print Receipt'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTablet ? 20 : 16,
    paddingTop: isTablet ? 60 : 50,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: isTablet ? 40 : 32,
    height: isTablet ? 40 : 32,
    borderRadius: isTablet ? 20 : 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: isTablet ? 14 : 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartIconButton: {
    position: 'relative',
    padding: 8,
  },
  cartIconBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIconBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
  },
  productsSection: {
    flex: 1,
    padding: 12,
  },
  productsSectionMobile: {
    paddingBottom: 80,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
    color: '#1E293B',
  },
  productsList: {
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  productIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 9,
    color: '#7C3AED',
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  productStock: {
    fontSize: 10,
    color: '#64748B',
  },
  addButton: {
    backgroundColor: '#10B981',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '600',
  },
  cartSection: {
    width: width * 0.35,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  cartContainer: {
    flex: 1,
  },
  cartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cartModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.8,
    minHeight: height * 0.5,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
  },
  cartBadge: {
    backgroundColor: '#10B981',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  closeCartButton: {
    padding: 4,
  },
  cartItems: {
    flex: 1,
    padding: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#64748B',
  },
  cartItemRight: {
    alignItems: 'center',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 2,
  },
  quantityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  removeButton: {
    padding: 4,
  },
  emptyCart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyCartSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  cartFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  floatingCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCartText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxWidth: 350,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  paymentMethods: {
    gap: 10,
    marginBottom: 20,
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentMethodSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 10,
  },
  paymentMethodTextSelected: {
    color: '#FFFFFF',
  },
  paymentSummary: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
