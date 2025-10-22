# RMS Server - Comprehensive Feature Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Feature Documentation](#feature-documentation)
   - [Device Management](#device-management)
   - [Software Management](#software-management)
   - [Laptop Tracking](#laptop-tracking)
   - [Wallpaper Management](#wallpaper-management)
   - [Metrics Collection](#metrics-collection)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Internal Implementation Details](#internal-implementation-details)

---

## System Overview

The RMS (Remote Management System) Server is a Node.js-based backend system designed for centralized management and monitoring of Windows devices. It provides device registration, usage tracking, software management, and remote configuration capabilities.

**Technology Stack:**
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with connection pooling
- **Dependencies**: pg, cors, axios, body-parser, dotenv
- **Development**: Nodemon for hot-reloading

---

## Architecture

### Server Structure
```
windows-rms-server/
├── server.js                 # Main application entry point
├── config/
│   └── database.js          # Database configuration and initialization
├── controllers/              # Business logic handlers
│   ├── deviceController.js
│   ├── softwareController.js
│   ├── wallpaperController.js
│   └── laptopTrackingController.js
├── routes/                   # API endpoint definitions
│   ├── deviceRoutes.js
│   ├── softwareRoutes.js
│   ├── wallpaperRoutes.js
│   ├── laptopTrackingRoutes.js
│   └── metricRoutes.js
├── models/                   # Data access layer
│   ├── deviceModel.js
│   ├── softwareModel.js
│   ├── commandModel.js
│   └── wallpaperModel.js
├── middleware/
│   └── validation.js         # Input validation and error handling
└── data/
    └── wallpaper.json        # File-based wallpaper storage
```

### Middleware Stack
1. **express.json()** - JSON body parsing
2. **cors()** - Cross-origin resource sharing
3. **rateLimiter** - Request throttling (100 req/15min)
4. **logger** - Request logging middleware
5. **errorHandler** - Centralized error handling

---

## Feature Documentation

## Device Management

### Feature Overview
Device Management handles the registration and tracking of Windows devices in the RMS system. It provides unique device identification through serial numbers and MAC addresses, enabling centralized device inventory management.

### Technical Flow
1. **Device Registration**: Client sends device details → Server validates input → Checks for existing device → Creates new record or returns existing
2. **Device Retrieval**: Query by serial number → Database lookup → Return device information
3. **Device Listing**: Fetch all devices → Return complete device inventory

### Key APIs / Endpoints

#### POST /api/devices
- **Purpose**: Register a new device
- **Request Body**:
  ```json
  {
    "username": "string",
    "serial_number": "string",
    "mac_address": "string", 
    "location": "string"
  }
  ```
- **Response**: Device object with auto-generated ID
- **Validation**: All fields required, serial_number must be unique

#### GET /api/devices
- **Purpose**: Retrieve all registered devices
- **Response**: Array of device objects
- **No authentication required**

#### GET /api/devices/serial/:serial_number
- **Purpose**: Get device by serial number
- **Parameters**: serial_number (path parameter)
- **Response**: Single device object or 404

### Core Logic
**File**: `controllers/deviceController.js`

- **registerDevice()**: Validates input, checks for duplicates, creates device record
- **getAllDevices()**: Fetches complete device inventory
- **getDeviceBySerialNumber()**: Looks up device by unique serial number

### Database Involvement
**Table**: `devices`
- **Primary Key**: `id` (SERIAL)
- **Unique Constraint**: `serial_number`
- **Foreign Key Relationships**: Referenced by `laptop_tracking.device_id` and `softwares_installed.device_id`

### Example Use Case
```javascript
// Device registration flow
POST /api/devices
{
  "username": "john.doe",
  "serial_number": "ABC123456789",
  "mac_address": "00:1B:44:11:3A:B7",
  "location": "Office Floor 2"
}

// Response
{
  "id": 1,
  "username": "john.doe",
  "serial_number": "ABC123456789",
  "mac_address": "00:1B:44:11:3A:B7",
  "location": "Office Floor 2",
  "created_at": "2024-01-22T10:30:00.000Z"
}
```

---

## Software Management

### Feature Overview
Software Management tracks software installation status across devices and maintains a centralized software inventory. It determines which software packages need to be installed on specific devices based on installation history.

### Technical Flow
1. **Software Inventory**: Maintains master list of available software packages
2. **Installation Tracking**: Records installation attempts and success/failure status
3. **Missing Software Detection**: Compares available software against installation history to identify missing packages
4. **Installation History**: Logs all installation attempts with success/failure status

### Key APIs / Endpoints

#### GET /api/softwares/notInstalled
- **Purpose**: Get list of software not yet successfully installed on a device
- **Query Parameters**: `serial_number` (required)
- **Response**: Array of software names that need installation
- **Logic**: Returns software where no successful installation exists

#### POST /api/softwares/addHistory
- **Purpose**: Record software installation attempt
- **Request Body**:
  ```json
  {
    "serial_number": "string",
    "software_name": "string",
    "isSuccessful": boolean
  }
  ```
- **Response**: Installation history record

### Core Logic
**File**: `controllers/softwareController.js`

- **getNotInstalledSoftwares()**: 
  - Fetches all available software from `softwares` table
  - Gets installation history for device from `softwares_installed` table
  - Filters out software with successful installations
  - Returns software names that need installation

- **addHistory()**: Records installation attempt with success/failure status

### Database Involvement
**Tables**: 
- `softwares` - Master software inventory
- `softwares_installed` - Installation history per device

**Relationships**:
- `softwares_installed.device_id` → `devices.id`
- Software names matched between tables

### Example Use Case
```javascript
// Check what software needs to be installed
GET /api/softwares/notInstalled?serial_number=ABC123456789

// Response
["obs-studio.portable", "brave", "atom"]

// Record installation attempt
POST /api/softwares/addHistory
{
  "serial_number": "ABC123456789",
  "software_name": "brave",
  "isSuccessful": true
}
```

---

## Laptop Tracking

### Feature Overview
Laptop Tracking is the core feature for monitoring device usage patterns. It collects and aggregates daily usage data including active time, location information, and user activity across multiple devices.

### Technical Flow
1. **Data Collection**: Client devices send usage data (active time, location, timestamp)
2. **Daily Aggregation**: Server aggregates data by device and date
3. **Location Tracking**: Optional GPS coordinates and location names
4. **Data Synchronization**: Supports both individual and bulk data sync
5. **Historical Reporting**: Provides filtered access to usage data

### Key APIs / Endpoints

#### POST /api/tracking/sync
- **Purpose**: Sync individual device usage data
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
- **Response**: Sync confirmation with tracking ID

#### POST /api/tracking/bulk-sync
- **Purpose**: Bulk synchronization of multiple records
- **Request Body**:
  ```json
  {
    "records": [
      {
        "username": "string",
        "system_id": "string",
        "mac_address": "string", 
        "serial_number": "string",
        "total_time": "integer",
        "latitude": "decimal",
        "longitude": "decimal",
        "location_name": "string",
        "date": "ISO string",
        "last_updated": "ISO string"
      }
    ]
  }
  ```
- **Features**: Transaction-based processing with rollback on errors

#### GET /api/tracking/usage/:device_id
- **Purpose**: Get daily usage statistics for specific device
- **Query Parameters**: `start_date`, `end_date` (optional)
- **Response**: Array of daily usage records

#### GET /api/tracking/all
- **Purpose**: Get all tracking data with optional date filtering
- **Query Parameters**: `start_date`, `end_date` (optional)
- **Response**: Complete tracking dataset

#### GET /api/tracking/system/:device_id
- **Purpose**: Get tracking data for specific system
- **Response**: System-specific usage data

#### GET /api/tracking/serial/:serial_number
- **Purpose**: Get tracking data by device serial number
- **Response**: Device-specific usage data

### Core Logic
**File**: `controllers/laptopTrackingController.js`

- **syncLaptopData()**: 
  - Validates required fields
  - Looks up device_id from serial_number
  - Checks for existing daily record
  - Updates existing record or creates new one
  - Handles time accumulation logic

- **bulkSyncLaptopData()**:
  - Processes multiple records in transaction
  - Validates each record
  - Updates or inserts records
  - Provides rollback on errors

- **getDailyUsage()**: Retrieves usage data with date filtering
- **getAllData()**: Returns complete dataset with optional filtering
- **getSystemData()**: System-specific data retrieval
- **getSerialNumberData()**: Serial number-based data retrieval

### Database Involvement
**Table**: `laptop_tracking`
- **Primary Key**: `id` (SERIAL)
- **Foreign Key**: `device_id` → `devices.id`
- **Indexes**: Date-based queries for performance
- **Aggregation**: Daily aggregation by device and date

### Example Use Case
```javascript
// Sync daily usage data
POST /api/tracking/sync
{
  "username": "john.doe",
  "system_id": "LAPTOP001",
  "mac_address": "00:1B:44:11:3A:B7",
  "serial_number": "ABC123456789",
  "active_time": 28800,
  "latitude": 28.6139,
  "longitude": 77.2090,
  "location_name": "New Delhi Office"
}

// Response
{
  "message": "Laptop tracking data created successfully",
  "tracking_id": 1,
  "total_active_time": 28800
}

// Retrieve usage data
GET /api/tracking/usage/1?start_date=2024-01-01&end_date=2024-01-31
```

---

## Wallpaper Management

### Feature Overview
Wallpaper Management provides centralized control over device wallpapers. It uses file-based storage to maintain the current wallpaper URL and allows remote updates across all managed devices.

### Technical Flow
1. **Wallpaper Storage**: Current wallpaper URL stored in `data/wallpaper.json`
2. **File Management**: Automatic directory creation and file initialization
3. **URL Validation**: Validates wallpaper URL format
4. **Remote Updates**: Allows administrators to update wallpaper centrally

### Key APIs / Endpoints

#### GET /api/wallpaper
- **Purpose**: Retrieve current wallpaper URL
- **Response**: Current wallpaper URL
- **Storage**: File-based (`data/wallpaper.json`)

#### POST /api/wallpaper
- **Purpose**: Update system wallpaper URL
- **Request Body**:
  ```json
  {
    "wallpaper": "string (URL)"
  }
  ```
- **Validation**: URL format validation
- **Response**: Update confirmation

### Core Logic
**File**: `controllers/wallpaperController.js`

- **getWallpaper()**: 
  - Ensures data directory exists
  - Reads wallpaper.json file
  - Returns current wallpaper URL

- **updateWallpaper()**:
  - Validates input URL
  - Writes new URL to wallpaper.json
  - Returns success confirmation

- **ensureDataDirExists()**: Creates directory and initializes file if needed

### Database Involvement
**Storage**: File-based (`data/wallpaper.json`)
- **No database tables** - Uses filesystem for simplicity
- **Default Value**: Unsplash image URL
- **File Format**: JSON with wallpaper URL

### Example Use Case
```javascript
// Get current wallpaper
GET /api/wallpaper

// Response
{
  "wallpaper": "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
}

// Update wallpaper
POST /api/wallpaper
{
  "wallpaper": "https://example.com/new-wallpaper.jpg"
}

// Response
{
  "message": "Wallpaper updated successfully",
  "wallpaper": "https://example.com/new-wallpaper.jpg"
}
```

---

## Metrics Collection

### Feature Overview
Metrics Collection gathers detailed system performance data from client devices. It tracks session information, system resources, and provides aggregated reporting capabilities.

### Technical Flow
1. **Data Collection**: Client devices send metrics data
2. **Session Tracking**: Monitors session start/end times and duration
3. **System Monitoring**: Collects CPU, memory, and system information
4. **Data Storage**: Stores metrics in database with client identification
5. **Aggregation**: Provides daily/weekly/monthly summaries

### Key APIs / Endpoints

#### POST /api/metrics/:clientId
- **Purpose**: Store detailed system metrics
- **Parameters**: `clientId` (path parameter)
- **Request Body**:
  ```json
  {
    "systemId": "string",
    "timestamp": "ISO string",
    "session": {
      "startTime": "ISO string",
      "endTime": "ISO string",
      "totalDuration": "integer",
      "duration": {
        "milliseconds": "integer"
      }
    },
    "location": {
      "hostname": "string",
      "computerName": "string", 
      "domain": "string"
    },
    "system": {
      "memory": {
        "usagePercent": "number"
      },
      "cpu": {
        "loadAvg": ["number"]
      }
    },
    "type": "string"
  }
  ```
- **Validation**: Uses express-validator middleware
- **Response**: Confirmation of data storage

#### GET /api/metrics/:clientId
- **Purpose**: Retrieve metrics for specific client
- **Query Parameters**: `from`, `to` (optional date range)
- **Response**: Array of metrics records

#### GET /api/metrics/:clientId/summary
- **Purpose**: Get aggregated metrics by period
- **Query Parameters**: `period` (daily/weekly/monthly)
- **Response**: Aggregated statistics

### Core Logic
**File**: `routes/metricRoutes.js`

- **Metrics Storage**:
  - Handles both SESSION_END and regular metrics
  - Stores session duration, system info, and performance data
  - Uses parameterized queries for security

- **Data Retrieval**:
  - Supports date range filtering
  - Returns ordered results by timestamp

- **Aggregation**:
  - Groups data by time periods
  - Calculates averages and maximums
  - Supports daily, weekly, monthly aggregation

### Database Involvement
**Table**: `metrics` (referenced but schema not fully defined)
- **Expected Columns**: client_id, system_id, timestamp, session_start, session_duration, hostname, computer_name, domain, memory_usage, cpu_load, metrics_data
- **Indexes**: client_id, timestamp for performance

### Example Use Case
```javascript
// Store metrics data
POST /api/metrics/client001
{
  "systemId": "LAPTOP001",
  "timestamp": "2024-01-22T10:30:00.000Z",
  "session": {
    "startTime": "2024-01-22T09:00:00.000Z",
    "endTime": "2024-01-22T10:30:00.000Z",
    "totalDuration": 5400
  },
  "location": {
    "hostname": "JOHN-LAPTOP",
    "computerName": "JOHN-LAPTOP",
    "domain": "OFFICE"
  },
  "system": {
    "memory": {
      "usagePercent": 65.5
    },
    "cpu": {
      "loadAvg": [0.8, 0.9, 0.7]
    }
  },
  "type": "SESSION_END"
}

// Get aggregated summary
GET /api/metrics/client001/summary?period=daily

// Response
[
  {
    "period": "2024-01-22T00:00:00.000Z",
    "metric_count": 5,
    "avg_memory_usage": 62.3,
    "avg_cpu_load": 0.75,
    "max_memory_usage": 78.2,
    "max_cpu_load": 0.95
  }
]
```

---

## Database Schema

### Tables Overview

#### devices
```sql
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    mac_address VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### laptop_tracking
```sql
CREATE TABLE laptop_tracking (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    total_active_time INTEGER NOT NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    location_name VARCHAR(255),
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

#### softwares
```sql
CREATE TABLE softwares (
    id SERIAL PRIMARY KEY,
    software_name VARCHAR(255) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### softwares_installed
```sql
CREATE TABLE softwares_installed (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL,
    software_name VARCHAR(255) NOT NULL,
    isSuccessful BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

### Database Initialization
**File**: `config/database.js`

- **Connection Pool**: PostgreSQL connection pooling for performance
- **Auto-initialization**: Creates tables on server startup
- **Software Seeding**: Pre-populates software inventory
- **Error Handling**: Comprehensive error handling and logging

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication
- **Current Status**: No authentication implemented
- **Security**: Rate limiting (100 requests/15 minutes)
- **Validation**: Input validation on all endpoints

### Error Responses
```json
{
  "error": "Error message description"
}
```

### Success Responses
- **200**: Successful GET requests
- **201**: Successful POST requests (creation)
- **400**: Bad request (validation errors)
- **500**: Internal server error

---

## Internal Implementation Details

### Server Startup Process
1. **Environment Loading**: Loads configuration from `.env` file
2. **Database Initialization**: Creates tables and seeds data
3. **Middleware Setup**: Configures Express middleware stack
4. **Route Registration**: Registers all API routes
5. **Server Launch**: Starts listening on configured port

### Data Flow Patterns

#### Device Registration Flow
```
Client Request → Validation → Duplicate Check → Database Insert → Response
```

#### Usage Tracking Flow
```
Client Data → Device Lookup → Daily Aggregation → Database Update/Insert → Confirmation
```

#### Software Management Flow
```
Device Query → Software Inventory → Installation History → Missing Software List → Response
```

### Performance Considerations

#### Database Optimization
- **Connection Pooling**: Efficient resource usage
- **Parameterized Queries**: SQL injection prevention
- **Indexed Lookups**: Fast serial number and device_id queries
- **Transaction Support**: Data consistency for bulk operations

#### Caching Strategy
- **File-based Storage**: Wallpaper settings cached in filesystem
- **No Database Caching**: Direct database queries for real-time data

#### Scalability Features
- **Bulk Operations**: Efficient handling of multiple records
- **Date Filtering**: Optimized queries with date ranges
- **Aggregation Queries**: Efficient reporting and analytics

### Security Implementation

#### Input Validation
- **Required Field Validation**: All endpoints validate required parameters
- **Type Checking**: Numeric and date validation
- **SQL Injection Prevention**: Parameterized queries throughout

#### Rate Limiting
- **Request Throttling**: 100 requests per 15-minute window
- **DoS Protection**: Prevents abuse and overload

#### Error Handling
- **Centralized Error Handling**: Consistent error responses
- **Logging**: Request and error logging for debugging
- **Graceful Degradation**: Proper error responses without system exposure

### Development and Deployment

#### Development Setup
- **Nodemon**: Hot-reloading during development
- **Environment Variables**: Configuration management
- **Logging**: Console logging for debugging

#### Production Considerations
- **Docker Support**: Containerized deployment with Apache
- **Environment Configuration**: Secure configuration management
- **Database Connection**: Production-ready PostgreSQL setup

---

## Conclusion

The RMS Server provides a comprehensive backend solution for Windows device management with features spanning device registration, usage tracking, software management, and remote configuration. The system is designed for scalability, security, and maintainability while providing real-time monitoring and management capabilities.

The modular architecture allows for easy extension and maintenance, while the PostgreSQL database provides robust data storage and retrieval capabilities. The API-first design enables integration with various client applications and provides a solid foundation for future enhancements.
