const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isConnected = false;
let isUsingLocalStore = false;

const DATA_FILE = path.join(__dirname, '../../data/delice_db.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory + file-persisted document store for zero-setup execution & graceful fallback
class LocalDocumentStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      admins: [],
      sessions: [],
      products: [],
      inventoryAdjustments: [],
      media: [],
      homepage: null,
      homepageRevisions: [],
      orders: [],
      customers: [],
      referralCodes: [],
      commissionPayouts: [],
      analyticsEvents: [],
      settings: null,
      auditLogs: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = Object.assign(this.data, JSON.parse(raw));
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[LocalStore] Error reading store, starting clean:', err.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[LocalStore] Error writing store:', err.message);
    }
  }

  getCollection(name) {
    if (!this.data[name]) {
      this.data[name] = [];
    }
    return this.data[name];
  }
}

const localStore = new LocalDocumentStore(DATA_FILE);

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/delice_db';
  
  try {
    // Attempt Mongoose connection with 3-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    });
    isConnected = true;
    isUsingLocalStore = false;
    console.log(`[Database] MongoDB connected via Mongoose: ${uri}`);
  } catch (err) {
    isConnected = false;
    isUsingLocalStore = true;
    console.log(`[Database] Local MongoDB not detected on port 27017 (${err.message}).`);
    console.log(`[Database] Seamlessly running persistent server data store (data/delice_db.json) with strict server-side validation.`);
  }

  return { isConnected, isUsingLocalStore };
}

module.exports = {
  connectDB,
  getIsConnected: () => isConnected,
  getIsUsingLocalStore: () => isUsingLocalStore,
  localStore,
  mongoose
};
