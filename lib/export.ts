import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import XLSX from 'xlsx';
import { Transaction, Product } from '../types';
import { Timestamp } from 'firebase/firestore';  // Pastikan Firebase SDK sudah diimport

export class ExportService {
  // Helper function to check and format valid dates with time if available
  static formatDate(date: any): string {
    let validDate: Date;

    // Jika date adalah objek Firestore Timestamp, konversi ke Date
    if (date instanceof Timestamp) {
      validDate = date.toDate();
    } else if (date instanceof Date) {
      validDate = date;
    } else {
      validDate = new Date(date);
    }
    // Pastikan validDate adalah objek Date yang valid
    if (isNaN(validDate.getTime())) {
      return 'Invalid Date'; 
    }

    // Format tanggal dan waktu
    return validDate.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  static async exportTransactionsToPDF(transactions: Transaction[]): Promise<void> {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #2563EB; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { font-weight: bold; color: #10B981; }
            </style>
          </head>
          <body>
            <h1>Laporan Transaksi</h1>
            <p>Total Transaksi: ${transactions.length}</p>
            <p>Total Penjualan: Rp ${transactions.reduce((sum, t) => sum + t.total, 0).toLocaleString('id-ID')}</p>
            
            <table>
              <thead>
                <tr>
                  <th>ID Transaksi</th>
                  <th>Kasir</th>
                  <th>Total</th>
                  <th>Metode Pembayaran</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(transaction => {
                  const validDate = ExportService.formatDate(transaction.createdAt);
                  return `
                    <tr>
                      <td>${transaction.id}</td>
                      <td>${transaction.cashierName}</td>
                      <td class="total">Rp ${transaction.total.toLocaleString('id-ID')}</td>
                      <td>${transaction.paymentMethod}</td>
                      <td>${validDate}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Bagikan Laporan Transaksi'
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  static async exportTransactionsToExcel(transactions: Transaction[]): Promise<void> {
    try {
      const data = transactions.map(transaction => {
        const validDate = ExportService.formatDate(transaction.createdAt);
        return {
          'ID Transaksi': transaction.id,
          'Kasir': transaction.cashierName,
          'Total': transaction.total,
          'Metode Pembayaran': transaction.paymentMethod,
          'Tanggal': validDate,
          'Items': transaction.items.map(item => `${item.productName} (${item.quantity}x)`).join(', ')
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.documentDirectory}laporan_transaksi.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Bagikan Laporan Excel'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  static async exportProductsToExcel(products: Product[]): Promise<void> {
    try {
      const data = products.map(product => {
        const validDate = ExportService.formatDate(product.createdAt);
        return {
          'ID Produk': product.id,
          'Nama': product.name,
          'Barcode': product.barcode,
          'Harga': product.price,
          'Stok': product.stock,
          'Kategori': product.category,
          'Deskripsi': product.description || '',
          'Tanggal Dibuat': validDate
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produk');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.documentDirectory}data_produk.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Bagikan Data Produk Excel'
      });
    } catch (error) {
      console.error('Error exporting products to Excel:', error);
      throw error;
    }
  }
}
