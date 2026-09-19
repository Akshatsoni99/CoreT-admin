/**
 * Server-Side Gemini AI Controller
 * Keeps API secrets off the client.
 * Uses official supported models (e.g., gemini-2.5-flash).
 * Includes intelligent graceful fallbacks so citizen assistance never crashes.
 */

import { GoogleGenAI } from '@google/genai';

// Supported standard models
export const PRIMARY_GEMINI_MODEL = 'gemini-2.5-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-1.5-flash';

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  return key.trim();
}

function isValidApiKey(key: string): boolean {
  // Standard Google AI Studio keys start with AIzaSy and are ~39 characters.
  // We do basic sanity check to avoid sending obviously invalid tokens
  return Boolean(key && key.length > 20 && !key.startsWith('AQ.'));
}

export interface ServerAIChatOptions {
  message: string;
  image?: string; // Data URL format (data:image/png;base64,...)
  selectedLang?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
}

function buildSystemInstruction(selectedLang: string = 'हिंदी'): string {
  return `You are RAAHA (meaning "Guide" or "Pathfinder"), the official citizen banking and public services AI assistant for India.
Your mission is to make banking, paperwork, and government schemes understandable, effortless, and accessible for every Indian citizen, regardless of their financial literacy or technical background.

Target response language: ${selectedLang} (Please answer in ${selectedLang} if possible, or simple bilingual/Hinglish if requested by the user).

Core Expertise:
1. Bank Slips & Counter Work:
   - Cash Withdrawal Slips (how to write amount in words, where to sign, passbook requirement, self vs third party).
   - Cash Deposit Slips (counterfoil, PAN rule for >₹50,000, account number confirmation, denomination calculation).
   - Bank Transfers (NEFT, RTGS, IMPS, IFSC code breakdown, beneficiary details).
   - Cheque writing (CTS-2010 rules, crossing account payee, date validity of 3 months, preventing tampering).
2. Government Citizen Schemes & Documents:
   - Aadhaar update & e-KYC
   - PAN Card (Form 49A)
   - Income, Caste, Domicile certificates (Tehsil / Revenue office procedures)
   - Ration card, Voter ID card (Form 6)
   - Direct Benefit Transfer (DBT) & PM-Kisan
3. Fraud & Scam Defense:
   - Remind users to NEVER share OTP, CVV, ATM PIN, or NetBanking passwords with anyone (including bank managers).
   - Point out red flags in fake SMS, lottery claims, or APK links.

Guidelines:
- Maintain a warm, encouraging, respectful tone (use "Namaste" when greeting).
- Break answers into short, numbered steps (1, 2, 3...) or bullet points.
- Highlight key cautionary rules with clear bullet points.
- Keep explanations simple and practical.
- If analyzing an attached image of a form, document, or SMS: inspect it thoroughly, explain each section, and tell the user what they need to fill in.`;
}

