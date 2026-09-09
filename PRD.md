# Windows Remote Management System (RMS) Server - Product Requirements Document

## 1. Project Overview

### 1.1 Product Description
Windows RMS Server is a comprehensive remote management and monitoring system designed to track, manage, and monitor Windows devices across an organization. The system provides centralized device management, usage tracking, and configuration management capabilities.

### 1.2 Purpose
- Track and monitor Windows laptop/desktop usage across organizational networks
- Provide centralized device registration and management
- Enable remote configuration management (wallpaper settings, commands)
- Collect and aggregate usage metrics for reporting and analytics
- Support geolocation tracking for asset management

### 1.3 Target Users
- IT Administrators
- System Administrators
- Asset Management Teams
- Educational Institutions (based on NavGurukul repository)

## 2. System Architecture

### 2.1 Technology Stack
- **Backend Framework**: Node.js with Express.js
- **Database**: PostgreSQL
- **Runtime**: Node.js with Nodemon for development
- **Dependencies**:
  - `express` (v4.18.2) - Web framework
  - `pg` (v8.11.3) - PostgreSQL client
  - `cors` (v2.8.5) - Cross-origin resource sharing
  - `axios` (v1.6.2) - HTTP client
  - `body-parser` (v1.20.2) - Request parsing
  - `dotenv` (v16.3.1) - Environment configuration

### 2.2 Deployment Architecture
- **Containerization**: Docker support with Apache web server
- **Development**: Nodemon for hot-reloading during development
- **Production**: Express server with database connectivity

## 3. Database Design

### 3.1 Database Configuration
Located in `config/database.js:5-11`, the system uses PostgreSQL with connection pooling:

```javascript
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});
```

### 3.2 Database Schema

#### 3.2.1 Devices Table
**Purpose**: Store registered device information
**Location**: `config/database.js:17-25`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing device identifier |
| username | VARCHAR(255) | NOT NULL | Associated user account |
| serial_number | VARCHAR(50) | NOT NULL, UNIQUE | Device serial number |
| mac_address | VARCHAR(50) | NOT NULL | Network MAC address |
| location | VARCHAR(255) | NOT NULL | Device physical location |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

#### 3.2.2 Laptop Tracking Table
**Purpose**: Store daily usage tracking data
**Location**: `config/database.js:28-41`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-incrementing tracking record ID |
| system_id | VARCHAR(255) | NOT NULL | Unique system identifier |
| mac_address | VARCHAR(50) | NOT NULL | Network MAC address |
| serial_number | VARCHAR(50) | NOT NULL | Device serial number |
| username | VARCHAR(255) | NOT NULL | Associated user account |
| total_active_time | INTEGER | NOT NULL | Total active time in seconds |
| latitude | DECIMAL(9,6) | NULLABLE | GPS latitude coordinate |
| longitude | DECIMAL(9,6) | NULLABLE | GPS longitude coordinate |
| location_name | VARCHAR(255) | NULLABLE | Human-readable location name |
| timestamp | TIMESTAMP | NOT NULL | Record timestamp |

#### 3.2.3 Additional Tables (Referenced but not defined)
Based on the codebase analysis, the following tables are referenced:
- **Commands Table**: For storing pending device commands
- **Metrics Table**: For detailed system metrics storage

### 3.3 Data Model Relationships

#### 3.3.1 Device Model (`models/deviceModel.js`)
- **Create Device**: Register new devices with hostname and device name
- **Get By ID**: Retrieve specific device information
- **Get All**: List all registered devices

#### 3.3.2 Command Model (`models/commandModel.js`)
- **Create Command**: Queue commands for specific devices
- **Get Pending Commands**: Retrieve unexecuted commands
- **Mark as Executed**: Update command status

#### 3.3.3 Wallpaper Model (`models/wallpaperModel.js`)
- **Add Wallpaper Command**: Create wallpaper change commands

## 4. API Endpoints and Functionality

### 4.1 Device Management API (`/api/devices`)

