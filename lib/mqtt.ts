import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import process from 'process';
import mqtt, { MqttClient } from 'mqtt';

// Polyfill untuk React Native
(global as any).Buffer = Buffer;
(global as any).process = process;

interface BarcodeListener {
  id: string;
  callback: (barcode: string) => void;
}

interface ReceiptItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptData {
  transactionId: string;
  cashierName: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  timestamp: number;
  storeName?: string;
  storeAddress?: string;
}

class MQTTService {
  private client: MqttClient | null = null;
  private isConnected = false;
  private listeners: Record<string, ((payload: string) => void)[]> = {};
  private barcodeListeners: BarcodeListener[] = [];
  private currentListenerId: string | null = null;

  // ================= CONNECT =================
  async connect(
    brokerUrl: string = 'wss://3d6e339520bb4803a28a87b88859f672.s1.eu.hivemq.cloud:8884/mqtt',
    username: string = 'mqtt-user',
    password: string = 'StrongPassword123'
  ): Promise<boolean> {
    try {
      console.log('🔗 Connecting to MQTT broker:', brokerUrl);

      this.client = mqtt.connect(brokerUrl, {
        protocol: 'wss',
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
        clientId: 'cashier' + Math.random().toString(16).slice(2, 10),
        username,
        password,
        rejectUnauthorized: false, // HiveMQ Cloud TLS cert
      });

      this.client.on('connect', () => {
        console.log('✅ MQTT Connected');
        this.isConnected = true;

        // Auto-subscribe barcode
        this.subscribe('cashier/barcode', (barcode: string) => {
          this.handleBarcodeReceived(barcode);
        });
      });

      this.client.on('reconnect', () => {
        console.log('🔄 Reconnecting to MQTT...');
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ MQTT Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT Connection closed');
        this.isConnected = false;
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        const payload = message.toString();
        if (this.listeners[topic]) {
          this.listeners[topic].forEach(cb => cb(payload));
        }
      });

      return true;
    } catch (error) {
      console.error('❌ MQTT connection failed:', error);
      return false;
    }
  }

  // ================= BARCODE =================
  private handleBarcodeReceived(barcode: string) {
    console.log('📦 Barcode received:', barcode);
    if (this.currentListenerId) {
      const listener = this.barcodeListeners.find(l => l.id === this.currentListenerId);
      if (listener) listener.callback(barcode);
    }
  }

  addBarcodeListener(id: string, callback: (barcode: string) => void) {
    this.barcodeListeners.push({ id, callback });
  }

  removeBarcodeListener(id: string) {
    this.barcodeListeners = this.barcodeListeners.filter(l => l.id !== id);
    if (this.currentListenerId === id) this.currentListenerId = null;
  }

  setActiveBarcodeListener(id: string) {
    this.currentListenerId = id;
  }

  clearActiveBarcodeListener() {
    this.currentListenerId = null;
  }

  // ================= SUBSCRIBE & PUBLISH =================
  subscribe(topic: string, callback: (payload: string) => void) {
    if (this.client && this.isConnected) {
      this.client.subscribe(topic, { qos: 0 }, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to topic: ${topic}`);
          if (!this.listeners[topic]) this.listeners[topic] = [];
          this.listeners[topic].push(callback);
        } else {
          console.error(`❌ Failed to subscribe ${topic}:`, err);
        }
      });
    }
  }

  publish(topic: string, message: string) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, message, { qos: 1, retain: false }, (err?: Error) => {
        if (err) console.error(`❌ Publish failed to ${topic}:`, err);
        else console.log(`✅ Published to ${topic}: ${message}`);
      });
    }
  }

  // ================= PRINT RECEIPT =================
  printReceipt(receiptData: ReceiptData) {
    const topic = 'cashier/print';

    const payload = {
      type: 'receipt',
      data: {
        header: {
          storeName: receiptData.storeName || ' Modern Cashier System ',
          storeAddress: receiptData.storeAddress || 'Jl.ZA PAGAR ALAM, BANDAR LAMPUNG',
          phone: '0852-6892-1785'
        },
        transaction: {
          id: receiptData.transactionId,
          date: new Date(receiptData.timestamp).toLocaleDateString('id-ID'),
          time: new Date(receiptData.timestamp).toLocaleTimeString('id-ID'),
          cashier: receiptData.cashierName
        },
        items: receiptData.items.map(item => ({
          name: item.productName,
          qty: item.quantity,
          subtotal: item.subtotal
        })),
        summary: {
          total: receiptData.total,
          paymentMethod: receiptData.paymentMethod
        },
        footer: {
          message: 'Terimakasih atas kunjungan Anda!',
          timestamp: new Date(receiptData.timestamp).toISOString()
        }
      }
    };

    this.publish(topic, JSON.stringify(payload));
  }

  // ================= SIMULATE BARCODE =================
  async simulateBarcodeScan(barcode: string): Promise<boolean> {
    try {
      const topic = 'cashier/barcode';
      const payload = JSON.stringify({ barcode });

      this.publish(topic, payload);
      this.handleBarcodeReceived(barcode);

      console.log('📤 Simulated barcode published:', payload);
      return true;
    } catch (error) {
      console.error('❌ Failed to simulate barcode:', error);
      return false;
    }
  }

  // ================= SIMULATE PRINT =================
  async simulatePrint(): Promise<boolean> {
    try {
      const testReceipt: ReceiptData = {
        transactionId: 'TEST-001',
        cashierName: 'Test User',
        items: [
          { productName: 'Test Product', quantity: 1, price: 10000, subtotal: 10000 }
        ],
        total: 10000,
        paymentMethod: 'cash',
        timestamp: Date.now(),
        storeName: 'Modern Cashier System',
        storeAddress: 'Jl. Teknologi No. 123, Jakarta'
      };

      this.printReceipt(testReceipt);
      console.log('🖨️ Simulated test print sent');
      return true;
    } catch (error) {
      console.error('❌ Failed to simulate print:', error);
      return false;
    }
  }

  // ================= DISCONNECT =================
  disconnect() {
    if (this.client) this.client.end(true);
    this.isConnected = false;
    this.listeners = {};
    this.barcodeListeners = [];
    this.currentListenerId = null;
    console.log('🔌 MQTT Disconnected');
  }
}

export const mqttService = new MQTTService();
