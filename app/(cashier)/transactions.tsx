import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { DatabaseService } from '../../lib/database';
import { ExportService } from '../../lib/export';
import { AuthService } from '../../lib/auth';
import { Transaction } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  Receipt, 
  Download, 
  Calendar,
  DollarSign,
  User
} from 'lucide-react-native';

export default function CashierTransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null); // Fix type here

  useEffect(() => {
    initializeScreen();
    return () => {
      // Unsubscribe on component unmount
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]); // Add unsubscribe to the dependency array

  // Initialize the screen, including setting up real-time listener
  const initializeScreen = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUserId(user?.id || null);
      loadTransactions(user?.id);
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  // Load transactions from the database with a given cashierId
  const loadTransactions = async (cashierId?: string) => {
    try {
      setLoading(true);
      // Subscribe to real-time updates for transactions related to the current cashier
      const unsubscribeTransactions = DatabaseService.listenToTransactionsRealtime(
        (transactionList: Transaction[]) => {
          setTransactions(transactionList); // Update the state when new data comes in
        },
        cashierId
      );
      setUnsubscribe(() => unsubscribeTransactions); // Update unsubscribe function
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh the list of transactions
  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions(currentUserId || undefined);
  };

  // Handle exporting transactions to PDF
  const handleExportTransactions = async () => {
    try {
      await ExportService.exportTransactionsToPDF(transactions);
      Alert.alert('Success', 'Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      Alert.alert('Error', 'Failed to export transactions');
    }
  };

  // Format date to Indonesian date format

  const formatDate = (date: any) => {
    // Jika date adalah objek Firestore Timestamp, ubah menjadi objek Date
    const validDate = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);

    // Pastikan validDate adalah objek Date yang valid
    if (isNaN(validDate.getTime())) {
      return 'Invalid Date'; // Jika tanggal tidak valid
    }

    return validDate.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',  // Bulan lengkap (misalnya Januari, Februari)
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  // Get color based on payment method
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return '#10B981';
      case 'card':
        return '#2563EB';
      case 'digital':
        return '#7C3AED';
      default:
        return '#64748B';
    }
  };

  // Calculate the total amount of transactions
  const getTotalAmount = () => {
    return transactions.reduce((sum, transaction) => sum + transaction.total, 0);
  };

  if (loading) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Riwayat Transaksi Saya</Text>
          <Text style={styles.subtitle}>
            {transactions.length} transaksi • Total: Rp {getTotalAmount().toLocaleString('id-ID')}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton} 
          onPress={handleExportTransactions}
        >
          <Download size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Receipt size={24} color="#2563EB" />
          <Text style={styles.summaryValue}>{transactions.length}</Text>
          <Text style={styles.summaryLabel}>Total Transaksi</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <DollarSign size={24} color="#10B981" />
          <Text style={styles.summaryValue}>
            Rp {getTotalAmount().toLocaleString('id-ID')}
          </Text>
          <Text style={styles.summaryLabel}>Total Penjualan</Text>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView 
        style={styles.transactionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {transactions.map(transaction => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionId}>#{transaction.id.slice(-8)}</Text>
                <View style={styles.transactionMeta}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.transactionAmount}>
                <Text style={styles.totalAmount}>
                  Rp {transaction.total.toLocaleString('id-ID')}
                </Text>
                <View style={[styles.paymentMethodBadge, { backgroundColor: getPaymentMethodColor(transaction.paymentMethod) }]}>
                  <Text style={styles.paymentMethodText}>
                    {transaction.paymentMethod.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.transactionItems}>
              {transaction.items.map((item, index) => (
                <View key={index} style={styles.transactionItem}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity}x @ Rp {item.price.toLocaleString('id-ID')}
                  </Text>
                </View>
              ))}
            </View>
            
            {transaction.receiptPrinted && (
              <View style={styles.receiptStatus}>
                <Text style={styles.receiptStatusText}>✓ Receipt Printed</Text>
              </View>
            )}
          </View>
        ))}
        
        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <Receipt size={64} color="#94A3B8" />
            <Text style={styles.emptyStateText}>Belum ada transaksi</Text>
            <Text style={styles.emptyStateSubtext}>Transaksi Anda akan muncul di sini</Text>
          </View>
        )}
      </ScrollView>
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
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  exportButton: {
    backgroundColor: '#10B981',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  paymentMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionItems: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  itemDetails: {
    fontSize: 12,
    color: '#64748B',
  },
  receiptStatus: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  receiptStatusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
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
});