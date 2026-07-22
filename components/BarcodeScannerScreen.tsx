import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { X, Scan, Package, CircleCheck as CheckCircle } from 'lucide-react-native';
import { mqttService } from '../lib/mqtt';
import { DatabaseService } from '../lib/database';
import { Product } from '../types';

const { width } = Dimensions.get('window');

interface BarcodeScannerScreenProps {
  mode: 'product' | 'transaction';
  onBarcodeScanned: (barcode: string, product?: Product) => void;
  onClose: () => void;
}

export default function BarcodeScannerScreen({ 
  mode, 
  onBarcodeScanned, 
  onClose 
}: BarcodeScannerScreenProps) {
  const [scanning, setScanning] = useState(true);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeScanner();
    startPulseAnimation();
    
    return () => {
      mqttService.clearActiveBarcodeListener();
      mqttService.removeBarcodeListener('barcode-scanner');
    };
  }, []);

  const initializeScanner = () => {
    mqttService.addBarcodeListener('barcode-scanner', handleBarcodeReceived);
    mqttService.setActiveBarcodeListener('barcode-scanner');
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleBarcodeReceived = async (barcode: string) => {
    if (!scanning || barcode === lastScannedBarcode) return;

    setLastScannedBarcode(barcode);
    setScanning(false);
    
    try {
      if (mode === 'product') {
        onBarcodeScanned(barcode);
      } else {
        const product = await DatabaseService.getProductByBarcode(barcode);
        if (product) {
          setScannedProduct(product);
          setTimeout(() => onBarcodeScanned(barcode, product), 1500);
        } else {
          Alert.alert(
            'Produk Tidak Ditemukan',
            `Barcode ${barcode} tidak ada di database`,
            [
              { text: 'Scan Lagi', onPress: () => resetScanner() },
              { text: 'Tutup', onPress: onClose }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      Alert.alert('Error', 'Gagal memproses barcode, coba lagi.');
      resetScanner();
    }
  };

  const resetScanner = () => {
    setScanning(true);
    setLastScannedBarcode(null);
    setScannedProduct(null);
  };

  const handleManualClose = () => {
    mqttService.clearActiveBarcodeListener();
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'product' ? 'Scan Barcode Produk' : 'Scan Produk untuk Transaksi'}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleManualClose}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Scan Area */}
      <View style={styles.scanArea}>
        {scanning ? (
          <>
            <Animated.View style={[styles.scannerFrame, { transform: [{ scale: pulseAnim }] }]}>
              <Scan size={80} color="#10B981" />
            </Animated.View>
            <Text style={styles.scanInstruction}>Arahkan GM65 ke barcode produk</Text>
            <Text style={styles.scanSubtitle}>Menunggu data dari scanner GM65...</Text>
          </>
        ) : scannedProduct ? (
          <View style={styles.successContainer}>
            <CheckCircle size={80} color="#10B981" />
            <Text style={styles.successTitle}>Produk Ditemukan!</Text>
            <View style={styles.productInfo}>
              <Package size={24} color="#2563EB" />
              <Text style={styles.productName}>{scannedProduct.name}</Text>
              <Text style={styles.productPrice}>
                Rp {scannedProduct.price.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.productStock}>Stok: {scannedProduct.stock}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>Memproses barcode...</Text>
            <Text style={styles.barcodeText}>{lastScannedBarcode}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {scanning && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleManualClose}>
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    position: 'relative',
  },
  scannerFrame: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  scanInstruction: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  scanSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  scannerIndicators: {
    position: 'absolute',
    width: 250,
    height: 250,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#10B981',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#10B981',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#10B981',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#10B981',
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 20,
    marginBottom: 30,
  },
  productInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 250,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 8,
  },
  productStock: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  barcodeText: {
    fontSize: 16,
    color: '#10B981',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  testButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});