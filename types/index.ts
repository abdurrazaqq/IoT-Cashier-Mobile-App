// types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  cashierId: string;
  cashierName: string;
  items: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
  }[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  createdAt: Date;
  receiptPrinted: boolean;
}

export interface DashboardStats {
  totalSales: number;
  totalTransactions: number;
  totalProducts: number;
  lowStockProducts: number;
}

export interface ReceiptItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ReceiptData {
  transactionId: string;
  cashierName: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  timestamp: number; // gunakan number untuk Unix timestamp
  storeName: string;
  storeAddress: string;
}
