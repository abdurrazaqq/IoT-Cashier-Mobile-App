import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Switch
} from 'react-native';
import { router } from 'expo-router';
import { AuthService } from '../../lib/auth';
import { mqttService } from '../../lib/mqtt';
import { User } from '../../types';
import { 
  User as UserIcon, 
  LogOut, 
  Wifi,
  Printer,
  Scan,
  Bell,
  Smartphone
} from 'lucide-react-native';

export default function CashierSettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              mqttService.disconnect();
              router.replace('/login');  // Redirect ke halaman login atau home
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Gagal logout. Silakan coba lagi.');
            }
          },
        },
      ]
    );
  };

  const testMQTTConnection = async () => {
    try {
      const connected = await mqttService.connect();
      if (connected) {
        Alert.alert('Berhasil', 'Koneksi MQTT berhasil');
      } else {
        Alert.alert('Error', 'Gagal terhubung ke MQTT broker');
      }
    } catch (error) {
      Alert.alert('Error', 'Koneksi MQTT gagal');
    }
  };
    const testThermalPrinter = async () => {
      try {
        const testReceipt = {
          transactionId: 'TEST-001',
          cashierName: user?.name || 'Test Cashier',
          items: [
            { productName: 'Test Product', quantity: 1, price: 10000, subtotal: 10000 }
          ],
          total: 10000,
          paymentMethod: 'cash',
          timestamp: Date.now(), 
          storeName: 'Modern Cashier System',
          storeAddress: 'Jl. Teknologi No. 123, Jakarta'
        };
  
        await mqttService.printReceipt(testReceipt); // ✅ tidak dicek truthiness
        Alert.alert('Success', 'Perintah test print berhasil dikirim ke thermal printer');
      } catch (error) {
        console.error('Printer test error:', error);
        Alert.alert('Error', 'Terjadi kesalahan saat test printer');
      }
    };

  const testBarcodeScanner = () => {
    mqttService.simulateBarcodeScan('1234567890123');
    Alert.alert('Berhasil', 'Test barcode scan berhasil disimulasikan');
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    color = '#10B981' 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.subtitle}>Konfigurasi aplikasi kasir</Text>
      </View>

      {/* User Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>
        
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <UserIcon size={32} color="#FFFFFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Kasir'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'kasir@example.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Kasir</Text>
            </View>
          </View>
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pengaturan Aplikasi</Text>
        
        <SettingItem
          icon={<Bell size={24} color="#F59E0B" />}
          title="Notifikasi"
          subtitle="Aktifkan notifikasi push"
          color="#F59E0B"
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          }
        />
        
        <SettingItem
          icon={<Smartphone size={24} color="#64748B" />}
          title="Mode Offline"
          subtitle="Bekerja tanpa koneksi internet"
          color="#64748B"
          rightElement={
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: '#D1D5DB', true: '#10B981' }}
              thumbColor={offlineMode ? '#FFFFFF' : '#FFFFFF'}
            />
          }
        />
      </View>

      {/* Hardware Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hardware & Konektivitas</Text>
        
        <SettingItem
          icon={<Wifi size={24} color="#10B981" />}
          title="Koneksi MQTT"
          subtitle="Test koneksi ESP32"
          onPress={testMQTTConnection}
          color="#10B981"
        />
        
        <SettingItem
          icon={<Printer size={24} color="#2563EB" />}
          title="Thermal Printer"
          subtitle="Test cetak struk"
          onPress={testThermalPrinter}
          color="#2563EB"
        />
        
        <SettingItem
          icon={<Scan size={24} color="#7C3AED" />}
          title="Barcode Scanner"
          subtitle="Test scanner GM65"
          onPress={testBarcodeScanner}
          color="#7C3AED"
        />
      </View>

      {/* System Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Sistem</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versi Aplikasi</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Firebase</Text>
            <Text style={[styles.infoValue, { color: '#10B981' }]}>Terhubung</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sinkronisasi Terakhir</Text>
            <Text style={styles.infoValue}>Baru saja</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
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
  section: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
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
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 12,
  },
});