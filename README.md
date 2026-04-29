# Smart Hardware Inventory Management System

A professional full-stack mobile application for managing hardware inventory, orders, suppliers, tasks, and repairs. Built with MERN stack (MongoDB, Express.js, React Native, Node.js) and Cloudinary for image storage.

## 📱 Features

### Authentication & User Management
- ✅ User Registration & Login with JWT
- ✅ Role-based Access Control (Admin, Staff, Viewer)
- ✅ Password Hashing with bcrypt (12 rounds)
- ✅ Secure Token Storage with Expo SecureStore
- ✅ Profile Management
- ✅ Password Change

### Product Management
- ✅ Complete CRUD operations
- ✅ Stock tracking and management
- ✅ Image upload to Cloudinary
- ✅ Low stock alerts
- ✅ Category-based filtering

### Order Management
- ✅ Order creation with automatic stock reduction
- ✅ MongoDB transactions for data integrity
- ✅ Order status tracking
- ✅ Payment status management
- ✅ Order statistics

### Supplier Management
- ✅ Vendor information tracking
- ✅ Document uploads
- ✅ Contact management
- ✅ Performance tracking

### Notice & Announcements
- ✅ Create and manage announcements
- ✅ Banner images
- ✅ Priority levels
- ✅ Active/expired notices

### Task Management
- ✅ Staff task assignments
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Proof of work uploads
- ✅ Task statistics
- ✅ Progress tracking

### Repair Tracking
- ✅ After-sales repair management
- ✅ Damage photo uploads
- ✅ Repair status tracking
- ✅ Cost tracking
- ✅ Customer information

## 🏗️ Architecture

### Backend Structure
```
server/
├── src/
│   ├── config/           # Database & Cloudinary configuration
│   ├── middleware/       # Auth, error handling, validation
│   ├── modules/          # Feature modules
│   │   ├── auth/        # Authentication & user management
│   │   ├── product/     # Product management
│   │   ├── order/       # Order management
│   │   ├── supplier/    # Supplier management
│   │   ├── notice/      # Notice management
│   │   ├── task/        # Task management
│   │   └── repair/      # Repair tracking
│   └── routes/          # Route aggregation
├── server.js            # Entry point
├── seed.js              # Database seeding script
└── .env                 # Environment variables
```

### Mobile App Structure
```
mobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context (Auth)
│   ├── navigation/      # React Navigation setup
│   ├── screens/         # App screens
│   ├── services/        # API services
│   └── utils/           # Theme & utilities
├── App.js              # Entry point
└── app.json            # Expo configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- MongoDB Atlas account
- Cloudinary account
- Expo CLI (for mobile development)

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env` file in server directory:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Atlas
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hardware_inventory?retryWrites=true&w=majority
   
   # JWT Secret (generate a strong random string)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Seed database with admin user**
   ```bash
   npm run seed
   ```
   
   This creates:
   - **Email:** admin@hardware.com
   - **Password:** admin123
   - **Role:** admin

5. **Start development server**
   ```bash
   npm run dev
   ```
   
   Server runs on: `http://localhost:5000`

### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL**
   Edit `mobile/src/services/api.js`:
   ```javascript
   // For Android emulator
   const API_URL = 'http://10.0.2.2:5000/api';
   
   // For iOS simulator
   const API_URL = 'http://localhost:5000/api';
   
   // For physical device (use your computer's IP)
   const API_URL = 'http://192.168.1.100:5000/api';
   ```

4. **Start Expo**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - Scan QR code with Expo Go app (Android/iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login user
GET    /api/auth/profile           - Get user profile (Protected)
PUT    /api/auth/profile           - Update profile (Protected)
PUT    /api/auth/change-password   - Change password (Protected)
GET    /api/auth/users             - Get all users (Admin only)
PUT    /api/auth/users/:id         - Update user role/status (Admin only)
```

### Products
```
GET    /api/products               - Get all products
GET    /api/products/low-stock     - Get low stock products
GET    /api/products/:id           - Get product by ID
POST   /api/products               - Create product (Protected)
PUT    /api/products/:id           - Update product (Protected)
DELETE /api/products/:id           - Delete product (Protected)
PATCH  /api/products/:id/stock     - Update stock (Protected)
```

### Orders
```
GET    /api/orders                 - Get all orders
GET    /api/orders/stats           - Get order statistics
GET    /api/orders/:id             - Get order by ID
POST   /api/orders                 - Create order (Protected)
PUT    /api/orders/:id/status      - Update order status (Protected)
DELETE /api/orders/:id             - Cancel order (Protected)
```

### Suppliers
```
GET    /api/suppliers              - Get all suppliers
GET    /api/suppliers/:id          - Get supplier by ID
POST   /api/suppliers              - Create supplier (Protected)
PUT    /api/suppliers/:id          - Update supplier (Protected)
DELETE /api/suppliers/:id          - Delete supplier (Protected)
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
```

### Repairs
```
GET    /api/repairs                - Get all repairs
GET    /api/repairs/stats          - Get repair statistics
GET    /api/repairs/:id            - Get repair by ID
POST   /api/repairs                - Create repair (Protected)
PUT    /api/repairs/:id/status     - Update repair status (Protected)
POST   /api/repairs/:id/photos     - Upload photos (Protected)
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

- ✅ Password hashing with bcrypt (12 salt rounds)
- ✅ JWT token authentication
- ✅ Token expiration (7 days)
- ✅ Request validation with express-validator
- ✅ MongoDB injection prevention
- ✅ CORS configuration
- ✅ Role-based access control
- ✅ Secure password comparison
- ✅ Error handling without data leakage

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

## 🎨 UI/UX Design

### Theme
- **Primary Color**: #1E3A5F (Industrial Blue)
- **Secondary**: #F59E0B (Hardware Orange)
- **Background**: #F5F7FA (Light Gray)
- **Text**: High contrast for readability

### Design Principles
- Clean, modern interface
- Industrial hardware aesthetic
- Consistent spacing and typography
- Mobile-first responsive design
- Intuitive navigation

## 📊 Database Models

### User
- name, email, phone, password (hashed)
- role (admin/staff/viewer)
- isActive, avatar, lastLogin

### Product
- name, SKU, category, description
- price, stock, lowStockThreshold
- images (Cloudinary URLs)
- supplier (reference)

### Order
- orderNumber (auto-generated)
- customer details
- items (with quantity and unitPrice)
- totalAmount, status, paymentStatus
- notes

### Supplier
- name, contactPerson, email, phone
- address, GST number
- documents (Cloudinary URLs)
- isActive

### Notice
- title, content, priority
- banner image
- isActive, expiresAt

### Task
- title, description, assignedTo
- priority, status, dueDate
- proof (Cloudinary URLs)

### Repair
- productName, customer details
- issue description, status
- damage photos
- estimated cost, actual cost

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

### Git Workflow
```bash
git checkout -b feature/your-feature-name
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

### Commit Messages
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Tests

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

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

## 📦 Deployment

### Backend (Production)
1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Configure MongoDB Atlas production cluster
4. Set up Cloudinary production account
5. Deploy to Heroku, Railway, or AWS

### Mobile (Production)
1. Update API_URL to production backend
2. Build with Expo:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```
3. Publish to app stores

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

This project is created for educational purposes.

## 👥 Team

Developed as a professional full-stack project demonstrating modern mobile app development with MERN stack.

## 📞 Support

For issues or questions:
1. Check troubleshooting section
2. Review API documentation
3. Check console logs for errors
4. Verify environment variables

---

**Built with ❤️ using MERN Stack**
