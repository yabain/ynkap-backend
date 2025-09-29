const { MongoClient } = require('mongodb');

async function fixTicketPriorities() {
  const uri = 'mongodb://localhost:27017'; // Update with your MongoDB connection string
  const dbName = 'ynkap'; // Update with your database name
  
  const client = new MongoClient(uri);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db(dbName);
    const ticketsCollection = db.collection('tickets');
    
    console.log('🔍 Finding tickets with invalid priority values...');
    
    // Find tickets with invalid priority values (0, null, undefined, or not in enum)
    const invalidTickets = await ticketsCollection.find({
      $or: [
        { priority: 0 },
        { priority: null },
        { priority: { $exists: false } },
        { priority: { $nin: ['High', 'Medium', 'Low'] } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${invalidTickets.length} tickets with invalid priority values`);
    
    if (invalidTickets.length === 0) {
      console.log('✅ No tickets need priority migration');
      return;
    }
    
    // Update all invalid tickets to have 'Low' priority
    const result = await ticketsCollection.updateMany(
      {
        $or: [
          { priority: 0 },
          { priority: null },
          { priority: { $exists: false } },
          { priority: { $nin: ['High', 'Medium', 'Low'] } }
        ]
      },
      {
        $set: { priority: 'Low' }
      }
    );
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Updated ${result.modifiedCount} tickets`);
    
    // Verify the fix
    const remainingInvalid = await ticketsCollection.find({
      $or: [
        { priority: 0 },
        { priority: null },
        { priority: { $exists: false } },
        { priority: { $nin: ['High', 'Medium', 'Low'] } }
      ]
    }).count();
    
    console.log(`🔍 Remaining invalid tickets: ${remainingInvalid}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

fixTicketPriorities();