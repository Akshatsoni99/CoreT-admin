/**
 * Standalone API Server Entry Point
 * Listens on port 3001 (or process.env.PORT)
 */

import { app } from './app.js';
import dotenv from 'dotenv';
import path from 'path';

// Load root environment files
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`🚀 CoreT Bank Admin REST API Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔌 Endpoints:`);
  console.log(`   - POST  http://localhost:${PORT}/api/requests`);
  console.log(`   - GET   http://localhost:${PORT}/api/requests`);
  console.log(`   - GET   http://localhost:${PORT}/api/requests/:id`);
  console.log(`   - PATCH http://localhost:${PORT}/api/requests/:id/status`);
  console.log(`   - GET   http://localhost:${PORT}/api/requests/:id/status`);
  console.log(`   - POST  http://localhost:${PORT}/api/ai/chat`);
  console.log(`===================================================`);
});
