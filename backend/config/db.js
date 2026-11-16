const mongoose = require('mongoose');

// In-Memory store for offline / unconfigured database fallback
const memoryStore = {
  orders: [],
  products: [],
  expenses: [],
  allocations: [],
  settings: {}
};

// Global cache object across serverless lambda invocations
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

// Clear stale cache whenever socket disconnects or closes
mongoose.connection.on('disconnected', () => {
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('close', () => {
  cached.conn = null;
  cached.promise = null;
});

const connectDB = async () => {
  // If active and fully connected (readyState 1 = connected), return immediately
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  // If connection is disconnected (readyState 0) or disconnecting (readyState 3), invalidate stale promise
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.promise = null;
    cached.conn = null;
  }

  // If a live connection attempt is actively in-flight (readyState 2 = connecting), await it
  if (cached.promise && mongoose.connection.readyState === 2) {
    return cached.promise;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/delice_fragrance';

  const opts = {
    bufferCommands: false, // In serverless, never buffer commands indefinitely
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    maxPoolSize: 2 // Keep connection pool lightweight for serverless lambdas
  };

  cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
    console.log(`[MongoDB] Connected successfully to: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
    cached.conn = mongooseInstance.connection;
    return cached.conn;
  }).catch(async (error) => {
    cached.promise = null;
    cached.conn = null;
    // If SRV DNS failed on Windows / local network, retry with direct replica set connection if configured
    const directFallback = process.env.MONGODB_DIRECT_URI;
    if (directFallback && (String(error.message || '').includes('querySrv') || String(error.message || '').includes('ECONNREFUSED'))) {
      try {
        console.log('[MongoDB] Retrying via direct MONGODB_DIRECT_URI replica nodes...');
        const retryInst = await mongoose.connect(directFallback, opts);
        console.log(`[MongoDB] Connected successfully via direct nodes to: ${retryInst.connection.host}/${retryInst.connection.name}`);
        cached.conn = retryInst.connection;
        return cached.conn;
      } catch (retryErr) {
        console.warn(`[MongoDB Direct Retry Failed] ${retryErr.message}`);
      }
    }
    console.warn(`\n[MongoDB Notice] Could not connect to MongoDB at "${uri}".`);
    console.warn(`[MongoDB Guidance] Error details: ${error.message}\n`);
    return null;
  });

  return cached.promise;
};

module.exports = connectDB;
module.exports.memoryStore = memoryStore;
module.exports.isConnected = () => Boolean(mongoose.connection && mongoose.connection.readyState === 1);
