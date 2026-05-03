# Smart Hardware Inventory Management System

A full-stack hardware inventory management system with a React Native (Expo) mobile app and an Express.js backend API.

It supports authentication, products, orders, suppliers, notices, tasks, repairs, file uploads, and role-based access control.

## Features

### Authentication & Users
- JWT-based authentication
- Register / login
- Profile view/update
- Change password
- Admin user management
- Roles: `admin`, `staff`, `customer`

### Product Management
- Product CRUD
- SKU uniqueness and validation
- Stock updates and low-stock alerts
- Product image upload (Cloudinary)

### Order Management
- Create orders with automatic stock reduction
- MongoDB transactions for order create/cancel stock consistency
- Order status workflow
- Order stats
- Payment proof upload

### Supplier Management
- Supplier CRUD (soft deactivate on delete)
- Supplier document/contract uploads

### Notice Management
- Create/update/delete notices
- Banner image upload
- Active notices endpoint with date filtering
- Type, priority, target audience fields

### Task Management
- Admin creates tasks
- Staff/Admin update task status
- Proof-of-work image uploads
- My tasks endpoint
- Task stats

### Repair Management
- Repair creation with generated repair number
- Damage photo uploads
- Repair status workflow
- Repair stats

---

## Tech Stack

### Mobile (`mobile`)
- Expo `~54.0.33`
- React `19.1.0`
- React Native `0.81.5`
- React Navigation v7 (`@react-navigation/native`, `stack`, `bottom-tabs`)
- Axios
- Expo SecureStore
- Expo Image Picker / Document Picker
- React Native Paper

### Backend (`server`)
- Node.js + Express `^5.2.1`
- MongoDB Atlas + Mongoose `^9.4.1`
- JWT (`jsonwebtoken`)
- bcrypt (`bcryptjs`)
- express-validator
- multer (multipart upload handling)
- Cloudinary SDK
- cors, morgan, dotenv

---

## Architecture Overview

### High Level

- **Clients**: Expo mobile app (Android/iOS), API tools (Postman)
- **API**: Express server under `/api`
- **Database**: MongoDB Atlas via Mongoose
- **File flow**: client upload -> multer temp file (`uploads/`) -> Cloudinary -> URL/public_id saved in MongoDB
- **Auth**: JWT Bearer token + role checks

### Backend Structure

```text
server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── cloudinary.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── product/
│   │   ├── order/
│   │   ├── supplier/
│   │   ├── notice/
│   │   ├── task/
│   │   └── repair/
│   └── routes/
│       └── index.js
├── server.js
├── seed.js
└── package.json


### Mobile App Structure
```text
mobile/
├── src/
│   ├── components/
│   ├── context/
│   │   └── AuthContext.js
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── screens/
│   ├── services/
│   │   └── api.js
│   └── utils/
│       └── theme.js
├── App.js
├── app.json
└── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ recommended
- MongoDB Atlas account
- Cloudinary account

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Expo**
   ```bash
   npx expo start --tunnel
   ```

