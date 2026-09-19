/**
 * Slip Renderer — Generates high-fidelity completed bank physical slips
 * by drawing user data and actual manual signature onto physical blank slips via HTML Canvas.
 */

import WithdrawalSlipImg from '../assets/withdrawal-slip.png';
import DepositSlipImg from '../assets/deposit-slip.png';
import BankTransferSlipImg from '../assets/bank-transfer-slip.png';

export interface CompletedSlipParams {
  type: 'withdrawal' | 'deposit' | 'transfer' | 'ocr_form';
  data: Record<string, string>;
  signatureDataUrl?: string;
  verificationId?: string;
}

/**
 * Load an image from URL or dataURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Format date for individual day/month/year slot rendering
 */
function parseDateParts(dateStr: string): { day: string; month: string; year: string } {
  if (!dateStr) {
    const d = new Date();
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: String(d.getMonth() + 1).padStart(2, '0'),
      year: String(d.getFullYear())
    };
  }
  // Handles DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  return { day: dateStr.slice(0, 2), month: dateStr.slice(2, 4), year: dateStr.slice(4) };
}

/**
 * Render a complete physical withdrawal slip
 */
async function renderWithdrawalSlip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Record<string, string>,
  sigImg?: HTMLImageElement,
  verificationId?: string
) {
  // Styling for handwriting blue banking ink
  const penColor = '#0b2e59';
  ctx.fillStyle = penColor;
  ctx.textBaseline = 'middle';

  // 1. Date (Date / / 20__)
  const dateParts = parseDateParts(data.date);
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  // Position near Date label (x=1015, y=170)
  ctx.fillText(dateParts.day, 1085, 180);
  ctx.fillText('/', 1125, 180);
  ctx.fillText(dateParts.month, 1145, 180);
  ctx.fillText('/', 1185, 180);
  ctx.fillText(dateParts.year.slice(-2), 1215, 180);

  // Branch Name if specified
  if (data.branch) {
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText(data.branch, 400, 180);
  }

  // 2. Amount in Words ("sum of Rupees...")
  if (data.amountWords) {
    ctx.font = 'bold italic 18px "Georgia", serif';
    ctx.fillText(data.amountWords, 360, 224);
  }

  // 3. Amount in Numbers inside the bordered box (x=1080..1320, y=210..270)
  if (data.amount) {
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    const formattedAmount = `₹ ${Number(data.amount).toLocaleString('en-IN')}/-`;
    ctx.fillText(formattedAmount, 1100, 240);
  }

  // 4. Account Number in individual boxes (15 boxes between x:95 and x:675, y:340..376)
  const accNo = (data.accountNumber || '').replace(/\D/g, '');
  if (accNo) {
    ctx.font = 'bold 24px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    const startX = 115;
    const boxWidth = 38.6;
    for (let i = 0; i < Math.min(accNo.length, 15); i++) {
      const x = startX + i * boxWidth;
      ctx.fillText(accNo[i], x, 358);
    }
    ctx.textAlign = 'left';
  }

  // 5. Name of Account Holder on line `Name (a) of a/c Holder (S).........` (x=721, y=368..396)
  const holderName = data.name || data.senderName || '';
  if (holderName) {
    ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
    ctx.fillText(holderName.toUpperCase(), 740, 382);
  }

  // 6. User's Drawn Signature on `Sig. of A/c Holder` (x:720..920, y:280..330)
  if (sigImg) {
    // Maintain aspect ratio, fit inside 200x55 signature zone
    const targetW = 190;
    const targetH = 50;
    const targetX = 730;
    const targetY = 285;
    ctx.drawImage(sigImg, targetX, targetY, targetW, targetH);
  }

  // 7. Security Watermark & Verification ID Stamp
  if (verificationId) {
    ctx.save();
    ctx.fillStyle = '#004B87';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`VERIFICATION ID: ${verificationId}`, 80, 485);
    ctx.restore();
  }
}

/**
 * Render a complete physical deposit slip
 */
