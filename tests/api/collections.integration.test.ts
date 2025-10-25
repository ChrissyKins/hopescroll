/**
 * Integration tests for /app/api/collections
 * Tests actual HTTP request/response behavior with real database
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '@/app/api/collections/route';
import { GET as GET_COLLECTION, PATCH, DELETE as DELETE_COLLECTION } from '@/app/api/collections/[collectionId]/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Test user constants - must be declared before mocks
const testUserId = 'collections-test-user';
const testEmail = 'collections-test@example.com';

// Mock auth to return a test user
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'collections-test-user', email: 'collections-test@example.com' }
  })
}));

describe('Collections API Integration Tests', () => {
  let testCollectionId: string;

  function createMockGetRequest(url: string): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000${url}`),
    } as NextRequest;
  }

  function createMockPostRequest(body: unknown): NextRequest {
    return {
      json: async () => body,
      nextUrl: new URL('http://localhost:3000/api/collections'),
    } as NextRequest;
  }

  function createMockPatchRequest(body: unknown, collectionId: string): NextRequest {
    return {
      json: async () => body,
      nextUrl: new URL(`http://localhost:3000/api/collections/${collectionId}`),
    } as NextRequest;
  }

  function createMockDeleteRequest(collectionId: string): NextRequest {
    return {
      nextUrl: new URL(`http://localhost:3000/api/collections/${collectionId}`),
    } as NextRequest;
  }

  beforeEach(async () => {
    // Clean up any existing test data
    await db.collection.deleteMany({ where: { userId: testUserId } });

    const existingUser = await db.user.findUnique({
      where: { email: testEmail },
    });
    if (existingUser) {
      await db.user.delete({
        where: { email: testEmail },
      });
    }

    // Create test user
    await db.user.create({
      data: {
        id: testUserId,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await db.collection.deleteMany({ where: { userId: testUserId } });

    try {
      await db.user.delete({
        where: { email: testEmail },
      });
    } catch {
      // User might not exist if test failed
    }
  });

  describe('POST /api/collections', () => {
    it('should create a new collection with valid data', async () => {
      const request = createMockPostRequest({
        name: 'Work Videos',
        description: 'Videos related to work and career',
        color: '#3B82F6',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: 'Work Videos',
        description: 'Videos related to work and career',
        color: '#3B82F6',
        userId: testUserId,
      });
      expect(data.data.id).toBeDefined();
      expect(data.data.createdAt).toBeDefined();
      expect(data.data.updatedAt).toBeDefined();

      // Save for later tests
      testCollectionId = data.data.id;
    });

    it('should trim whitespace from collection name', async () => {
      const request = createMockPostRequest({
        name: '  Learning   ',
        description: 'Educational content',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Learning');
    });

    it('should create collection without optional fields', async () => {
      const request = createMockPostRequest({
        name: 'Simple Collection',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Simple Collection');
      expect(data.data.description).toBeNull();
      expect(data.data.color).toBeNull();
    });

    it('should reject request without collection name', async () => {
      const request = createMockPostRequest({
        description: 'No name provided',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });

    it('should reject request with empty collection name', async () => {
      const request = createMockPostRequest({
        name: '   ',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeTruthy();
    });
  });

  describe('GET /api/collections', () => {
    beforeEach(async () => {
      // Create a few test collections
      await db.collection.createMany({
        data: [
          {
            id: 'test-col-1',
            userId: testUserId,
            name: 'Work Videos',
            description: 'Work related content',
            color: '#3B82F6',
          },
          {
            id: 'test-col-2',
            userId: testUserId,
            name: 'Learning',
            description: 'Educational content',
            color: '#10B981',
          },
        ],
      });
    });

    it('should list all user collections', async () => {
      const request = createMockGetRequest('/api/collections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(2);

      // Check structure of first collection
      const collection = data.data[0];
      expect(collection).toHaveProperty('id');
      expect(collection).toHaveProperty('name');
      expect(collection).toHaveProperty('userId');
      expect(collection).toHaveProperty('createdAt');
      expect(collection).toHaveProperty('updatedAt');
    });

    it('should only return collections owned by the user', async () => {
      const request = createMockGetRequest('/api/collections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((collection: any) => {
        expect(collection.userId).toBe(testUserId);
      });
    });

    it('should return empty array when user has no collections', async () => {
      // Delete all collections first
      await db.collection.deleteMany({ where: { userId: testUserId } });

      const request = createMockGetRequest('/api/collections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe('GET /api/collections/[collectionId]', () => {
    beforeEach(async () => {
      // Create a test collection
      const collection = await db.collection.create({
        data: {
          id: 'test-get-col',
          userId: testUserId,
          name: 'Test Collection',
          description: 'Test description',
          color: '#3B82F6',
        },
      });
      testCollectionId = collection.id;
    });

    it('should get a specific collection by ID', async () => {
      const request = createMockGetRequest(`/api/collections/${testCollectionId}`);
      const response = await GET_COLLECTION(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(testCollectionId);
      expect(data.data.name).toBe('Test Collection');
      expect(data.data.userId).toBe(testUserId);
    });

    it('should return 404 for non-existent collection', async () => {
      const request = createMockGetRequest('/api/collections/nonexistent-id');
      const response = await GET_COLLECTION(request, { params: Promise.resolve({ collectionId: 'nonexistent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe('PATCH /api/collections/[collectionId]', () => {
    beforeEach(async () => {
      // Create a test collection
      const collection = await db.collection.create({
        data: {
          id: 'test-patch-col',
          userId: testUserId,
          name: 'Original Name',
          description: 'Original description',
          color: '#3B82F6',
        },
      });
      testCollectionId = collection.id;
    });

    it('should update collection name', async () => {
      const request = createMockPatchRequest(
        { name: 'Professional Videos' },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Professional Videos');
      expect(data.data.id).toBe(testCollectionId);
    });

    it('should update collection description', async () => {
      const request = createMockPatchRequest(
        { description: 'Updated description' },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.description).toBe('Updated description');
    });

    it('should update collection color', async () => {
      const request = createMockPatchRequest(
        { color: '#10B981' },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.color).toBe('#10B981');
    });

    it('should update multiple fields at once', async () => {
      const request = createMockPatchRequest(
        {
          name: 'Career Development',
          description: 'Videos for career growth',
          color: '#F59E0B',
        },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Career Development');
      expect(data.data.description).toBe('Videos for career growth');
      expect(data.data.color).toBe('#F59E0B');
    });

    it('should trim whitespace from updated name', async () => {
      const request = createMockPatchRequest(
        { name: '  Trimmed Name  ' },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe('Trimmed Name');
    });

    it('should allow setting fields to null', async () => {
      const request = createMockPatchRequest(
        {
          description: null,
          color: null,
        },
        testCollectionId
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: testCollectionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.description).toBeNull();
      expect(data.data.color).toBeNull();
    });

    it('should return 404 for non-existent collection', async () => {
      const request = createMockPatchRequest(
        { name: 'Updated Name' },
        'nonexistent-id'
      );

      const response = await PATCH(request, { params: Promise.resolve({ collectionId: 'nonexistent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/collections/[collectionId]', () => {
    let collectionToDelete: string;

    beforeEach(async () => {
      // Create a collection specifically for deletion
      const collection = await db.collection.create({
        data: {
          id: 'test-delete-col',
          userId: testUserId,
          name: 'To Be Deleted',
        },
      });
      collectionToDelete = collection.id;
    });

    it('should delete a collection', async () => {
      const request = createMockDeleteRequest(collectionToDelete);
      const response = await DELETE_COLLECTION(request, { params: Promise.resolve({ collectionId: collectionToDelete }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('deleted successfully');

      // Verify collection is deleted
      const collection = await db.collection.findUnique({
        where: { id: collectionToDelete },
      });
      expect(collection).toBeNull();
    });

    it('should return 404 for non-existent collection', async () => {
      const request = createMockDeleteRequest('nonexistent-id');
      const response = await DELETE_COLLECTION(request, { params: Promise.resolve({ collectionId: 'nonexistent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });
});
