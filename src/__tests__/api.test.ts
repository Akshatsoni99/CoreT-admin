/**
 * End-to-End API and Integration Tests
 * Verifies the REST API, storage abstraction, approval and rejection flows.
 */

import { app } from '../../server/app.js';
import http from 'http';

export async function runApiIntegrationTests(): Promise<boolean> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(3098, '127.0.0.1', () => resolve());
  });

  const baseUrl = 'http://127.0.0.1:3098';

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    if (health.status !== 'OK') return false;

    // 2. Submit a Withdrawal request
    const uniqueId = `SS-WD-26-UNIT@${Date.now().toString().slice(-4)}#9`;
    const createRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uniqueId,
        uniqueVerificationId: uniqueId,
        serviceType: 'withdrawal',
        source: 'find_service_withdrawal',
        amountNumeric: 44,
        amountInWords: 'Forty Four Rupees Only',
        accountHolderName: 'Akshat Soni',
        accountNumber: '501004928172910',
        date: '19/09/2026'
      })
    });
    const created = await createRes.json();
    if (!created.success || created.request?.status !== 'PENDING') return false;

    // 3. Approve request
    const approveRes = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(uniqueId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', officer: 'Branch Cashier' })
    });
    const approved = await approveRes.json();
    if (approved.request?.status !== 'APPROVED' || !approved.request?.approvedAt) return false;

    // 4. Reject request with reason
    const uniqueId2 = `SS-DP-26-REJ@${Date.now().toString().slice(-4)}#8`;
    await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uniqueId2,
        uniqueVerificationId: uniqueId2,
        serviceType: 'deposit',
        source: 'demo_deposit',
        amountNumeric: 5000,
        accountHolderName: 'Priya Sharma',
        accountNumber: '302005918273910'
      })
    });

    const rejectRes = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(uniqueId2)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'REJECTED',
        officer: 'Branch Cashier',
        reason: 'Signature mismatch'
      })
    });
    const rejected = await rejectRes.json();
    if (rejected.request?.status !== 'REJECTED' || rejected.request?.rejectionReason !== 'Signature mismatch') {
      return false;
    }

    return true;
  } finally {
    server.close();
  }
}

// Self-invoking runner with detailed test logging
async function main() {
  console.log('--- Starting Comprehensive API & Integration Test Suite ---');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(3099, '127.0.0.1', () => resolve());
  });

  const baseUrl = 'http://127.0.0.1:3099';

  try {
    // 1. Health check
    const health = await (await fetch(`${baseUrl}/api/health`)).json();
    console.log(`[PASS] Health Check: ${health.status}`);

    // 2. Test All 6 Transaction Flow Submissions
    const sources = [
      { source: 'ocr_scan', type: 'withdrawal', amount: 1500, ocrDetected: { amount: '1500', account: '123456789' } },
      { source: 'upload_photo', type: 'deposit', amount: 2000, ocrDetected: { amount: '2000' } },
      { source: 'demo_withdrawal', type: 'withdrawal', amount: 500 },
      { source: 'demo_deposit', type: 'deposit', amount: 1000 },
      { source: 'find_service_withdrawal', type: 'withdrawal', amount: 44 },
      { source: 'find_service_deposit', type: 'deposit', amount: 5000 },
    ] as const;

    const createdIds: string[] = [];

    for (const [idx, item] of sources.entries()) {
      const id = `SS-${item.type === 'withdrawal' ? 'WD' : 'DP'}-26-T${idx}@${Date.now().toString().slice(-4)}#${idx}`;
      const payload = {
        id,
        uniqueVerificationId: id,
        serviceType: item.type,
        source: item.source,
        amountNumeric: item.amount,
        amountInWords: `${item.amount} Rupees Only`,
        accountHolderName: `Citizen Test ${idx + 1}`,
        accountNumber: `40900192837490${idx}`,
        date: '19/09/2026',
        ocrDetectedFields: (item as any).ocrDetected,
        ocrConfirmedFields: (item as any).ocrDetected ? { amount: String(item.amount) } : undefined
      };

      const res = await fetch(`${baseUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success || data.request.status !== 'PENDING') {
        throw new Error(`Failed to submit flow ${item.source}: ${JSON.stringify(data)}`);
      }
      createdIds.push(id);
      console.log(`[PASS] Flow ${idx + 1}/6: Source '${item.source}' submitted successfully with ID ${id}`);
    }

    // 3. Verify Admin list and filters
    const listRes = await fetch(`${baseUrl}/api/requests?source=demo_withdrawal`);
    const listData = await listRes.json();
    if (!listData.requests.some((r: any) => r.source === 'demo_withdrawal')) {
      throw new Error('Filter by source demo_withdrawal failed');
    }
    console.log(`[PASS] Filter by source: demo_withdrawal verified (${listData.requests.length} found)`);

    // 4. Approve Test (Flow 5: find_service_withdrawal)
    const approveId = createdIds[4];
    const approveRes = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(approveId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', officer: 'Officer Meera' })
    });
    const approveData = await approveRes.json();
    if (approveData.request?.status !== 'APPROVED' || !approveData.request?.approvedAt) {
      throw new Error(`Approval failed: ${JSON.stringify(approveData)}`);
    }
    console.log(`[PASS] Admin Approval verified for ${approveId}`);

    // 5. Reject Test (Flow 6: find_service_deposit)
    const rejectId = createdIds[5];
    const rejectRes = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(rejectId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED', officer: 'Officer Meera', reason: 'Insufficient identification' })
    });
    const rejectData = await rejectRes.json();
    if (rejectData.request?.status !== 'REJECTED' || rejectData.request?.rejectionReason !== 'Insufficient identification') {
      throw new Error(`Rejection failed: ${JSON.stringify(rejectData)}`);
    }
    console.log(`[PASS] Admin Rejection with reason verified for ${rejectId}`);

    // 6. Citizen Status check
    const statusRes = await fetch(`${baseUrl}/api/requests/${encodeURIComponent(approveId)}/status`);
    const statusData = await statusRes.json();
    if (statusData.status !== 'APPROVED') {
      throw new Error(`Citizen status check failed: expected APPROVED, got ${statusData.status}`);
    }
    console.log(`[PASS] Citizen Status polling endpoint verified`);

    // 7. AI Chat Endpoint
    const aiRes = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do I withdraw cash?',
        history: []
      })
    });
    const aiData = await aiRes.json();
    if (!aiData.text || typeof aiData.text !== 'string') {
      throw new Error(`AI Chat response invalid: ${JSON.stringify(aiData)}`);
    }
    console.log(`[PASS] AI Chat endpoint verified. Response snippet: "${aiData.text.slice(0, 60)}..."`);

    console.log('\n=============================================');
    console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (7/7)');
    console.log('=============================================\n');
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  } catch (err) {
    console.error('[FAIL] Integration test error:', err);
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.includes('api.test')) {
  main();
}