4. **Run on device**
   - Scan QR code with Expo Go app (Android/iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

## 📡 API Endpoints

### Authentication (/api/auth)
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/profile           - Get user profile (Protected)
PUT    /api/auth/profile           - Update profile (Protected)
PUT    /api/auth/change-password   - Change password (Protected)
GET    /api/auth/users             - Get all users (Admin only)
PUT    /api/auth/users/:id         - Update user role/status (Admin only)
DELETE /api/auth/users/:id         - Delete Users
```

### Products (/api/products)
```
GET    /api/products               - Get all products
GET    /api/products/low-stock     - Get low stock products
GET    /api/products/:id           - Get product by ID
POST   /api/products               - Create product (Protected)
PUT    /api/products/:id           - Update product (Protected)
DELETE /api/products/:id           - Delete product (Protected)
PATCH  /api/products/:id/stock     - Update stock (Protected)
```

### Orders (/api/orders)
```
GET    /api/orders                 - Get all orders
GET    /api/orders/stats           - Get order statistics
GET    /api/orders/:id             - Get order by ID
POST   /api/orders                 - Create order (Protected)
PUT    /api/orders/:id/status      - Update order status (Protected)
DELETE /api/orders/:id             - Cancel order (Protected)
POST   /api/orders/:id/payment-proof - Upload payment proof
```

### Suppliers
```
GET    /api/suppliers                - Get all suppliers
GET    /api/suppliers/:id            - Get supplier by ID
POST   /api/suppliers                - Create supplier (Protected)
PUT    /api/suppliers/:id            - Update supplier (Protected)
DELETE /api/suppliers/:id            - Delete supplier (Protected)
POST   /api/suppliers/:id/documents  - Upload documents
POST   /api/suppliers/:id/contract
```

### Notices
```
GET    /api/notices                - Get all notices
GET    /api/notices/active         - Get active notices
GET    /api/notices/:id            - Get notice by ID
POST   /api/notices                - Create notice (Protected)
PUT    /api/notices/:id            - Update notice (Protected)
DELETE /api/notices/:id            - Delete notice (Protected)
```

### Tasks
```
GET    /api/tasks                  - Get all tasks
GET    /api/tasks/my-tasks         - Get my assigned tasks
GET    /api/tasks/stats            - Get task statistics
GET    /api/tasks/:id              - Get task by ID
POST   /api/tasks                  - Create task (Protected)
PUT    /api/tasks/:id/status       - Update task status (Protected)
POST   /api/tasks/:id/proof        - Upload proof (Protected)
DELETE /api/tasks/:id              - Delete Completed tasks
```

### Repairs
```
GET    /api/repairs                - Get all repairs
GET    /api/repairs/stats          - Get repair statistics
GET    /api/repairs/:id            - Get repair by ID
POST   /api/repairs                - Create repair (Protected)
PUT    /api/repairs/:id/status     - Update repair status (Protected)
POST   /api/repairs/:id/photos     - Upload photos (Protected)
PUT    /api/repairs/:id            - Edit repairs
```

## 🔐 Authentication

### JWT Token Flow
1. User registers or logs in
2. Server validates credentials
3. Server generates JWT token
4. Token stored securely in Expo SecureStore
5. Token attached to every API request via Axios interceptor
6. Server validates token on protected routes

### Roles & Permissions
- **Admin**: Full access to all features, user management
- **Staff**: Create/edit products, orders, tasks, repairs
- **Viewer**: Read-only access to data

## 🛡️ Security Features

-  Password hashing with bcrypt (12 salt rounds)
-  JWT token authentication
-  Token expiration (7 days)
-  Request validation with express-validator
-  MongoDB injection prevention
-  CORS configuration
-  Role-based access control
-  Secure password comparison
-  Error handling without data leakage

## 📸 Image Upload

All image uploads are handled via Cloudinary:
- Automatic optimization
- Format conversion (WebP for better performance)
- Quality adjustment
- Secure URL generation

Supported uploads:
- Product images
- Supplier documents
- Notice banners
- Task proof photos
- Repair damage photos


## 🧪 Testing

### Test Admin Account
After running `npm run seed`:
- **Email:** admin@hardware.com
- **Password:** admin123

### Manual Testing Flow
1. Start backend: `npm run dev`
2. Start mobile: `npx expo start`
3. Register new user or login with admin credentials
4. Create products with images
5. Create orders (stock auto-reduces)
6. Assign tasks to users
7. Track repairs

## 📝 Development Guidelines

### Code Style
- Functional components with hooks
- JSDoc comments on all functions
- Consistent error handling with try-catch
- Async/await pattern
- ESLint rules (recommended)


## 🔧 Troubleshooting

### MongoDB Connection Issues
- Check MongoDB Atlas IP whitelist (add 0.0.0.0/0 for development)
- Verify MONGODB_URI in .env file
- Ensure network access is enabled

### Expo Go Errors
- Clear cache: `npx expo start --clear`
- Check API URL matches your network
- Restart Metro bundler

### File Encoding Issues
- Ensure all files are UTF-8 (no BOM)
- In VS Code: Click encoding in bottom-right → "Save with Encoding" → "UTF-8"

## 📄 License

This project is created for educational purposes.

## 👥 Team
```text
SLIIT Undergraduates - Year 2 Semester 2
Group Number: 38
Member 1: IT24100108 – Sanjana B.A. – Order Management
Member 2: IT24100576 – Pathberiya H.A. – Product Management
Member 3: IT24101855 – Athukorala S.B. – Supplier Management
Member 4: IT24101843 – Dharmadasa K.A.Y.T.H. – Notice Management
Member 5: IT24101809 – Ferdinando M.D.S. – Task Management
Member 6: IT24100926 – Pathirana E.P.D.N. – Repair & Return Management 
```

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Check console logs for errors
3. Verify environment variables

---

**Built with ❤️ using MERN Stack**
