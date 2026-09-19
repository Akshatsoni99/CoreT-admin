/**
 * CoreT & Bank Admin Express API Server Application
 */

import express, { Request, Response, NextFunction } from 'express';
import { requestRepository } from './storage.js';
import { processAIChat } from './ai.js';
import { BankServiceRequest, StatusUpdatePayload } from './types.js';

export const app = express();

// Enable JSON body parsing with large limit for base64 image slips and signatures
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cross-Origin Resource Sharing (CORS) Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedList = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);

  // Allow all localhost/127.0.0.1 in development, plus explicit origins
  const isLocalhost = origin && (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin));
  const isAllowedExplicit = origin && (allowedList.includes(origin) || allowedList.includes('*'));

  if (isLocalhost || isAllowedExplicit || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Default fallback to requested origin if allowed origins not set
    res.setHeader('Access-Control-Allow-Origin', allowedList.length === 0 ? '*' : allowedList[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'CoreT Bank Admin API', timestamp: new Date().toISOString() });
});

/**
 * POST /api/requests
 * Submit a completed user transaction/request
 */
app.post('/api/requests', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<BankServiceRequest>;

    if (!body.serviceType) {
      res.status(400).json({ error: 'Missing required field: serviceType' });
      return;
    }

    const uniqueId = body.uniqueVerificationId || body.id || `TR-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const requestToSave: BankServiceRequest = {
      id: uniqueId,
      requestId: body.requestId || uniqueId,
      uniqueVerificationId: uniqueId,
      serviceType: body.serviceType,
      source: body.source || 'direct_submission',
      status: 'PENDING',
      createdAt: body.createdAt || now,
      updatedAt: now,
      date: body.date || new Date().toLocaleDateString('en-GB'),
      amountNumeric: body.amountNumeric !== undefined ? Number(body.amountNumeric) : undefined,
      amountInWords: body.amountInWords || '',
      accountHolderName: body.accountHolderName || 'Citizen Applicant',
      accountNumber: body.accountNumber || '',
      bankName: body.bankName || 'State Bank of India',
      branch: body.branch || 'Main Branch',
      transactionId: body.transactionId || uniqueId,
      tokenNumber: body.tokenNumber || `T-${Math.floor(100 + Math.random() * 900)}`,
      purpose: body.purpose || `${body.serviceType.toUpperCase()} Counter Service`,
      signature: body.signature || '',
      uploadedDocument: body.uploadedDocument || '',
      OCRData: body.OCRData || null,
      ocrDetectedFields: body.ocrDetectedFields || {},
      userConfirmedData: body.userConfirmedData || {},
      finalFormData: body.finalFormData || body.allFormFields || {},
      allFormFields: body.allFormFields || {},
      completedFields: body.completedFields || [],
      userInputs: body.userInputs || {},
      generatedSlipData: body.generatedSlipData || '',
      notes: body.notes || ''
    };

    const saved = await requestRepository.create(requestToSave);
    res.status(201).json({ success: true, request: saved });
  } catch (error: any) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});

/**
 * GET /api/requests
 * Fetch all bank requests with optional query filtering
 */
app.get('/api/requests', async (req: Request, res: Response) => {
  try {
    const { status, serviceType, source, search } = req.query;
    const filters = {
      status: status as string,
      serviceType: serviceType as string,
      source: source as string,
      search: search as string,
    };
    const requests = await requestRepository.getAll(filters);
    res.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

/**
 * GET /api/requests/:requestId
 * Fetch a single request by ID or uniqueVerificationId
 */
app.get('/api/requests/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const item = await requestRepository.getById(requestId);
    if (!item) {
      res.status(404).json({ error: 'Request not found', requestId });
      return;
    }
    res.json({ success: true, request: item });
  } catch (error: any) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request', details: error.message });
  }
});

/**
 * PATCH /api/requests/:requestId/status
 * Admin Approve or Reject action
 */
app.patch('/api/requests/:requestId/status', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, officer, reason } = req.body as StatusUpdatePayload;

    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      res.status(400).json({ error: 'Invalid status. Must be APPROVED or REJECTED.' });
      return;
    }

    if (status === 'REJECTED' && !reason?.trim()) {
      res.status(400).json({ error: 'Rejection reason is required when rejecting a request.' });
      return;
    }

    const updated = await requestRepository.updateStatus(requestId, {
      status,
      officer: officer || 'Branch Cashier',
      reason: reason?.trim()
    });

    if (!updated) {
      res.status(404).json({ error: 'Request not found to update status', requestId });
      return;
    }

    res.json({ success: true, request: updated });
  } catch (error: any) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Failed to update request status', details: error.message });
  }
});

/**
 * GET /api/requests/:requestId/status
 * Citizen status check
 */
app.get('/api/requests/:requestId/status', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const item = await requestRepository.getById(requestId);
    if (!item) {
      res.status(404).json({ error: 'Request not found', requestId });
      return;
    }
    res.json({
      requestId: item.uniqueVerificationId,
      status: item.status,
      serviceType: item.serviceType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      approvedAt: item.approvedAt,
      approvedBy: item.approvedBy,
      rejectedAt: item.rejectedAt,
      rejectedBy: item.rejectedBy,
      rejectionReason: item.rejectionReason
    });
  } catch (error: any) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ error: 'Failed to fetch status', details: error.message });
  }
});
/**
 * POST /api/requests/clean (or DELETE /api/requests)
 * Admin action: Delete/clean all requests from the queue
 */
app.post('/api/requests/clean', async (_req: Request, res: Response) => {
  try {
    await requestRepository.clearAll();
    res.json({ success: true, message: 'All bank requests cleaned successfully' });
  } catch (error: any) {
    console.error('Error cleaning requests:', error);
    res.status(500).json({ error: 'Failed to clean requests', details: error.message });
  }
});

app.delete('/api/requests', async (_req: Request, res: Response) => {
  try {
    await requestRepository.clearAll();
    res.json({ success: true, message: 'All bank requests cleaned successfully' });
  } catch (error: any) {
    console.error('Error cleaning requests:', error);
    res.status(500).json({ error: 'Failed to clean requests', details: error.message });
  }
});

/**
 * POST /api/requests/restore
 * Admin action: Restore fresh demo bank requests into queue
 */
app.post('/api/requests/restore', async (_req: Request, res: Response) => {
  try {
    const restored = await requestRepository.restoreDefault();
    res.json({ success: true, count: restored.length, requests: restored, message: 'Default demo requests restored successfully' });
  } catch (error: any) {
    console.error('Error restoring requests:', error);
    res.status(500).json({ error: 'Failed to restore requests', details: error.message });
  }
});

/**
 * POST /api/ai/chat
 * Server-side RAAHA AI chat & document intelligence
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, image, selectedLang, history } = req.body;
    const result = await processAIChat({ message, image, selectedLang, history });
    res.json({ success: true, text: result.text, source: result.source });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'AI processing failed', details: error.message });
  }
});
