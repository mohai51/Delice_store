const mongoose = require('mongoose');

// In-Memory store for offline / unconfigured database fallback
const memoryStore = {
  orders: [],
  products: [],
  expenses: [],
  allocations: [],
  settings: {}
};

let cachedPromise = null;

const connectDB = async () => {
  // If already connected, return immediately
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection attempt is in-flight, await the existing promise
  if (cachedPromise) {
    return cachedPromise;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/delice_fragrance';

  const opts = {
    bufferCommands: true, // Allow Mongoose to buffer commands safely while connecting
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10
  };

  cachedPromise = mongoose.connect(uri, opts).then((mongooseInstance) => {
    console.log(`[MongoDB] Connected successfully to: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
    return mongooseInstance.connection;
  }).catch(async (error) => {
    // If SRV DNS failed on Windows / local network, retry with direct replica set connection if configured
    const directFallback = process.env.MONGODB_DIRECT_URI;
    if (directFallback && (String(error.message || '').includes('querySrv') || String(error.message || '').includes('ECONNREFUSED'))) {
      try {
        console.log('[MongoDB] Retrying via direct MONGODB_DIRECT_URI replica nodes...');
        const retryInst = await mongoose.connect(directFallback, opts);
        console.log(`[MongoDB] Connected successfully via direct nodes to: ${retryInst.connection.host}/${retryInst.connection.name}`);
        return retryInst.connection;
      } catch (retryErr) {
        console.warn(`[MongoDB Direct Retry Failed] ${retryErr.message}`);
      }
    }
    cachedPromise = null; // Reset so subsequent requests can retry
    console.warn(`\n[MongoDB Notice] Could not connect to MongoDB at "${uri}".`);
    console.warn(`[MongoDB Guidance] Error details: ${error.message}\n`);
    return null;
  });

  return cachedPromise;
};

module.exports = connectDB;
module.exports.memoryStore = memoryStore;
module.exports.isConnected = () => mongoose.connection && mongoose.connection.readyState === 1;