#### 4.1.1 Register Device
- **Endpoint**: `POST /api/devices`
- **Controller**: `controllers/deviceController.js:4-18`
- **Purpose**: Register new devices in the system
- **Request Body**:
  ```json
  {
    "hostname": "string",
    "device_name": "string"
  }
  ```
- **Response**: Device registration confirmation with ID

#### 4.1.2 Get All Devices
- **Endpoint**: `GET /api/devices`
- **Controller**: `controllers/deviceController.js:20-28`
- **Purpose**: Retrieve list of all registered devices
- **Response**: Array of device objects

### 4.2 Wallpaper Management API (`/api/wallpaper`)

#### 4.2.1 Get Current Wallpaper
- **Endpoint**: `GET /api/wallpaper`
- **Controller**: `controllers/wallpaperController.js:22-35`
- **Purpose**: Retrieve current wallpaper URL from file system
- **Storage**: File-based storage in `data/wallpaper.json`
- **Response**: Current wallpaper URL

#### 4.2.2 Update Wallpaper
- **Endpoint**: `POST /api/wallpaper`
- **Controller**: `controllers/wallpaperController.js:38-58`
- **Purpose**: Update system wallpaper URL
- **Request Body**:
  ```json
  {
    "wallpaper": "string (URL)"
  }
  ```

### 4.3 Laptop Tracking API (`/api/tracking`)

#### 4.3.1 Sync Laptop Data
- **Endpoint**: `POST /api/tracking/sync`
- **Controller**: `controllers/laptopTrackingController.js:8-109`
- **Purpose**: Sync individual device usage data
- **Features**:
  - Daily aggregation by user/system
  - Location tracking support
  - Automatic time accumulation
- **Request Body**:
  ```json
  {
    "username": "string",
    "system_id": "string",
    "mac_address": "string",
    "serial_number": "string",
    "active_time": "integer (seconds)",
    "total_time": "integer (optional)",
    "latitude": "decimal (optional)",
    "longitude": "decimal (optional)",
    "location_name": "string (optional)",
    "timestamp": "ISO string (optional)"
  }
  ```

#### 4.3.2 Bulk Sync Laptop Data
- **Endpoint**: `POST /api/tracking/bulk-sync`
- **Controller**: `controllers/laptopTrackingController.js:114-258`
- **Purpose**: Bulk synchronization of multiple tracking records
- **Features**:
  - Transaction-based processing
  - Automatic rollback on errors
  - Batch processing optimization

#### 4.3.3 Get User Usage Data
- **Endpoint**: `GET /api/tracking/usage/:username`
- **Controller**: `controllers/laptopTrackingController.js:263-303`
- **Purpose**: Retrieve daily usage statistics for specific user
- **Query Parameters**:
  - `start_date`: Filter from date
  - `end_date`: Filter to date

#### 4.3.4 Get All Tracking Data
- **Endpoint**: `GET /api/tracking/all`
- **Controller**: `controllers/laptopTrackingController.js:308-355`
- **Purpose**: Retrieve all tracking data with optional date filtering

#### 4.3.5 Get System-Specific Data
- **Endpoint**: `GET /api/tracking/system/:system_id`
- **Controller**: `controllers/laptopTrackingController.js:360-403`
- **Purpose**: Retrieve tracking data for specific system

#### 4.3.6 Get Serial Number Data
- **Endpoint**: `GET /api/tracking/serial/:serial_number`
- **Controller**: `controllers/laptopTrackingController.js:408-451`
- **Purpose**: Retrieve tracking data for specific device serial number

### 4.4 Metrics API (`/api/metrics`)

#### 4.4.1 Store Metrics
- **Endpoint**: `POST /api/metrics/:clientId`
- **Controller**: `routes/metricRoutes.js:8-71`
- **Purpose**: Store detailed system metrics
- **Features**:
  - Session tracking
  - System performance metrics
  - Memory and CPU usage tracking

#### 4.4.2 Get Client Metrics
- **Endpoint**: `GET /api/metrics/:clientId`
- **Controller**: `routes/metricRoutes.js:74-95`
- **Purpose**: Retrieve metrics for specific client

