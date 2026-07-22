# Modern Cashier System - React Native Expo

Aplikasi kasir modern dengan integrasi IoT menggunakan React Native Expo, Firebase, ESP32, thermal printer, dan barcode scanner GM65.

## Features

### Admin Features
- **Dashboard Analytics**: Real-time statistics and business insights
- **Product Management**: Add, edit, delete products with barcode scanning
- **Transaction Monitoring**: View all transactions from all cashiers
- **Data Export**: Export data to PDF and Excel formats
- **System Status**: Monitor ESP32, printer, and database connections
- **User Management**: Manage cashier accounts

### Cashier Features
- **Point of Sale**: Modern cashier interface with cart management
- **Barcode Scanning**: GM65 barcode scanner integration via MQTT
- **Multiple Payment Methods**: Cash, card, and digital payments
- **Receipt Printing**: Thermal printer integration via MQTT
- **Transaction History**: View personal transaction history
- **Offline Support**: Work without internet connection

### IoT Integration
- **ESP32 Communication**: MQTT protocol for real-time communication
- **Barcode Scanner GM65**: Automatic product scanning
- **Thermal Printer**: Automatic receipt printing
- **Real-time Updates**: Live data synchronization

## Technology Stack

- **Frontend**: React Native with Expo SDK 53
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **IoT Communication**: MQTT protocol
- **Navigation**: Expo Router
- **Icons**: Lucide React Native
- **Export**: PDF and Excel generation
- **State Management**: React hooks and context

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database and Authentication
3. Update `lib/firebase.ts` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 2. MQTT Broker Setup

Update `lib/mqtt.ts` with your MQTT broker URL:

```javascript
async connect(brokerUrl: string = 'wss://your-mqtt-broker.com:8884/mqtt') {
  // Your MQTT broker configuration
}
```

### 3. ESP32 Configuration

Program your ESP32 with the following MQTT topics:
- `cashier/barcode` - For sending barcode data
- `cashier/print` - For receiving print commands

### 4. Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:web
```

## Demo Accounts

The app includes demo accounts for testing:

**Admin Account:**
- Email: admin@demo.com
- Password: admin123

**Cashier Account:**
- Email: cashier@demo.com
- Password: cashier123

## File Structure

```
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   ├── index.tsx          # Login screen
│   └── register.tsx       # Registration screen
├── components/            # Reusable components
├── lib/                   # Core libraries
│   ├── auth.ts           # Authentication service
│   ├── database.ts       # Firestore operations
│   ├── firebase.ts       # Firebase configuration
│   ├── mqtt.ts           # MQTT communication
│   ├── storage.ts        # Local storage
│   └── export.ts         # Data export utilities
└── types/                # TypeScript definitions
```

## Hardware Requirements

### ESP32 Setup
- ESP32 development board
- MQTT client library
- WiFi connection
- GPIO connections for barcode scanner and printer

### Barcode Scanner GM65
- Connect to ESP32 via UART
- Configure baud rate (default: 9600)
- Set to auto-scan mode

### Thermal Printer
- ESC/POS compatible thermal printer
- Connect via UART or USB to ESP32
- Support for 58mm or 80mm paper width

## MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `cashier/barcode` | ESP32 → App | Barcode scan data |
| `cashier/print` | App → ESP32 | Print commands |
| `cashier/status` | ESP32 → App | Device status updates |

## Features Overview

### Dashboard
- Real-time sales statistics
- Product inventory overview
- Transaction monitoring
- System status indicators

### Product Management
- Barcode-based product entry
- Category management
- Stock tracking
- Price management
- Bulk import/export

### Transaction Processing
- Cart management
- Multiple payment methods
- Automatic receipt generation
- Real-time inventory updates

### Reporting & Analytics
- Sales reports
- Product performance
- Payment method analysis
- Export to PDF/Excel

## Security Features

- Firebase Authentication
- Role-based access control
- Secure data transmission
- Local data encryption
- Session management

## Offline Capabilities

- Local data caching
- Offline transaction processing
- Auto-sync when online
- Conflict resolution

## Troubleshooting

### Common Issues

1. **Firebase Connection Failed**
   - Check internet connection
   - Verify Firebase configuration
   - Check API keys

2. **MQTT Connection Issues**
   - Verify broker URL and credentials
   - Check network connectivity
   - Confirm ESP32 is online

3. **Barcode Scanner Not Working**
   - Check ESP32 connections
   - Verify UART settings
   - Test scanner independently

4. **Printer Not Responding**
   - Check printer power
   - Verify connection cables
   - Test with sample print

## Support

For technical support or questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## License

This project is licensed under the MIT License.