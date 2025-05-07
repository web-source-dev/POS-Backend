# POS System Backend

This is the backend for a Point of Sale (POS) system. It uses a serial key-based authentication system instead of a traditional login system. Devices are registered using serial keys and authenticated automatically based on their hardware identifiers.

## Features

- **Serial Key Authentication**: Devices are registered using serial keys instead of user credentials
- **Multi-Device Support**: A single serial key can be used for up to 4 devices
- **Device Binding**: Each device is bound to the system using a unique hardware identifier
- **Electron Integration**: Utility functions for Electron desktop app integration
- **REST API**: Express-based REST API for all POS operations

## Tech Stack

- **Node.js/Express**: Backend server framework
- **MongoDB/Mongoose**: Database and ODM
- **JWT**: JSON Web Tokens for device authentication
- **crypto/uuid**: For secure key generation and hardware identification

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository
2. Install the dependencies:

```bash
cd backend
npm install
```

3. Create a `.env` file in the backend directory with the following variables (or let the application create a default one for you):

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/pos_system
JWT_SECRET=your-secret-key-change-this-in-production
```

### Running the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Serial Key Management

- `POST /api/serial-key/generate`: Generate a new serial key
  - Body: `{ maxDevices: Number }` (optional, default: 1, max: 4)
  - Response: `{ success: Boolean, data: { key: String, maxDevices: Number, expiryDate: Date } }`

- `POST /api/serial-key/register`: Register a device with a serial key
  - Body: `{ serialKey: String, deviceName: String, businessName: String }`
  - Response: `{ success: Boolean, data: { deviceId: String, token: String, ... } }`

- `POST /api/serial-key/verify`: Verify a device and get a new token
  - Body: `{ deviceId: String }`
  - Response: `{ success: Boolean, data: { deviceId: String, token: String, ... } }`

- `GET /api/serial-key/info/:key`: Get information about a serial key
  - Response: `{ success: Boolean, data: { key: String, isActive: Boolean, ... } }`

- `PATCH /api/serial-key/status/:key`: Update a serial key's status
  - Body: `{ isActive: Boolean }`
  - Response: `{ success: Boolean, message: String, data: { ... } }`

## Authentication

The system uses JWT tokens for device authentication. Each API request (except for registration and verification) should include the `x-auth-token` header with the device's token.

## Electron Integration

The `electronUtils.js` module provides utility functions for Electron desktop app integration:

- `getUniqueDeviceIdentifier()`: Get a unique hardware identifier for the device
- `saveDeviceRegistration(data)`: Save device registration data locally
- `loadDeviceRegistration()`: Load device registration data from local storage
- `clearDeviceRegistration()`: Clear device registration data from local storage

## License

ISC 