import { GoogleGenAI } from '@google/genai';

// Model to use
export const GEMINI_MODEL = 'gemini-3.6-flash';

// Language codes for Speech Recognition and Synthesis
export const LANGUAGE_SPEECH_CODES: Record<string, string> = {
  'English': 'en-IN',
  'हिंदी': 'hi-IN',
  'मराठी': 'mr-IN',
  'ગુજરાતી': 'gu-IN',
  'বাংলা': 'bn-IN',
  'தமிழ்': 'ta-IN',
  'తెలుగు': 'te-IN'
};

/**
 * Get API Key from environment or local storage
 */
export function getGeminiApiKey(): string {
  try {
    const customKey = localStorage.getItem('user_gemini_api_key');
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  } catch (e) {
    // ignore local storage errors
  }

  const envKey = (process.env.GEMINI_API_KEY as string) || 
                 (import.meta.env.VITE_GEMINI_API_KEY as string) || 
                 '';
  return envKey ? envKey.trim() : '';
}

/**
 * Save custom API key in localStorage
 */
export function setCustomGeminiApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem('user_gemini_api_key');
    } else {
      localStorage.setItem('user_gemini_api_key', key.trim());
    }
  } catch (e) {
    console.error('Failed to save API key to local storage', e);
  }
}

/**
 * Check if a Gemini API Key is configured
 */
export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.length > 10);
}

/**
 * Get configured GoogleGenAI instance
 */
function getGenAIClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file or enter it in settings.');
  }
  return new GoogleGenAI({ apiKey });
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  image?: string; // base64 data url
  isStreaming?: boolean;
  actionSuggestion?: {
    type: 'withdrawal' | 'deposit' | 'transfer' | 'services' | 'scam-shield';
    label: string;
  };
}

export interface SendMessageOptions {
  message: string;
  image?: string; // Data URL format (data:image/png;base64,...)
  selectedLang?: string;
  history?: ChatMessage[];
  onStreamChunk?: (chunk: string, aggregatedText: string) => void;
}

/**
 * Build system instruction for RAAHA
 */
