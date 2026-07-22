import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Product, Transaction, DashboardStats } from '../types'; 
import { Timestamp } from 'firebase/firestore';

export class DatabaseService {

  // Product Management
  static async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const productData = {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'products'), productData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  static async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  static async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  static async getProducts(): Promise<Product[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
    } catch (error) {
      console.error('Error getting products:', error);
      throw error;
    }
  }

  static async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const q = query(collection(db, 'products'), where('barcode', '==', barcode));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() } as Product;
      }
      return null;
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw error;
    }
  }

  // Transaction Management
  static async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<string> {
    try {
      const transactionData = {
        ...transaction,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      
      // Update product stock
      for (const item of transaction.items) {
        const productRef = doc(db, 'products', item.productId);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          const currentStock = productDoc.data().stock;
          await updateDoc(productRef, {
            stock: Math.max(0, currentStock - item.quantity),
            updatedAt: new Date(),
          });
        }
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  static async getTransactions(status?: string, cashierId?: string): Promise<Transaction[]> {
    try {
      let q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

      if (status) {
        q = query(q, where('status', '==', status));
      }

      if (cashierId) {
        q = query(q, where('cashierId', '==', cashierId));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

    // ========================= Delete Transaction =========================
static async deleteTransaction(transactionId: string): Promise<void> {
  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionDoc = await getDoc(transactionRef);

    if (!transactionDoc.exists()) {
      throw new Error('Transaction not found');
    }

    const transactionData = transactionDoc.data() as Transaction;

    // Mengembalikan stok produk
    for (const item of transactionData.items) {
      const productRef = doc(db, 'products', item.productId);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const currentStock = productDoc.data().stock || 0;
        await updateDoc(productRef, {
          stock: currentStock + item.quantity,
          updatedAt: new Date(),
        });
      }
    }

    // Hapus transaksi
    await deleteDoc(transactionRef);
    console.log(`Transaction ${transactionId} deleted successfully.`);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}
  
  // 🔹 Real-time Transactions Listener
  static listenToTransactionsRealtime(
    onUpdate: (transactions: Transaction[]) => void,
    cashierId?: string,  // Parameter opsional di belakang
  ): () => void {
    const transactionsRef = cashierId
      ? query(collection(db, 'transactions'), where('cashierId', '==', cashierId))
      : collection(db, 'transactions');
    
    const unsubscribe = onSnapshot(
      transactionsRef,
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        onUpdate(transactions); // Update transaksi
      },
      (error) => {
        console.error('Realtime transactions error:', error);
      }
    );
    return unsubscribe;
  }

    // 🔹 Delete Transactions Older Than X Days (default 7 hari)
  static async deleteOldTransactions(days: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const q = query(
        collection(db, 'transactions'),
        where('createdAt', '<', cutoffDate)
      );

      const querySnapshot = await getDocs(q);

      let deletedCount = 0;
      for (const docSnap of querySnapshot.docs) {
        const transactionData = docSnap.data() as Transaction;

        // kembalikan stok produk sebelum hapus
        for (const item of transactionData.items) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await getDoc(productRef);

          if (productDoc.exists()) {
            const currentStock = productDoc.data().stock || 0;
            await updateDoc(productRef, {
              stock: currentStock + item.quantity,
              updatedAt: new Date(),
            });
          }
        }

        await deleteDoc(doc(db, 'transactions', docSnap.id));
        deletedCount++;
      }

      console.log(`Auto-deleted ${deletedCount} transactions older than ${days} days.`);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old transactions:', error);
      throw error;
    }
  }

  // Dashboard Stats
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [transactionsSnapshot, productsSnapshot] = await Promise.all([ 
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'products'))
      ]);

      const transactions = transactionsSnapshot.docs.map(doc => doc.data()) as Transaction[];
      const products = productsSnapshot.docs.map(doc => doc.data()) as Product[];

      const totalSales = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
      const totalTransactions = transactions.length;
      const totalProducts = products.length;
      const lowStockProducts = products.filter(product => product.stock < 10).length;

      return {
        totalSales,
        totalTransactions,
        totalProducts,
        lowStockProducts,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  // 🔹 Real-time Dashboard Stats
  static subscribeDashboardStats(callback: (stats: DashboardStats) => void) {
    const transactionsRef = collection(db, 'transactions');
    const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
      let totalSales = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.total) {
          totalSales += data.total;
        }
      });
      const totalTransactions = snapshot.size;

      const productsRef = collection(db, 'products');
      getDocs(productsRef).then((productSnap) => {
        const totalProducts = productSnap.size;
        const lowStockProducts = productSnap.docs.filter(
          (doc) => doc.data().stock <= 5
        ).length;

        callback({
          totalSales,
          totalTransactions,
          totalProducts,
          lowStockProducts,
        });
      });
    });

    return unsubscribeTransactions;
  }

  // 🔹 Real-time Products Listener
  static listenToProductsRealtime(
    onUpdate: (products: Product[]) => void,
    onError: (error: any) => void
  ): () => void {
    const productsRef = collection(db, 'products');
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        onUpdate(products);
      },
      (error) => {
        console.error('Realtime products error:', error);
        onError(error);
      }
    );
    return unsubscribe;
  }

  // 🔹 Get Sales Data for the Last 7 Days
  static async getSalesData(): Promise<any[]> {
    try {
      const snapshot = await getDocs(collection(db, 'transactions'));
      const transactions = snapshot.docs.map(doc => doc.data()) as Transaction[];
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const salesData = last7Days.map(date => {
        const dayTransactions = transactions.filter(t => {
          const transactionDate = t.createdAt instanceof Timestamp 
            ? t.createdAt.toDate() 
            : new Date(t.createdAt); // Ensure it's converted to Date
          return transactionDate.toISOString().split('T')[0] === date;
        });

        const total = dayTransactions.reduce((sum, t) => sum + t.total, 0);

        return {
          date: new Date(date).toLocaleDateString('id-ID', { 
            month: 'short', 
            day: 'numeric' 
          }),
          total,
          count: dayTransactions.length
        };
      });

      return salesData;
    } catch (error) {
      console.error('Error getting sales data:', error);
      throw error;
    }
  }

  // User Management (CRUD for Users)
  static async addUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const userData = {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'users'), userData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: Partial<User> = {
        ...updates,
        updatedAt: new Date(),
      };
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }
}
