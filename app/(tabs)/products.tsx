import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl
} from 'react-native';
import { DatabaseService } from '../../lib/database';
import { ExportService } from '../../lib/export';
import { AuthService } from '../../lib/auth';
import { Product } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import BarcodeScannerScreen from '../../components/BarcodeScannerScreen';
import { Plus, Search, CreditCard as Edit, Trash2, Download, Package, DollarSign, Hash, X } from 'lucide-react-native';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    stock: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    loadProducts();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await AuthService.getUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      price: '',
      stock: '',
      category: '',
      description: '',
    });
    setEditingProduct(null);
  };

  const openAddModal = () => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can add products');
      return;
    }
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can edit products');
      return;
    }
    setFormData({
      name: product.name,
      barcode: product.barcode,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      description: product.description || '',
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can scan barcodes for product input');
      return;
    }
    setFormData(prev => ({ ...prev, barcode }));
    setShowBarcodeScanner(false);
  };
  const handleSaveProduct = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can save products');
      return;
    }

    const { name, barcode, price, stock, category } = formData;
    
    if (!name || !barcode || !price || !stock || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const productData = {
        name,
        barcode,
        price: parseFloat(price),
        stock: parseInt(stock),
        category,
        description: formData.description,
      };

      if (editingProduct) {
        await DatabaseService.updateProduct(editingProduct.id, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        await DatabaseService.addProduct(productData);
        Alert.alert('Success', 'Product added successfully');
      }
      
      setShowAddModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can delete products');
      return;
    }

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully');
              loadProducts();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleExportProducts = async () => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only admin can export products');
      return;
    }

    try {
      await ExportService.exportProductsToExcel(products);
      Alert.alert('Success', 'Products exported successfully');
    } catch (error) {
      console.error('Error exporting products:', error);
      Alert.alert('Error', 'Failed to export products');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode.includes(searchQuery) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner message="Loading products..." />;
  }

  if (showBarcodeScanner) {
    return (
      <BarcodeScannerScreen
        mode="product"
        onBarcodeScanned={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />
    );
  }
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {userRole === 'admin' ? 'Product Management' : 'Product Catalog'}
        </Text>
        <View style={styles.headerActions}>
          {userRole === 'admin' && (
            <>
              <TouchableOpacity 
                style={styles.exportButton} 
                onPress={handleExportProducts}
              >
                <Download size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={openAddModal}
              >
                <Plus size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={userRole === 'admin' ? "Search products, barcode, or category..." : "Search products or category..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Products List */}
      <ScrollView 
        style={styles.productsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProducts.map(product => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCategory}>{product.category}</Text>
              <View style={styles.productDetails}>
                <Text style={styles.productPrice}>
                  Rp {product.price.toLocaleString('id-ID')}
                </Text>
                <Text style={styles.productStock}>Stock: {product.stock}</Text>
              </View>
              {userRole === 'admin' && (
                <Text style={styles.productBarcode}>Barcode: {product.barcode}</Text>
              )}
              {product.description && (
                <Text style={styles.productDescription}>{product.description}</Text>
              )}
            </View>
            
            {userRole === 'admin' && (
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(product)}
                >
                  <Edit size={20} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProduct(product.id, product.name)}
                >
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        
        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={64} color="#94A3B8" />
            <Text style={styles.emptyStateText}>No products found</Text>
            {userRole === 'cashier' && (
              <Text style={styles.emptyStateSubtext}>Contact admin to add products</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Product Modal */}
      {userRole === 'admin' && (
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Product Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter product name"
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Barcode *</Text>
                  <View style={styles.barcodeInputContainer}>
                    <TextInput
                      style={[styles.input, styles.barcodeInput]}
                      placeholder="Enter or scan barcode"
                      value={formData.barcode}
                      onChangeText={(text) => setFormData({...formData, barcode: text})}
                    />
                    <TouchableOpacity
                      style={styles.scanBarcodeButton}
                      onPress={() => setShowBarcodeScanner(true)}
                    >
                      <Text style={styles.scanBarcodeText}>Scan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>Price *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={formData.price}
                      onChangeText={(text) => setFormData({...formData, price: text})}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>Stock *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      value={formData.stock}
                      onChangeText={(text) => setFormData({...formData, stock: text})}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter category"
                    value={formData.category}
                    onChangeText={(text) => setFormData({...formData, category: text})}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter product description"
                    value={formData.description}
                    onChangeText={(text) => setFormData({...formData, description: text})}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#F59E0B',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: '#1E293B',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 16,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  productStock: {
    fontSize: 14,
    color: '#64748B',
  },
  productBarcode: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  scanBarcodeButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBarcodeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});