async function renderDepositSlip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Record<string, string>,
  sigImg?: HTMLImageElement,
  verificationId?: string
) {
  const penColor = '#0b2e59';
  ctx.fillStyle = penColor;
  ctx.textBaseline = 'middle';

  // 1. Date top-right
  const dateParts = parseDateParts(data.date);
  ctx.font = 'bold 15px "Courier New", monospace';
  const dateDigits = `${dateParts.day}${dateParts.month}${dateParts.year}`;
  const startXDate = 1076;
  const boxW = 19;
  for (let i = 0; i < Math.min(dateDigits.length, 8); i++) {
    ctx.fillText(dateDigits[i], startXDate + i * boxW, 46);
  }

  // 2. Branch Name
  if (data.branch) {
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillText(data.branch, 980, 78);
  }

  // 3. Account Number in individual boxes (15 boxes)
  const accNo = (data.accountNumber || '').replace(/\D/g, '');
  if (accNo) {
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    const accStartX = 698;
    const accBoxW = 37.3;
    for (let i = 0; i < Math.min(accNo.length, 15); i++) {
      ctx.fillText(accNo[i], accStartX + i * accBoxW + 18, 128);
    }
    ctx.textAlign = 'left';
  }

  // 4. Depositor / Account Holder Name
  const name = data.name || '';
  if (name) {
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(name.toUpperCase(), 730, 168);
  }

  // 5. Mobile Number
  if (data.mobileNumber) {
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(data.mobileNumber, 780, 198);
  }

  // 6. Amount in words
  if (data.amountWords) {
    ctx.font = 'bold italic 15px "Georgia", serif';
    ctx.fillText(data.amountWords, 740, 224);
  }

  // 7. Amount in numbers (right column)
  if (data.amount) {
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    const formatted = `₹ ${Number(data.amount).toLocaleString('en-IN')}/-`;
    ctx.fillText(formatted, 1070, 240);
    // Total line
    ctx.fillText(formatted, 1070, 435);
  }

  // 8. Depositor Signature (bottom right, x:1050..1240, y:460..500)
  if (sigImg) {
    ctx.drawImage(sigImg, 1070, 455, 170, 45);
  }

  // 9. Verification Stamp
  if (verificationId) {
    ctx.save();
    ctx.fillStyle = '#004B87';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText(`VERIFICATION ID: ${verificationId}`, 690, 498);
    ctx.restore();
  }
}

/**
 * Render a complete physical bank transfer slip
 */
async function renderTransferSlip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: Record<string, string>,
  sigImg?: HTMLImageElement,
  verificationId?: string
) {
  const penColor = '#0b2e59';
  ctx.fillStyle = penColor;
  ctx.textBaseline = 'middle';

  // 1. Date top-right
  if (data.date) {
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText(data.date, 340, 28);
  }

  // 2. Amount in numbers
  if (data.amount) {
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`₹ ${Number(data.amount).toLocaleString('en-IN')}/-`, 150, 88);
  }

  // 3. Amount in words
  if (data.amountWords) {
    ctx.font = 'bold italic 10px "Georgia", serif';
    ctx.fillText(data.amountWords, 250, 88);
  }

  // 4. Sender Account
  const senderAcc = data.senderAccount || data.accountNumber || '';
  if (senderAcc) {
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(senderAcc, 100, 150);
  }

  // 5. Sender Name
  const senderName = data.senderName || data.name || '';
  if (senderName) {
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText(senderName.toUpperCase(), 90, 184);
  }

  // 6. Mobile Number
  if (data.mobileNumber) {
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(data.mobileNumber, 100, 222);
  }

  // 7. Beneficiary Name
  if (data.beneficiaryName) {
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText(data.beneficiaryName.toUpperCase(), 90, 254);
  }

  // 8. Beneficiary Account
  if (data.beneficiaryAccount) {
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(data.beneficiaryAccount, 100, 275);
  }

  // 9. Bank & Branch
  if (data.bankName) {
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    ctx.fillText(data.bankName, 90, 296);
  }

  // 10. IFSC Code
  if (data.ifscCode) {
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(data.ifscCode.toUpperCase(), 100, 318);
  }

  // 11. Signature in bottom applicant box
  if (sigImg) {
    ctx.drawImage(sigImg, 15, 508, 120, 36);
  }

  // 12. Verification Stamp
  if (verificationId) {
    ctx.save();
    ctx.fillStyle = '#004B87';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText(`VERIFIED: ${verificationId}`, 15, 620);
    ctx.restore();
  }
}

/**
 * Main function: Generate completed physical slip DataURL
 */
export async function generateCompletedSlip(params: CompletedSlipParams): Promise<string> {
  let assetUrl = WithdrawalSlipImg;
  if (params.type === 'deposit') {
    assetUrl = DepositSlipImg;
  } else if (params.type === 'transfer') {
    assetUrl = BankTransferSlipImg;
  }

  // Load base slip
  const baseImg = await loadImage(assetUrl);

  // Load signature image if present
  let sigImg: HTMLImageElement | undefined;
  if (params.signatureDataUrl && params.signatureDataUrl.startsWith('data:image')) {
    try {
      sigImg = await loadImage(params.signatureDataUrl);
    } catch (e) {
      console.warn('Could not load signature image into canvas:', e);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth || baseImg.width;
  canvas.height = baseImg.naturalHeight || baseImg.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context could not be created');
  }

  // Draw base physical slip
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

  // Render overlaid data per slip type
  if (params.type === 'withdrawal') {
    await renderWithdrawalSlip(ctx, canvas.width, canvas.height, params.data, sigImg, params.verificationId);
  } else if (params.type === 'deposit') {
    await renderDepositSlip(ctx, canvas.width, canvas.height, params.data, sigImg, params.verificationId);
  } else if (params.type === 'transfer') {
    await renderTransferSlip(ctx, canvas.width, canvas.height, params.data, sigImg, params.verificationId);
  } else {
    // Default fallback to withdrawal layout
    await renderWithdrawalSlip(ctx, canvas.width, canvas.height, params.data, sigImg, params.verificationId);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}
