const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// Import app and models
const app = require('../src/app');
const { DataListing, DataAccess } = require('../src/models/data.model');
const User = require('../src/models/user.model');

// Mock blockchain service
jest.mock('../src/services/blockchain.service', () => ({
  createSubmitDataInstruction: jest.fn().mockReturnValue({
    transaction: 'mock_tx_instruction',
    message: 'Mock instruction created'
  }),
  createPurchaseDataAccessInstruction: jest.fn().mockReturnValue({
    transaction: 'mock_purchase_instruction',
    message: 'Mock purchase instruction created'
  })
}));

describe('Marketplace API Tests', () => {
  let mongoServer;
  let testUser;
  let testToken;
  let testListing;

  // Setup before all tests
  beforeAll(async () => {
    // Create an in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Create a test user
    testUser = new User({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      publicKey: 'TestPublicKey123',
      isRegisteredDataProvider: true,
      dataProviderId: 'test_provider_123',
      deviceType: 0
    });
    await testUser.save();

    // Create a JWT token for the test user
    testToken = jwt.sign(
      { id: testUser._id, email: testUser.email },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // Create a test data listing
    testListing = new DataListing({
      userId: testUser._id,
      publicKey: testUser.publicKey,
      listingId: 'test_listing_123',
      title: '测试数据列表',
      description: '这是一个测试数据列表',
      dataTypes: [0, 1], // Motion, Biometric
      pricePerAccess: 100,
      accessPeriod: 86400, // 1 day in seconds
      isActive: true
    });
    await testListing.save();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Tests for GET /api/marketplace/listings
  describe('GET /api/marketplace/listings', () => {
    it('should return all active listings', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('测试数据列表');
    });

    it('should filter listings by data type', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings?dataType=0')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);

      // Create a listing with different data type
      const differentTypeListing = new DataListing({
        userId: testUser._id,
        publicKey: testUser.publicKey,
        listingId: 'different_type_listing',
        title: '仅压力数据',
        description: '只包含压力数据',
        dataTypes: [2], // Pressure only
        pricePerAccess: 50,
        accessPeriod: 86400,
        isActive: true
      });
      await differentTypeListing.save();

      // This should only return the second listing
      const filteredResponse = await request(app)
        .get('/api/marketplace/listings?dataType=2')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(filteredResponse.body.success).toBe(true);
      expect(filteredResponse.body.data.length).toBe(1);
      expect(filteredResponse.body.data[0].title).toBe('仅压力数据');
    });

    it('should sort listings by price', async () => {
      // Create a more expensive listing
      const expensiveListing = new DataListing({
        userId: testUser._id,
        publicKey: testUser.publicKey,
        listingId: 'expensive_listing',
        title: '高价数据',
        description: '高价数据列表',
        dataTypes: [0, 1],
        pricePerAccess: 500,
        accessPeriod: 86400,
        isActive: true
      });
      await expensiveListing.save();

      // Test ascending sort
      const ascResponse = await request(app)
        .get('/api/marketplace/listings?sortBy=pricePerAccess&sortOrder=asc')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(ascResponse.body.success).toBe(true);
      expect(ascResponse.body.data.length).toBe(3);
      expect(ascResponse.body.data[0].pricePerAccess).toBe(50);
      expect(ascResponse.body.data[2].pricePerAccess).toBe(500);

      // Test descending sort
      const descResponse = await request(app)
        .get('/api/marketplace/listings?sortBy=pricePerAccess&sortOrder=desc')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(descResponse.body.success).toBe(true);
      expect(descResponse.body.data[0].pricePerAccess).toBe(500);
      expect(descResponse.body.data[2].pricePerAccess).toBe(50);
    });
  });

  // Tests for GET /api/marketplace/listings/:id
  describe('GET /api/marketplace/listings/:id', () => {
    it('should return a single listing by ID', async () => {
      const response = await request(app)
        .get(`/api/marketplace/listings/${testListing._id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('测试数据列表');
      expect(response.body.data.listingId).toBe('test_listing_123');
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/marketplace/listings/${fakeId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Data listing not found');
    });
  });

  // Tests for POST /api/marketplace/listings
  describe('POST /api/marketplace/listings', () => {
    it('should create a new listing when authenticated', async () => {
      const newListing = {
        title: '新建数据列表',
        description: '这是一个新创建的数据列表',
        dataTypes: [0, 3], // Motion, Muscle
        pricePerAccess: 150,
        accessPeriod: 2592000 // 30 days
      };

      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send(newListing)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('新建数据列表');
      expect(response.body.data.transactionInstruction).toBeDefined();

      // Verify it was saved to the database
      const savedListing = await DataListing.findById(response.body.data.id);
      expect(savedListing).not.toBeNull();
      expect(savedListing.title).toBe('新建数据列表');
    });

    it('should require authentication', async () => {
      const newListing = {
        title: '未认证列表',
        description: '未认证用户尝试创建的列表',
        dataTypes: [1],
        pricePerAccess: 50,
        accessPeriod: 86400
      };

      const response = await request(app)
        .post('/api/marketplace/listings')
        .send(newListing)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // Tests for PUT /api/marketplace/listings/:id
  describe('PUT /api/marketplace/listings/:id', () => {
    it('should update an existing listing', async () => {
      const updatedData = {
        title: '更新后的标题',
        description: '这是更新后的描述',
        pricePerAccess: 120
      };

      const response = await request(app)
        .put(`/api/marketplace/listings/${testListing._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('更新后的标题');

      // Verify it was updated in the database
      const updatedListing = await DataListing.findById(testListing._id);
      expect(updatedListing.title).toBe('更新后的标题');
      expect(updatedListing.pricePerAccess).toBe(120);
    });

    it('should prevent unauthorized updates', async () => {
      // Create another user
      const anotherUser = new User({
        email: 'another@example.com',
        username: 'anotheruser',
        password: 'password123',
        publicKey: 'AnotherPublicKey'
      });
      await anotherUser.save();

      // Create token for the other user
      const anotherToken = jwt.sign(
        { id: anotherUser._id, email: anotherUser.email },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const updatedData = {
        title: '未授权更新',
        pricePerAccess: 999
      };

      const response = await request(app)
        .put(`/api/marketplace/listings/${testListing._id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(updatedData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not authorized to update this listing');
    });
  });

  // Tests for POST /api/marketplace/purchase/:listingId
  describe('POST /api/marketplace/purchase/:listingId', () => {
    it('should initiate a purchase', async () => {
      const response = await request(app)
        .post(`/api/marketplace/purchase/${testListing.listingId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data access purchase initiated');
      expect(response.body.data.transactionInstruction).toBeDefined();

      // Verify purchase record was created
      const purchase = await DataAccess.findOne({
        buyerId: testUser._id,
        listingId: testListing.listingId
      });
      expect(purchase).not.toBeNull();
      expect(purchase.isValid).toBe(false); // Should be pending until transaction confirms
    });

    it('should prevent purchasing inactive listings', async () => {
      // Create an inactive listing
      const inactiveListing = new DataListing({
        userId: testUser._id,
        publicKey: testUser.publicKey,
        listingId: 'inactive_listing',
        title: '已停用数据列表',
        description: '这个列表已停用',
        dataTypes: [0],
        pricePerAccess: 100,
        accessPeriod: 86400,
        isActive: false
      });
      await inactiveListing.save();

      const response = await request(app)
        .post(`/api/marketplace/purchase/${inactiveListing.listingId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This listing is no longer active');
    });
  });

  // Tests for GET /api/marketplace/my-listings
  describe('GET /api/marketplace/my-listings', () => {
    it('should return user\'s listings', async () => {
      const response = await request(app)
        .get('/api/marketplace/my-listings')
        .set('Authorization', `Bearer ${testToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      // Check that all returned listings belong to the test user
      response.body.data.forEach(listing => {
        expect(listing.userId).toBe(testUser._id.toString());
      });
    });
  });

  // Tests for GET /api/marketplace/my-purchases
  describe('GET /api/marketplace/my-purchases', () => {
    it('should return user\'s purchases', async () => {
      const response = await request(app)
        .get('/api/marketplace/my-purchases')
        .set('Authorization', `Bearer ${testToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      // We should have at least one purchase from earlier test
      expect(response.body.data.length).toBeGreaterThan(0);
      // Check that all returned purchases belong to the test user
      response.body.data.forEach(purchase => {
        expect(purchase.buyerId).toBe(testUser._id.toString());
      });
    });
  });
}); 