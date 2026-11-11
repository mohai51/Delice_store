const mongoose = require('mongoose');

// In-Memory store for offline / unconfigured database fallback
const memoryStore = {
  orders: [],
  products: [],
  expenses: [],
  allocations: [],
  settings: {}
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/delice_fragrance';
  
  // Set bufferCommands to false so operations fail fast if no DB is available
  mongoose.set('bufferCommands', false);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`\n[MongoDB Notice] Could not connect to MongoDB at "${uri}".`);
    console.warn(`[MongoDB Notice] The DÉLICE system is running with In-Memory Active Fallback.`);
    console.warn(`[MongoDB Guidance] To connect permanent database, update MONGODB_URI in .env with your MongoDB Atlas connection string.\n`);
    return null;
  }
};

module.exports = connectDB;
module.exports.memoryStore = memoryStore;
module.exports.isConnected = () => mongoose.connection.readyState === 1;
