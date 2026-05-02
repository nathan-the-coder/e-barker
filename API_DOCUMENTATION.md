# E-Barker API Documentation

Complete reference for the E-Barker REST API - PUV Van Dispatching System for Baggao, Cagayan.

---

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

---

## Authentication

Most endpoints require authentication via JWT (JSON Web Token).

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

**Getting a Token:**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Juan Dela Cruz",
    "role": "driver"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Endpoints

### Authentication

#### POST `/auth/register`
Register a new user.

**Request Body:**
```json
{
  "username": "newdriver",
  "email": "driver@example.com",
  "password": "securepass123",
  "name": "Juan Dela Cruz",
  "phone": "09123456789",
  "role": "driver"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": 1,
    "username": "newdriver",
    "email": "driver@example.com",
    "name": "Juan Dela Cruz",
    "role": "driver"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Missing required fields or username/email already exists
- `500` - Internal server error

---

#### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "driver@example.com",
  "password": "securepass123"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": 1, "email": "driver@example.com", "role": "driver" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` - Invalid credentials
- `500` - Internal server error

---

#### POST `/auth/google`
Login/Register with Google OAuth.

**Request Body:**
```json
{
  "googleId": "12345678901234567890",
  "email": "user@gmail.com",
  "name": "Juan Dela Cruz"
}
```

**Response:** `200 OK` (existing user) or `201 Created` (new user)
```json
{
  "user": { "id": 1, "email": "user@gmail.com", "role": "driver" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### GET `/auth/me`
Get current authenticated user details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Juan Dela Cruz",
    "role": "driver"
  }
}
```

---

### Queue Management

#### GET `/queue/active`
Get active queue in FIFO order (Waiting status).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "queue": [
    {
      "id": 1,
      "driver_id": 3,
      "driver_name": "Ricardo Dalisay",
      "vehicle_id": 5,
      "body_number": "001",
      "status": "Waiting",
      "check_in_time": "2026-04-28T10:15:00.000Z"
    }
  ]
}
```

---

#### GET `/queue/recent`
Get recently dispatched drivers (on-trip, last 5).

**Response:** `200 OK`
```json
{
  "queue": [
    {
      "id": 1,
      "driver_id": 3,
      "driver_name": "Ricardo Dalisay",
      "status": "on-trip",
      "dispatch_time": "2026-04-28T10:30:00.000Z"
    }
  ]
}
```

---

#### GET `/queue/my-status?driver_id=3`
Get a driver's current queue status.

**Response:** `200 OK`
```json
{
  "status": {
    "id": 1,
    "driver_id": 3,
    "vehicle_id": 5,
    "body_number": "001",
    "status": "Waiting",
    "check_in_time": "2026-04-28T10:15:00.000Z"
  }
}
```
Returns `{"status": null}` if driver not in queue.

---

#### POST `/queue/join`
Driver checks in to the queue.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "driver_id": 3,
  "vehicle_id": 5
}
```

**Response:** `201 Created`
```json
{
  "entry": {
    "id": 10,
    "driver_id": 3,
    "vehicle_id": 5,
    "status": "Waiting",
    "check_in_time": "2026-04-28T10:15:00.000Z"
  },
  "position": 3,
  "message": "Successfully joined queue at position 3"
}
```

**Response:** `201 Created`
```json
{
  "entry": {
    "id": 1,
    "driver_id": 3,
    "driver_name": "Ricardo Dalisay",
    "status": "Waiting",
    "check_in_time": "2026-04-28T10:15:00.000Z"
  }
}
```

**Errors:**
- `400` - Driver already in queue or missing driver_id

---

#### POST `/queue/dispatch/:id`
Dispatch a driver (Dispatcher only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "estimated_time_minutes": 25
}
```

**Response:** `200 OK`
```json
{
  "entry": {
    "id": 1,
    "driver_id": 3,
    "status": "on-trip",
    "dispatch_time": "2026-04-28T10:30:00.000Z",
    "estimated_arrival_time": 25
  }
}
```
*Also logs ₱10.00 (or configured amount) to transactions table.*

**Errors:**
- `404` - Queue entry not found or not in "Waiting" status

---

#### POST `/queue/complete/:id`
Complete a trip (Driver).

**Response:** `200 OK`
```json
{
  "message": "Trip completed successfully"
}
```
*Automatically re-enters driver at bottom of queue with "Waiting" status.*

---

#### GET `/queue/history`
Get queue history with filters.

**Query Parameters:**
- `date` (optional) - Filter by date (YYYY-MM-DD)
- `driver_id` (optional) - Filter by driver
- `status` (optional) - Filter by status

**Response:** `200 OK`
```json
{
  "history": [
    {
      "id": 1,
      "driver_id": 3,
      "driver_name": "Ricardo Dalisay",
      "status": "completed",
      "check_in_time": "2026-04-28T10:15:00.000Z",
      "completed_time": "2026-04-28T11:00:00.000Z"
    }
  ]
}
```

---

#### GET `/queue/stats`
Get queue statistics.

**Query Parameters:**
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "stats": {
    "total_trips": 150,
    "completed_trips": 120,
    "waiting_count": 5,
    "on_trip_count": 3,
    "avg_trip_duration": 45.5
  }
}
```

