import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { DatabaseService } from '../lib/database';
import { DashboardStats, Product } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import { router } from 'expo-router';
import { TrendingUp, Package, Receipt, TriangleAlert as AlertTriangle, Users, Calendar } from 'lucide-react-native';
import { mqttService } from '../lib/mqtt'; // Import MQTT service

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mqttConnected, setMqttConnected] = useState(false);

  useEffect(() => {
    setError(null);

    // Connect ke MQTT broker
    mqttService.connect().then((connected) => {
      setMqttConnected(connected);
    });

    // Listener untuk update koneksi MQTT
    const checkInterval = setInterval(() => {
      setMqttConnected((mqttService as any).isConnected);
    }, 1000);

    // Real-time listener untuk Dashboard Stats
    const unsubscribeStats = DatabaseService.subscribeDashboardStats((data: DashboardStats) => {
      if (data) {
        setStats(data);
        setLoading(false);
      // } else {
        setError('Failed to load data.');
      }
    });

    // Real-time listener untuk Produk
    const unsubscribeProducts = DatabaseService.listenToProductsRealtime(
      (data: Product[]) => {
        setProducts(data);
      },
      (error) => {
        setError('Failed to load products');
        console.error(error);
      }
    );

    return () => {
      unsubscribeStats();
      unsubscribeProducts();
      clearInterval(checkInterval);
      mqttService.disconnect();
    };
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => setError(null)} />;

  const StatCard = ({ title, value, icon, color, backgroundColor }: any) => (
    <View style={[styles.statCard, { backgroundColor }]}>
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>{icon}</View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Admin</Text>
        <Text style={styles.subtitle}>Modern Cashier System</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Penjualan"
          value={`Rp ${stats?.totalSales?.toLocaleString('id-ID') || '0'}`}
          icon={<TrendingUp size={24} color="#fff" />}
          color="#10B981"
          backgroundColor="#D1FAE5"
        />
        <StatCard
          title="Total Transaksi"
          value={stats?.totalTransactions || 0}
          icon={<Receipt size={24} color="#fff" />}
          color="#2563EB"
          backgroundColor="#DBEAFE"
        />
        <StatCard
          title="Total Produk"
          value={products.length || 0}
          icon={<Package size={24} color="#fff" />}
          color="#7C3AED"
          backgroundColor="#EDE9FE"
        />
        <StatCard
          title="Stok Menipis"
          value={stats?.lowStockProducts || 0}
          icon={<AlertTriangle size={24} color="#fff" />}
          color="#EF4444"
          backgroundColor="#FEE2E2"
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/products')}>
            <Package size={32} color="#2563EB" />
            <Text style={styles.actionTitle}>Kelola Produk</Text>
            <Text style={styles.actionSubtitle}>Tambah, edit, hapus produk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/transactions')}>
            <Receipt size={32} color="#10B981" />
            <Text style={styles.actionTitle}>Lihat Transaksi</Text>
            <Text style={styles.actionSubtitle}>Riwayat semua transaksi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/users')}>
            <Users size={32} color="#F59E0B" />
            <Text style={styles.actionTitle}>Kelola Kasir</Text>
            <Text style={styles.actionSubtitle}>Manajemen user kasir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/reports')}>
            <Calendar size={32} color="#7C3AED" />
            <Text style={styles.actionTitle}>Laporan</Text>
            <Text style={styles.actionSubtitle}>Export data & laporan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.systemStatus}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusText}>Firebase Database</Text>
            <Text style={styles.statusValue}>Connected</Text>
          </View>
          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: mqttConnected ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text style={styles.statusText}>MQTT Broker</Text>
            <Text style={styles.statusValue}>{mqttConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.statusText}>Thermal Printer</Text>
            <Text style={styles.statusValue}>Standby</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.statusText}>Barcode Scanner</Text>
            <Text style={styles.statusValue}>Ready</Text>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 16,
  },
  statCard: {
    width: (width - 64) / 2,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickActions: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
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
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  systemStatus: {
    padding: 24,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});