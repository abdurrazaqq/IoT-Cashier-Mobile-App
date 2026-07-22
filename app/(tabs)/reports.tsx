import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Dimensions 
} from 'react-native';
import { DatabaseService } from '../../lib/database';
import { ExportService } from '../../lib/export';
import { Transaction, Product, DashboardStats } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FileText, Download, TrendingUp, Calendar, ChartBar as BarChart3, ChartPie as PieChart } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [transactionList, productList, dashboardStats, salesData] = await Promise.all([
        DatabaseService.getTransactions(),
        DatabaseService.getProducts(),
        DatabaseService.getDashboardStats(),
        DatabaseService.getSalesData() // Memanggil getSalesData yang sudah diperbarui
      ]);
      
      setTransactions(transactionList);
      setProducts(productList);
      setStats(dashboardStats);
      setSalesData(salesData); // Menyimpan data penjualan
    } catch (error) {
      console.error('Error loading report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTransactionsPDF = async () => {
    try {
      await ExportService.exportTransactionsToPDF(transactions);
      Alert.alert('Success', 'Transaction report exported as PDF');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export PDF report');
    }
  };

  const handleExportTransactionsExcel = async () => {
    try {
      await ExportService.exportTransactionsToExcel(transactions);
      Alert.alert('Success', 'Transaction report exported as Excel');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Alert.alert('Error', 'Failed to export Excel report');
    }
  };

  const handleExportProductsExcel = async () => {
    try {
      await ExportService.exportProductsToExcel(products);
      Alert.alert('Success', 'Product data exported as Excel');
    } catch (error) {
      console.error('Error exporting products:', error);
      Alert.alert('Error', 'Failed to export product data');
    }
  };

  const getTopProducts = () => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    transactions.forEach(transaction => {
      transaction.items.forEach(item => {
        if (productSales[item.productId]) {
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.subtotal;
        } else {
          productSales[item.productId] = {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal
          };
        }
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getPaymentMethodStats = () => {
    const stats: { [key: string]: { count: number; total: number } } = {};
    
    transactions.forEach(transaction => {
      const method = transaction.paymentMethod;
      if (stats[method]) {
        stats[method].count += 1;
        stats[method].total += transaction.total;
      } else {
        stats[method] = {
          count: 1,
          total: transaction.total
        };
      }
    });

    return Object.entries(stats).map(([method, data]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count: data.count,
      total: data.total,
      percentage: (data.count / transactions.length * 100).toFixed(1)
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  const topProducts = getTopProducts();
  const paymentStats = getPaymentMethodStats();

  const totalSales = stats?.totalSales || 0;
  const totalTransactions = stats?.totalTransactions || 0;
  const totalProducts = stats?.totalProducts || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>Business insights and data exports</Text>
      </View>

      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        
        <View style={styles.exportGrid}>
          <TouchableOpacity style={styles.exportCard} onPress={handleExportTransactionsPDF}>
            <FileText size={32} color="#EF4444" />
            <Text style={styles.exportTitle}>Transactions PDF</Text>
            <Text style={styles.exportSubtitle}>Complete transaction report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportCard} onPress={handleExportTransactionsExcel}>
            <BarChart3 size={32} color="#10B981" />
            <Text style={styles.exportTitle}>Transactions Excel</Text>
            <Text style={styles.exportSubtitle}>Detailed transaction data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportCard} onPress={handleExportProductsExcel}>
            <Download size={32} color="#2563EB" />
            <Text style={styles.exportTitle}>Products Excel</Text>
            <Text style={styles.exportSubtitle}>Product inventory data</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.analyticsSection}>
        <Text style={styles.sectionTitle}>Sales Overview (Last 7 Days)</Text>
        
        <View style={styles.chartContainer}>
          {salesData.length > 0 ? (
            salesData.map((day, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={[styles.bar, { height: Math.max(20, (day.total / Math.max(...salesData.map(d => d.total))) * 100), backgroundColor: '#10B981' }]} />
                <Text style={styles.barLabel}>{day.date}</Text>
                <Text style={styles.barValue}>Rp {day.total.toLocaleString('id-ID', { notation: 'compact', maximumFractionDigits: 0 })}</Text>
              </View>
            ))
          ) : (
            <Text>No sales data available</Text>
          )}
        </View>
      </View>

      <View style={styles.analyticsSection}>
        <Text style={styles.sectionTitle}>Top Selling Products</Text>
        
        <View style={styles.topProductsList}>
          {topProducts.map((product, index) => (
            <View key={index} style={styles.topProductItem}>
              <View style={styles.productRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productStats}>{product.quantity} sold • Rp {product.revenue.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.productProgress}>
                <View style={[styles.progressBar, { width: `${(product.revenue / Math.max(...topProducts.map(p => p.revenue))) * 100}%`, backgroundColor: '#10B981' }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.analyticsSection}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        
        <View style={styles.paymentMethodsList}>
          {paymentStats.map((stat, index) => (
            <View key={index} style={styles.paymentMethodItem}>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{stat.method}</Text>
                <Text style={styles.paymentMethodStats}>{stat.count} transactions ({stat.percentage}%)</Text>
              </View>
              <Text style={styles.paymentMethodTotal}>Rp {stat.total.toLocaleString('id-ID')}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Summary Statistics</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <TrendingUp size={24} color="#10B981" />
            <Text style={styles.summaryValue}>Rp {totalSales.toLocaleString('id-ID')}</Text>
            <Text style={styles.summaryLabel}>Total Sales</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <Calendar size={24} color="#2563EB" />
            <Text style={styles.summaryValue}>{totalTransactions}</Text>
            <Text style={styles.summaryLabel}>Transactions</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <PieChart size={24} color="#7C3AED" />
            <Text style={styles.summaryValue}>{totalProducts}</Text>
            <Text style={styles.summaryLabel}>Products</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <BarChart3 size={24} color="#F59E0B" />
            <Text style={styles.summaryValue}>Rp {totalTransactions > 0 ? (totalSales / totalTransactions).toFixed(0) : '0'}</Text>
            <Text style={styles.summaryLabel}>Avg Transaction</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  exportSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  exportCard: {
    width: (width - 64) / 2,
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
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
  },
  exportSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  analyticsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  chartContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: '#10B981',
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  barValue: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  topProductsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  productStats: {
    fontSize: 12,
    color: '#64748B',
  },
  productProgress: {
    width: 60,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  paymentMethodsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  paymentMethodStats: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentMethodTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  summarySection: {
    padding: 24,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    width: (width - 64) / 2,
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
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
