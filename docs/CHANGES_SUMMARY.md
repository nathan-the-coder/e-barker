# E-Barker System Modification Summary

## Overview
Modified the E-Barker Digital Dispatching System to focus on **PUV Vans** operating in **Baggao, Cagayan** instead of tricycles in Danao City, Cebu.

## Key Changes Made

### 1. Backend Changes

#### New Vehicle Model (`backend/models/Vehicle.js`)
- Created new model replacing Tricycle model
- Added fields: `vehicleType` (PUV Van, Mini Bus, Jeepney), `capacity` (default 14)
- Maintains `bodyNumber`, `plateNumber`, `driverId`, `model`, `year`, `isActive`

#### Updated Queue Model (`backend/models/Queue.js`)
- Changed `tricycleId` reference to `vehicleId`
- Now references `Vehicle` model instead of `Tricycle`

#### Updated User Model (`backend/models/User.js`)
- Changed `tricycleId` reference to `vehicleId`
- Now references `Vehicle` model instead of `Tricycle`

#### New Vehicles Route (`backend/routes/vehicles.js`)
- Replaces `tricycles.js`
- All endpoints now manage PUV Vans
- Includes vehicle type and capacity in responses

#### Updated Queue Routes (`backend/routes/queue.js`)
- All references to `tricycleId` changed to `vehicleId`
- Updated populate statements to show `vehicleId.bodyNumber` and `vehicleId.vehicleType`
- Join queue now accepts `vehicle_id` instead of `tricycle_id`
- Dispatch and register trip updated accordingly

#### Updated Backend Index (`backend/index.js`)
- Changed import from `tricycleRoutes` to `vehicleRoutes`
- Updated route from `/api/tricycles` to `/api/vehicles`

### 2. Frontend Changes

#### DispatcherDashboard (`frontend/src/pages/DispatcherDashboard.jsx`)
- Changed terminal location from "Sto. Tomas Terminal, Danao City, Cebu" to "Baggao Terminal, Baggao, Cagayan"
- Changed main destination from "Danao City Public Market, Cebu" to "Tuguegarao City, Cagayan"
- Updated all references from "🛺" (tricycle emoji) to "🚐" (van emoji)
- Changed `tricycleId` references to `vehicleId`
- Updated display to show vehicle body number and type

#### MapsPage (`frontend/src/pages/MapsPage.jsx`)
- Changed map center from Danao City, Cebu (10.5222, 124.0029) to Baggao, Cagayan (17.9483, 121.7886)
- Updated placeholder text from "Danao Terminal" to "Baggao Terminal"
- Updated placeholder text from "Danao City Market" to "Tuguegarao City"
- Changed emoji from "🛺" to "🚐"

#### DriverPage (`frontend/src/pages/DriverPage.jsx`)
- Updated join queue to use `vehicleId` instead of `tricycleId`
- Changed display from "Tricycle" to "Vehicle"
- Updated emoji from "🛺" to "🚐"
- Updated queue list to show `vehicleId.bodyNumber`

#### API Utilities (`frontend/src/utils/api.js`)
- Updated `queueAPI.join()` to accept `vehicleId` parameter
- Updated `queueAPI.registerTrip()` to accept `vehicleId` parameter
- Renamed `tricycleAPI` to `vehicleAPI`

#### Legacy JS Files
- Updated `frontend/src/api.js` - renamed `tricycleAPI` to `vehicleAPI`
- Updated `frontend/src/admin.js` - changed to use `vehicleAPI`, updated table columns to show vehicle type
- Updated `frontend/src/driver.js` - updated join queue to use `vehicleId`
- Updated `frontend/src/maps.js` - changed map center to Baggao, Cagayan

#### Index HTML (`frontend/index.html`)
- Updated title from "E-Barker | Dispatcher Terminal" to "E-Barker | Baggao PUV Van Dispatch"

### 3. Documentation Updates

#### README.md
- Updated description to mention PUV Van operations in Baggao, Cagayan
- Updated project structure to show `Vehicle.js` instead of `Tricycle.js`
- Updated routes list to show `vehicles.js`
- Updated user roles descriptions for Baggao context

#### API_DOCUMENTATION.md
- Updated title to reference PUV Van Dispatching System for Baggao, Cagayan
- Updated queue response examples to include `vehicle_id` and `body_number`
- Updated join queue request body to use `vehicle_id`

#### DEFENCE_TIPS.md
- Updated elevator pitch to mention PUV Vans in Baggao, Cagayan
- Updated key statistics to show "vehicles" instead of "tricycles"
- Updated database schema examples to use `vehicleId`
- Added service area information

#### USER_MANUAL.md
- Updated admin section to reference "Terminal Managers" instead of "TODA Officers"
- Changed "Tricycles Tab" to "Vehicles Tab" with PUV Van details
- Updated driver section to reference PUV Vans
- Updated vehicle management instructions

## Route Changes
- **From**: Danao City, Cebu (Sto. Tomas Terminal ↔ Danao City Public Market)
- **To**: Baggao, Cagayan (Baggao Terminal ↔ Tuguegarao City and other Cagayan destinations)

## Vehicle Type Changes
- **From**: Tricycles
- **To**: PUV Vans (with support for Mini Bus and Jeepney)

## Database Migration Notes
When deploying these changes, you may need to:
1. Create the new `vehicles` collection
2. Migrate any existing `tricycles` data to `vehicles` collection
3. Update `users` collection to change `tricycleId` to `vehicleId`
4. Update `queues` collection to change `tricycleId` to `vehicleId`

## Testing Recommendations
1. Test vehicle registration with different vehicle types
2. Test queue operations with PUV Vans
3. Verify map shows Baggao, Cagayan correctly
4. Test route calculations between Baggao and Tuguegarao City
5. Verify all API endpoints work with new vehicle references
