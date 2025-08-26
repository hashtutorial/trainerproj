// In-memory database store for development/testing when MongoDB is not available
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.trainers = new Map();
    this.bookings = new Map();
    this.sessions = new Map();
    this.autoIncrement = {
      users: 1,
      trainers: 1,
      bookings: 1,
      sessions: 1
    };
    
    // Initialize with some test data
    this.initializeTestData();
  }

  initializeTestData() {
    // Test user
    const testUser = {
      _id: 'user_1',
      id: 'user_1',
      name: 'Test User',
      email: 'user@test.com',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set('user_1', testUser);

    // Test trainer
    const testTrainer = {
      _id: 'trainer_1',
      userId: 'user_2',
      name: 'Test Trainer',
      email: 'trainer@test.com',
      role: 'trainer',
      isActive: true,
      specialization: 'Weight Training',
      services: [
        { 
          _id: 'service_1',
          name: 'in-person', 
          price: 60, 
          duration: 60 
        },
        { 
          _id: 'service_2',
          name: 'virtual', 
          price: 40, 
          duration: 60 
        }
      ],
      location: { city: 'Test City', state: 'Test State' },
      experience: { years: 5 },
      rating: { average: 4.5, count: 10 },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.trainers.set('trainer_1', testTrainer);

    // Test trainer user
    const testTrainerUser = {
      _id: 'user_2',
      id: 'user_2',
      name: 'Test Trainer',
      email: 'trainer@test.com',
      role: 'trainer',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set('user_2', testTrainerUser);
  }

  // Generic CRUD operations
  create(collection, data) {
    const id = `${collection}_${this.autoIncrement[collection]++}`;
    const record = {
      _id: id,
      id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.getCollection(collection).set(id, record);
    return record;
  }

  findById(collection, id) {
    return this.getCollection(collection).get(id) || null;
  }

  findOne(collection, query) {
    const items = Array.from(this.getCollection(collection).values());
    return items.find(item => this.matchesQuery(item, query)) || null;
  }

  find(collection, query = {}) {
    const items = Array.from(this.getCollection(collection).values());
    return items.filter(item => this.matchesQuery(item, query));
  }

  update(collection, id, updates) {
    const item = this.findById(collection, id);
    if (!item) return null;
    
    Object.assign(item, updates, { updatedAt: new Date() });
    return item;
  }

  delete(collection, id) {
    return this.getCollection(collection).delete(id);
  }

  getCollection(name) {
    switch (name) {
      case 'users': return this.users;
      case 'trainers': return this.trainers;
      case 'bookings': return this.bookings;
      case 'sessions': return this.sessions;
      default: throw new Error(`Unknown collection: ${name}`);
    }
  }

  matchesQuery(item, query) {
    for (const [key, value] of Object.entries(query)) {
      if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Populate simulation (simplified)
  populate(item, field, selectFields = '') {
    if (!item || !item[field]) return item;
    
    // Simple population for userId/trainerId
    if (field === 'userId' && item.userId) {
      const user = this.findById('users', item.userId);
      if (user) {
        item.userId = selectFields ? this.selectFields(user, selectFields) : user;
      }
    }
    
    if (field === 'trainerId' && item.trainerId) {
      const trainer = this.findById('trainers', item.trainerId);
      if (trainer) {
        item.trainerId = selectFields ? this.selectFields(trainer, selectFields) : trainer;
      }
    }
    
    return item;
  }

  selectFields(obj, fields) {
    if (!fields) return obj;
    const selected = {};
    fields.split(' ').forEach(field => {
      if (obj[field] !== undefined) {
        selected[field] = obj[field];
      }
    });
    return selected;
  }

  // Simulate async operations
  async save(collection, data) {
    return new Promise(resolve => {
      setTimeout(() => {
        const result = this.create(collection, data);
        resolve(result);
      }, 10);
    });
  }
}

// Export singleton instance
module.exports = new MemoryStore();