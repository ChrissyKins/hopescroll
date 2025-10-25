import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll } from 'vitest';
import React from 'react';
import dotenv from 'dotenv';
import { disconnectDb } from '@/lib/db';

// Load environment variables from .env file for tests
dotenv.config();

// Make React available globally for JSX
global.React = React;

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Disconnect database after all tests complete
afterAll(async () => {
  await disconnectDb();
});