function buildSystemInstruction(selectedLang: string = 'English'): string {
  return `You are RAAHA (meaning "Guide" or "Pathfinder"), the citizen banking and public services AI assistant for India.
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

/**
 * Detect action suggestions based on user query and bot response
 */
function detectActionSuggestion(query: string, reply: string): ChatMessage['actionSuggestion'] | undefined {
  const combined = (query + ' ' + reply).toLowerCase();
  
  if (combined.includes('withdrawal') || combined.includes('withdraw cash') || combined.includes('निकासी') || combined.includes('पैसे निकालना')) {
    return {
      type: 'withdrawal',
      label: 'Open Cash Withdrawal Guide Slip'
    };
  }
  if (combined.includes('deposit') || combined.includes('cash deposit') || combined.includes('जमा पर्ची') || combined.includes('पैसे जमा')) {
    return {
      type: 'deposit',
      label: 'Open Cash Deposit Guide Slip'
    };
  }
  if (combined.includes('transfer') || combined.includes('neft') || combined.includes('rtgs') || combined.includes('ifsc') || combined.includes('पैसे ट्रांसफर')) {
    return {
      type: 'transfer',
      label: 'Open Bank Transfer Slip Guide'
    };
  }
  if (combined.includes('scam') || combined.includes('fraud') || combined.includes('phishing') || combined.includes('धोखाधड़ी') || combined.includes('संदिग्ध')) {
    return {
      type: 'scam-shield',
      label: 'Check in Scam Shield'
    };
  }
  if (combined.includes('scheme') || combined.includes('certificate') || combined.includes('aadhaar') || combined.includes('pan card') || combined.includes('praman patra')) {
    return {
      type: 'services',
      label: 'Explore Citizen Services'
    };
  }
  return undefined;
}

/**
 * Send a message to Gemini RAAHA with streaming support
 */
export async function sendMessageToRaaha({
  message,
  image,
  selectedLang = 'हिंदी',
  history = [],
  onStreamChunk
}: SendMessageOptions): Promise<{ text: string; actionSuggestion?: ChatMessage['actionSuggestion'] }> {
  const promptText = message.trim() || (image ? 'Please analyze this document/form and guide me step-by-step.' : 'Hello');
  const baseUrl = ((import.meta.env.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '');

  try {
    const formattedHistory = history
      .filter(m => !m.isStreaming && m.id !== 'welcome')
      .slice(-6)
      .map(m => ({
        role: m.role,
        text: m.text
      }));

    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: promptText,
        image,
        selectedLang,
        history: formattedHistory
      })
    });

    if (response.ok) {
      const data = await response.json();
      const finalText = data.text || 'Namaste! RAAHA is ready to assist you.';
      
      if (onStreamChunk) {
        onStreamChunk(finalText, finalText);
      }

      const actionSuggestion = detectActionSuggestion(promptText, finalText);
      return { text: finalText, actionSuggestion };
    }
  } catch (err) {
    console.warn('Backend AI chat request error, using fallback:', err);
  }

  // Resilient fallback guidance so RAAHA conversation never freezes
  const isHindi = selectedLang.includes('हिं') || selectedLang.includes('hindi') || /[\u0900-\u097F]/.test(promptText);
  let fallbackText = '';

  const q = promptText.toLowerCase();
  if (q.includes('withdraw') || q.includes('निकासी') || q.includes('पैसे निकालना')) {
    fallbackText = isHindi
      ? `नमस्ते! बैंक से पैसे निकालने के लिए:\n1. पासबुक साथ ले जाएं।\n2. आज की तारीख और पासबुक वाला नाम लिखें।\n3. राशि अंकों और शब्दों में भरें।\n4. अपने हस्ताक्षर करें।`
      : `Namaste! For Cash Withdrawal:\n1. Carry your original passbook.\n2. Write today's date and account holder name.\n3. Fill amount in figures and words.\n4. Sign as per bank records.`;
  } else if (q.includes('deposit') || q.includes('जमा')) {
    fallbackText = isHindi
      ? `नमस्ते! नकद जमा करने के लिए:\n1. 15 अंकों का बैंक खाता नंबर लिखें।\n2. ₹50,000 से अधिक पर पैन कार्ड आवश्यक है।\n3. मुहर लगी काउंटरफ़ॉइल रसीद अवश्य प्राप्त करें।`
      : `Namaste! For Cash Deposit:\n1. Fill the 15-digit account number.\n2. PAN card is required if depositing ₹50,000 or more.\n3. Always collect the stamped counterfoil slip.`;
  } else {
    fallbackText = isHindi
      ? `नमस्ते! मैं आपका राहा (RAAHA) बैंकिंग साथी हूँ। आप मुझसे बैंक पर्चियों, सरकारी प्रमाण पत्रों या धोखाधड़ी से बचाव के बारे में पूछ सकते हैं।`
      : `Namaste! I am RAAHA, your banking companion. You can ask me about bank slips, government schemes, or verifying suspicious messages.`;
  }

  if (onStreamChunk) {
    onStreamChunk(fallbackText, fallbackText);
  }

  const actionSuggestion = detectActionSuggestion(promptText, fallbackText);
  return { text: fallbackText, actionSuggestion };
}

/**
 * Text-to-Speech playback helper using Web Speech API
 */
export function playTextToSpeech(text: string, langName: string = 'हिंदी', onEnd?: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Web Speech API is not supported in this browser.');
    return () => {};
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean markdown symbols for cleaner audio narration
  const cleanText = text
    .replace(/[#*_`~>-]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const targetCode = LANGUAGE_SPEECH_CODES[langName] || 'hi-IN';
  utterance.lang = targetCode;
  utterance.rate = 0.95; // Slightly slower for better clarity for elderly citizens

  // Try to find matching voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(targetCode.split('-')[0]));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);

  // Return function to stop speech
  return () => {
    window.speechSynthesis.cancel();
    if (onEnd) onEnd();
  };
}

/**
 * Speech-to-Text Recognition Helper
 */
export function startVoiceRecognition({
  langName = 'हिंदी',
  onResult,
  onError,
  onEnd
}: {
  langName?: string;
  onResult: (transcript: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) onError('Voice input is not supported on this browser. Try using Google Chrome.');
    return () => {};
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = LANGUAGE_SPEECH_CODES[langName] || 'hi-IN';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition event error:', event.error);
      if (onError && event.error !== 'no-speech') {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    };
  } catch (err: any) {
    console.error('Speech recognition initiation error:', err);
    if (onError) onError(err.message || 'Could not start microphone.');
    return () => {};
  }
}
