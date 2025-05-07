# Auto Parts POS Database Seeder

This script will populate your database with consistent dummy data for your auto parts POS system.

## What the Seed Script Adds

The seed script will create:

- Business settings for "AutoParts Plus"
- 7 auto parts suppliers with various payment terms (2 with today's orders)
- 25 inventory items across categories like Filters, Brakes, Electrical, Cooling, etc.
- Various inventory stock levels (In Stock, Low Stock, Out of Stock)
- 18 expense records including today's expenses with detailed descriptions
- 30+ sales transactions including today's morning and afternoon sales
- Realistic cash drawer operations (initialization, sales, expenses, counts, cash additions)

## How to Run

1. Make sure MongoDB is running and your `.env` file contains a valid `MONGODB_URI` connection string
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Run the seed script:
   ```
   node seedData.js
   ```

## Data Features

- **Today's Transactions**: Includes today's sales and expenses with realistic timestamps
- **Stock Status**: Some items are marked as "Out of Stock" or "Low Stock" based on inventory levels
- **Realistic Timeline**: Data spans the last 30 days with proper historical patterns
- **Consistent References**: Cash drawer entries properly reference sales and expenses
- **Smart Item Selection**: Today's sales use common items with morning/afternoon patterns
- **Cash Management**: Includes cash drawer counts, additions, and transaction tracking

## General Features

- The script is idempotent - running it multiple times won't duplicate data
- It uses your existing user (or creates one if none exists)
- All generated data is linked to the user and follows a realistic pattern for an auto parts store
- Maintains data consistency across models (sales reduce inventory, expenses affect cash drawer, etc.)

## Customization

You can customize the seed data by modifying the arrays in the script:
- Add or modify inventory items in the `inventoryItems` array
- Change supplier details in the `suppliers` array
- Add expense categories and descriptions in the `expenseCategories` array
- Adjust the number of transactions by changing the loop counts

## Data Clearing (Optional)

If you need to clear existing data before seeding, uncomment the `deleteMany` section at the beginning of the script. Be careful as this will delete all existing data in those collections. 