#### 4.4.3 Get Metrics Summary
- **Endpoint**: `GET /api/metrics/:clientId/summary`
- **Controller**: `routes/metricRoutes.js:98-134`
- **Purpose**: Get aggregated metrics by period (daily/weekly/monthly)

## 5. Application Architecture

### 5.1 Server Configuration (`server.js`)
- **Port**: Environment variable `PORT` or default 3000
- **Middleware Stack**:
  - JSON body parsing (`express.json()`)
  - CORS enabling
  - Custom rate limiting
  - Request logging
  - Error handling

### 5.2 Middleware Components

#### 5.2.1 Validation Middleware (`middleware/validation.js`)
- **Metrics Validation**: Validates client metrics submissions
- **Error Handling**: Standardized validation error responses
- **Rate Limiting**: Configurable request throttling

#### 5.2.2 Security Features
- **Rate Limiting**: 100 requests per 15-minute window (configurable)
- **Input Validation**: Express-validator integration
- **Error Handling**: Centralized error processing

### 5.3 File System Components

#### 5.3.1 Wallpaper Management
- **Storage Location**: `data/wallpaper.json`
- **Default Value**: Unsplash image URL
- **File Management**: Automatic directory creation and initialization

## 6. Deployment and Infrastructure

### 6.1 Docker Configuration
- **Apache Container**: Separate Apache server for static content
- **Base Image**: Ubuntu with Apache2
- **Custom Page**: Branded landing page
- **Port Exposure**: Port 80 for web access

### 6.2 Environment Configuration
Required environment variables:
- `DB_USER`: PostgreSQL username
- `DB_HOST`: Database host address
- `DB_NAME`: Database name
- `DB_PASSWORD`: Database password
- `DB_PORT`: Database port
- `PORT`: Application server port
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## 7. Data Flow and Usage Patterns

### 7.1 Device Registration Flow
1. Device sends registration request with hostname and device name
2. Server validates input and creates device record
3. Unique device ID returned for future operations

### 7.2 Usage Tracking Flow
1. Client devices periodically send usage data
2. Server aggregates data by day/user/system combination
3. Location data optionally captured for asset tracking
4. Historical data maintained for reporting

### 7.3 Configuration Management Flow
1. Administrator updates wallpaper through API
2. Changes stored in file system
3. Devices poll for configuration updates
4. Commands queued for device execution

## 8. Security Considerations

### 8.1 Input Validation
- All API endpoints validate required parameters
- Type checking for numeric and date values
- SQL injection prevention through parameterized queries

### 8.2 Rate Limiting
- Configurable request throttling
- Per-client tracking and limiting
- DoS attack mitigation

### 8.3 Data Protection
- Environment-based configuration management
- Database connection pooling for security
- No sensitive data in repository (`.env` files excluded)

## 9. Performance Characteristics

### 9.1 Database Optimization
- Connection pooling for efficient resource usage
- Indexed primary keys for fast lookups
- Transaction support for data consistency

### 9.2 Scalability Features
- Bulk operations for high-volume data sync
- Efficient date-based filtering
- Aggregation queries for reporting

## 10. Future Enhancement Opportunities

### 10.1 Missing Tables Implementation
- Complete implementation of Commands table schema
- Full Metrics table with proper indexing
- User management and authentication system

### 10.2 Advanced Features
- Real-time device status monitoring
- Advanced reporting and analytics dashboard
- Mobile device support
- Integration with Active Directory/LDAP

### 10.3 Infrastructure Improvements
- Containerized database deployment
- Load balancing for high availability
- Automated backup and recovery systems
- Monitoring and alerting integration

## 11. Technical Debt and Recommendations

### 11.1 Current Limitations
- Inconsistent model implementations (some missing database schemas)
- File-based storage for wallpaper settings (should be database-driven)
- Limited error handling in some controllers
- Missing authentication and authorization

### 11.2 Recommended Improvements
1. Implement complete database schema for all referenced tables
2. Add comprehensive logging and monitoring
3. Implement proper authentication/authorization
4. Add automated testing suite
5. Complete Docker compose configuration for full-stack deployment
6. Add API documentation (OpenAPI/Swagger)
7. Implement proper configuration management