function getFallbackResponse(query: string, lang: string = 'हिंदी'): string {
  const q = query.toLowerCase();
  const isHindi = lang.includes('हिं') || lang.includes('hindi') || /[\u0900-\u097F]/.test(query);

  if (q.includes('withdraw') || q.includes('निकासी') || q.includes('पैसे निकालना')) {
    return isHindi
      ? `नमस्ते! बैंक से पैसे निकालने (Cash Withdrawal) के लिए इन बातों का ध्यान रखें:
1. **पासबुक:** निकासी पर्ची के साथ बैंक की मूल पासबुक ले जाना अनिवार्य है।
2. **तारीख व नाम:** आज की तारीख लिखें और वही नाम भरें जो पासबुक में दर्ज है।
3. **राशि:** अंकों में (जैसे ₹5,000) और शब्दों में (जैसे Five Thousand Rupees Only) लिखें।
4. **हस्ताक्षर:** पर्ची पर वही दस्तखत करें जो बैंक रिकॉर्ड में हैं।
5. आप CoreT के "Most Used Bank Services" में जाकर विथड्रॉल स्लिप सीधे भर सकते हैं!`
      : `Namaste! For Cash Withdrawal at the bank counter, follow these steps:
1. **Passbook Required:** The original bank passbook must accompany the withdrawal slip.
2. **Date & Name:** Fill today's date and account holder name as printed on passbook.
3. **Amount:** Write amount in numbers (e.g. ₹5,000) and words (Five Thousand Rupees Only).
4. **Signature:** Sign exactly as registered with your bank account.
5. You can use the guided Withdrawal slip right inside CoreT!`;
  }

  if (q.includes('deposit') || q.includes('जमा')) {
    return isHindi
      ? `नमस्ते! बैंक खाते में नकद जमा (Cash Deposit) करने के नियम:
1. **खाता संख्या:** 15 अंकों का खाता नंबर ध्यानपूर्वक भरें।
2. **PAN कार्ड:** यदि आप ₹50,000 या अधिक जमा कर रहे हैं, तो पैन कार्ड अनिवार्य है।
3. **नोटों का विवरण:** पर्ची के पीछे 500, 200, 100 के नोटों की संख्या लिखें।
4. काउंटर से मुहर लगी रसीद (Counterfoil) अवश्य लें।`
      : `Namaste! For Cash Deposit:
1. **Account Number:** Carefully enter the complete bank account number.
2. **PAN Card Rule:** Required if depositing ₹50,000 or more in cash.
3. **Denomination:** Mention note counts (₹500, ₹200, ₹100) on the slip.
4. Always collect the stamped counterfoil from the cashier.`;
  }

  return isHindi
    ? `नमस्ते! मैं आपका राहा (RAAHA) बैंकिंग साथी हूँ।
आप मुझसे बैंक पर्चियों (निकासी, जमा, ट्रांसफर), सरकारी योजनाओं (आधार, पैन कार्ड, आय प्रमाण पत्र), या फ्रॉड/स्कैम की पहचान से जुड़ा कोई भी सवाल पूछ सकते हैं।`
    : `Namaste! I am RAAHA, your banking and citizen public services companion.
You can ask me about bank slips (Withdrawal, Deposit, Transfer), government certificates (Aadhaar, PAN, Income Certificate), or verifying suspicious messages.`;
}

export async function processAIChat(options: ServerAIChatOptions): Promise<{ text: string; source: 'gemini' | 'rule_based' }> {
  const apiKey = getApiKey();

  if (!isValidApiKey(apiKey)) {
    // Graceful fallback when key is not yet configured or invalid format
    return {
      text: getFallbackResponse(options.message, options.selectedLang),
      source: 'rule_based'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemInstruction(options.selectedLang);

    const contents: any[] = [];

    // History (last 6 turns)
    if (options.history && options.history.length > 0) {
      options.history.slice(-6).forEach(h => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }

    const currentParts: any[] = [];
    if (options.image) {
      const match = options.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        currentParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    currentParts.push({
      text: options.message || 'Please assist me with this banking/public service document.'
    });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    // Try primary model first, fallback to fallback model
    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          temperature: 0.7,
        }
      });
      responseText = response.text?.trim() || '';
    } catch (primaryErr: any) {
      console.warn(`Primary Gemini model ${PRIMARY_GEMINI_MODEL} failed, attempting ${FALLBACK_GEMINI_MODEL}:`, primaryErr.message);
      const fallbackResponse = await ai.models.generateContent({
        model: FALLBACK_GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          temperature: 0.7,
        }
      });
      responseText = fallbackResponse.text?.trim() || '';
    }

    if (responseText) {
      return { text: responseText, source: 'gemini' };
    }
  } catch (err: any) {
    console.error('Server Gemini AI Error:', err.message);
  }

  return {
    text: getFallbackResponse(options.message, options.selectedLang),
    source: 'rule_based'
  };
}