---

#### GET `/queue/traffic`
Get traffic data (Google Maps integration).

**Query Parameters:**
- `origin` - Starting point
- `destination` - End point

**Response:** `200 OK`
```json
{
  "traffic": {
    "origin": "Terminal A",
    "destination": "Market",
    "duration_in_traffic": "25 mins",
    "distance": "8.5 km",
    "congestion_level": "moderate"
  }
}
```
*Note: This is a placeholder. Integrate with Google Maps Distance Matrix API for live data.*

---

### Transactions

#### GET `/transactions/today`
Get today's transactions.

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "id": 1,
      "driver_id": 3,
      "driver_name": "Ricardo Dalisay",
      "fee_amount": "10.00",
      "transaction_time": "2026-04-28T10:30:00.000Z"
    }
  ],
  "total": "450.00"
}
```

---

#### GET `/transactions?start_date=2026-04-01&end_date=2026-04-30`
Get transactions by date range.

**Query Parameters:**
- `date` - Single date (YYYY-MM-DD)
- `start_date` - Start date (YYYY-MM-DD)
- `end_date` - End date (YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "transactions": [...]
}
```

---

### Users (Admin Only)

#### GET `/users`
Get all users.

**Headers:**
```
Authorization: Bearer <token>
Required Role: admin
```

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": 1,
      "username": "driver1",
      "email": "driver@example.com",
      "name": "Juan Dela Cruz",
      "phone": "09123456789",
      "role": "driver",
      "body_number": "4022"
    }
  ]
}
```

---

#### POST `/users`
Create a new user (Admin only).

**Request Body:**
```json
{
  "username": "newdriver",
  "email": "new@example.com",
  "password": "securepass123",
  "name": "New Driver",
  "phone": "09987654321",
  "role": "driver"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": 2,
    "username": "newdriver",
    "email": "new@example.com",
    "name": "New Driver",
    "role": "driver"
  }
}
```

---

#### PUT `/users/:id`
Update a user (Admin only).

**Request Body:**
```json
{
  "username": "updated_driver",
  "email": "updated@example.com",
  "name": "Updated Name",
  "phone": "09111111111"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": 1, "username": "updated_driver", ... }
}
```

---

#### DELETE `/users/:id`
Deactivate a user (Admin only).

**Response:** `200 OK`
```json
{
  "message": "User deactivated successfully"
}
```
*Note: This sets the user's role to "inactive" rather than deleting.*

---

### Tricycles (Admin Only)

#### GET `/tricycles`
Get all tricycles.

**Response:** `200 OK`
```json
{
  "tricycles": [
    {
      "id": 1,
      "body_number": "4022",
      "plate_number": "ABC-1234",
      "driver_id": 3,
      "driver_name": "Ricardo Dalisay",
      "model": "Honda TMX 155",
      "year": 2022,
      "is_active": true
    }
  ]
}
```

---

#### POST `/tricycles`
Create a new tricycle (Admin only).

**Request Body:**
```json
{
  "body_number": "4022",
  "plate_number": "ABC-1234",
  "model": "Honda TMX 155",
  "year": 2022
}
```

**Response:** `201 Created`

---

#### POST `/tricycles/:id/assign`
Assign tricycle to a driver.

**Request Body:**
```json
{
  "driver_id": 3
}
```

**Response:** `200 OK`
```json
{
  "message": "Tricycle assigned successfully"
}
```

---

### Settings (Admin Only)

#### GET `/settings`
Get all settings.

**Response:** `200 OK`
```json
{
  "settings": {
    "terminal_fee": "10.00",
    "terminal_name": "E-Barker Terminal",
    "google_maps_api_key": "AIzaSy..."
  }
}
```

---

#### PUT `/settings/:key`
Update a setting.

**Request Body:**
```json
{
  "value": "15.00"
}
```

**Response:** `200 OK`
```json
{
  "message": "Setting updated successfully"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or missing fields |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions (wrong role) |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Something went wrong |

---

## Rate Limiting

Currently, no rate limiting is implemented. For production, consider adding:
- `express-rate-limit` package
- Limit: 100 requests per 15 minutes per IP

---

## Testing the API

### Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com","password":"securepass123"}'

# Use the token for authenticated requests
curl http://localhost:3000/api/queue/active \
  -H "Authorization: Bearer <your_token>"
```

### Using Postman

1. Import the API endpoints
2. Set `Content-Type: application/json` header
3. For protected endpoints, add `Authorization: Bearer <token>` header
4. Send requests and inspect responses

---

**For more examples and tutorials, visit the project repository or contact the development team.**
