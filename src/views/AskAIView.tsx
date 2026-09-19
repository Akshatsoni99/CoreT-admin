import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { 
  ChevronLeft, 
  ChevronDown, 
  Bot, 
  Paperclip, 
  Mic, 
  MicOff, 
  Send, 
  Globe, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  X, 
  FileText, 
  Image as ImageIcon,
  Key,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import AppLogo from '../assets/new-logo.png';
import { 
  sendMessageToRaaha, 
  ChatMessage, 
  isGeminiConfigured, 
  getGeminiApiKey, 
  setCustomGeminiApiKey, 
  playTextToSpeech, 
  startVoiceRecognition 
} from '../services/geminiService';
import { BankFormModal, BankServiceType } from '../components/banking/BankFormModal';

interface AskAIViewProps {
  onNavigate?: (tab: string) => void;
  initialQuery?: string;
}

// Translations for UI & Suggestions
const LANGUAGE_CONTENT: Record<string, {
  welcome: string;
  checklist: string[];
  promptQuestion: string;
  suggestions: string[];
  placeholder: string;
  listeningText: string;
}> = {
  'English': {
    welcome: "Namaste! I'm RAAHA. I'm your guide to help you fill bank forms step by step, understand government services, and navigate paperwork with confidence.",
    checklist: [
      "Filling Cash Withdrawal & Deposit Slips",
      "Bank Transfer (NEFT/RTGS) & IFSC Assistance",
      "Required documents for citizen schemes",
      "Step-by-step guidance in simple words"
    ],
    promptQuestion: "How may I help you today?",
    suggestions: [
      "Withdrawal: How to fill a cash withdrawal slip?",
      "Deposit: What details are needed on deposit slip?",
      "Bank Transfer: What is IFSC code?",
      "How to get an income certificate?",
      "What documents are needed for Aadhaar e-KYC?"
    ],
    placeholder: "Type your banking or government question...",
    listeningText: "Listening... speak now"
  },
  'हिंदी': {
    welcome: "नमस्ते! मैं RAAHA (राहा) हूँ। मैं बैंक फॉर्म भरने, सरकारी योजनाओं और दस्तावेज़ों को समझने में आपकी मदद करने वाला आपका डिजिटल मार्गदर्शक हूँ।",
    checklist: [
      "कैश निकासी (Withdrawal) एवं जमा पर्ची भरना",
      "बैंक ट्रांसफर (NEFT/RTGS) एवं IFSC कोड सहायता",
      "सरकारी प्रमाणपत्र व योजनाओं के ज़रूरी दस्तावेज़",
      "आसान और सरल शब्दों में चरणबद्ध मार्गदर्शन"
    ],
    promptQuestion: "आज मैं आपकी क्या सहायता कर सकता हूँ?",
    suggestions: [
      "पैसे निकालना: निकासी पर्ची (Withdrawal Slip) कैसे भरें?",
      "पैसे जमा करना: बैंक जमा पर्ची में क्या विवरण चाहिए?",
      "बैंक ट्रांसफर: IFSC कोड क्या होता है और कहाँ मिलेगा?",
      "आय प्रमाण पत्र (Income Certificate) कैसे बनवाएं?",
      "आधार e-KYC के लिए कौन-से दस्तावेज़ आवश्यक हैं?"
    ],
    placeholder: "अपना बैंकिंग या सरकारी सवाल यहाँ पूछें...",
    listeningText: "सुन रहा हूँ... बोलिए"
  },
  'मराठी': {
    welcome: "नमस्कार! मी RAAHA आहे. बँक फॉर्म भरण्यासाठी, सरकारी योजना समजून घेण्यासाठी आणि कागदपत्रांच्या कामात मदत करण्यासाठी मी तुमचा मार्गदर्शक आहे.",
    checklist: [
      "पैसे काढणे व जमा पावती भरणे",
      "बँक ट्रान्सफर आणि IFSC कोड मदत",
      "सरकारी दाखल्यांसाठी लागणारी कागदपत्रे",
      "सोप्या भाषेत टप्प्याटप्प्याने मार्गदर्शन"
    ],
    promptQuestion: "मी आज तुम्हाला कशी मदत करू शकतो?",
    suggestions: [
      "पैसे काढणे: पैसे काढण्याची पावती कशी भरावी?",
      "ठेव पावती: पैसे जमा करण्यासाठी कोणती माहिती आवश्यक आहे?",
      "बँक ट्रान्सफर: IFSC कोड म्हणजे काय?",
      "उत्पन्नाचा दाखला (Income Certificate) कसा मिळवावा?",
      "आधार e-KYC साठी कोणती कागदपत्रे लागतात?"
    ],
    placeholder: "तुमचा प्रश्न येथे विचारा...",
    listeningText: "ऐकत आहे... बोला"
  },
  'ગુજરાતી': {
    welcome: "નમસ્તે! હું RAAHA છું. બેંક ફોર્મ ભરવા, સરકારી યોજનાઓ સમજવા અને દસ્તાવેજો માટે તમારો માર્ગદર્શક છું.",
    checklist: [
      "કેશ વિથડ્રોઅલ અને ડિપોઝિટ સ્લિપ ભરવી",
      "બેંક ટ્રાન્સફર અને IFSC કોડ સહાયતા",
      "સરકારી સેવાઓ માટે જરૂરી પુરાવા",
      "સરળ ભાષામાં સ્ટેપ-બાય-સ્ટેપ માર્ગદર્શન"
    ],
    promptQuestion: "આજે હું તમને કેવી રીતે મદદ કરી શકું?",
    suggestions: [
      "રૂપિયા ઉપાડવા: કેશ વિથડ્રોઅલ સ્લિપ કેવી રીતે ભરવી?",
      "ડિપોઝિટ: પૈસા જમા કરાવવાની સ્લિપમાં કઈ વિગતો જોઈએ?",
      "બેંક ટ્રાન્સફર: IFSC કોડ શું છે?",
      "આવકનું પ્રમાણપત્ર કેવી રીતે મેળવવું?",
      "આધાર e-KYC માટે કયા દસ્તાવેજો જરૂરી છે?"
    ],
    placeholder: "તમારો પ્રશ્ન અહીં લખો...",
    listeningText: "સાંભળી રહ્યું છે... બોલો"
  },
  'বাংলা': {
    welcome: "নমস্কার! আমি RAAHA। ব্যাঙ্ক ফর্ম পূরণ, সরকারি প্রকল্প এবং নথিপত্র বোঝার জন্য আমি আপনার ডিজিটাল সহায়ক।",
    checklist: [
      "টাকা তোলা ও জমা স্লিপ পূরণ",
      "ব্যাঙ্ক ট্রান্সফার ও IFSC কোড সহায়তা",
      "সরকারি স্কিম ও সার্টিফিকেটের প্রয়োজনীয় নথি",
      "সহজ ভাষায় ধাপে ধাপে নির্দেশিকা"
    ],
    promptQuestion: "আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    suggestions: [
      "টাকা তোলা: ক্যাশ উইথড্রয়াল স্লিপ কীভাবে পূরণ করবেন?",
      "জমা: ডিপোজিট স্লিপে কী কী বিবরণ প্রয়োজন?",
      "ব্যাঙ্ক ট্রান্সফার: IFSC কোড কী?",
      "ইনকাম সার্টিফিকেট কীভাবে পাবেন?",
      "আধার e-KYC এর জন্য কী কী নথি প্রয়োজন?"
    ],
    placeholder: "আপনার প্রশ্ন এখানে লিখুন...",
    listeningText: "শুনছি... বলুন"
  },
  'தமிழ்': {
    welcome: "வணக்கம்! நான் RAAHA. வங்கி படிவங்களை நிரப்பவும், அரசு திட்டங்களை புரிந்து கொள்ளவும் உங்கள் டிஜிட்டல் வழிகாட்டி.",
    checklist: [
      "பணம் எடுத்தல் & டெபாசிட் படிவங்களை நிரப்புதல்",
      "வங்கி பரிமாற்றம் & IFSC உதவி",
      "அரசு சான்றிதழ்களுக்கான ஆவணங்கள்",
      "எளிய மொழியில் படிப்படியான வழிகாட்டுதல்"
    ],
    promptQuestion: "இன்று நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
    suggestions: [
      "பணம் எடுத்தல்: பணம் எடுக்கும் படிவத்தை எவ்வாறு நிரப்புவது?",
      "வைப்பு: டெபாசிட் படிவத்தில் என்ன விவரங்கள் தேவை?",
      "வங்கி பரிமாற்றம்: IFSC குறியீடு என்றால் என்ன?",
      "வருமானச் சான்றிதழ் பெறுவது எப்படி?",
      "ஆதார் e-KYC-க்கு என்னென்ன ஆவணங்கள் தேவை?"
    ],
    placeholder: "உங்கள் கேள்வியை தட்டச்சு செய்யவும்...",
    listeningText: "கேட்கிறது... பேசுங்கள்"
  },
  'తెలుగు': {
    welcome: "నమస్తే! నేను RAAHA. బ్యాంక్ ఫారాలను పూరించడానికి, ప్రభుత్వ పథకాలను అర్థం చేసుకోవడానికి మీ డిజిటల్ గైడ్.",
    checklist: [
      "డబ్బు విత్‌డ్రా & డిపాజిట్ స్లిప్పులు నింపడం",
      "బ్యాంక్ బదిలీ & IFSC కోడ్ సహాయం",
      "ప్రభుత్వ ధృవీకరణ పత్రాలకు అవసరమైన పత్రాలు",
      "సులభమైన మాటల్లో దశలవారీ మార్గదర్శకత్వం"
    ],
    promptQuestion: "ఈ రోజు నేను మీకు ఎలా సహాయపడగలను?",
    suggestions: [
      "డబ్బు విత్‌డ్రా: క్యాష్ విత్‌డ్రా స్లిప్ ఎలా పూరించాలి?",
      "డిపాజిట్: డిపాజిట్ స్లిప్‌లో ఏ వివరాలు అవసరం?",
      "బ్యాంక్ బదిలీ: IFSC కోడ్ అంటే ఏమిటి?",
      "ఆదాయ ధృవీకరణ పత్రం (Income Certificate) ఎలా పొందాలి?",
      "ఆధార్ e-KYC కోసం ఏ పత్రాలు అవసరం?"
    ],
    placeholder: "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...",
    listeningText: "వింటున్నాను... మాట్లాడండి"
  }
};

/**
 * Format markdown text with bolding, lists, and headings
 */
function MarkdownFormattedText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-xs leading-relaxed text-gray-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading lines
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          const headingText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className="font-bold text-gray-900 text-sm mt-3 mb-1 text-[#002D5A]">
              {renderFormattedSpans(headingText)}
            </h4>
          );
        }

        // Bullet items (* or - or •)
        if (/^[-*•]\s+/.test(trimmed)) {
          const bulletText = trimmed.replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 ml-1">
              <span className="text-[#004B87] font-bold text-sm leading-none mt-0.5">•</span>
              <span className="flex-1">{renderFormattedSpans(bulletText)}</span>
            </div>
          );
        }

        // Numbered list items (1. 2.)
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            const num = match[1];
            const content = match[2];
            return (
              <div key={idx} className="flex items-start gap-2 ml-1">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-[#004B87] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{renderFormattedSpans(content)}</span>
              </div>
            );
          }
        }

        // Standard line
        return <p key={idx}>{renderFormattedSpans(trimmed)}</p>;
      })}
    </div>
  );
}

/**
 * Helper to parse bold **text** within a line
 */
function renderFormattedSpans(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function AskAIView({ onNavigate, initialQuery }: AskAIViewProps) {
  const [selectedLang, setSelectedLang] = useState('हिंदी');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeBankModal, setActiveBankModal] = useState<BankServiceType | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stopVoiceSpeechRef = useRef<(() => void) | null>(null);
  const stopRecognitionRef = useRef<(() => void) | null>(null);

  const languages = ['English', 'हिंदी', 'मराठी', 'ગુજરાતી', 'বাংলা', 'தமிழ்', 'తెలుగు'];
  const currentLangContent = LANGUAGE_CONTENT[selectedLang] || LANGUAGE_CONTENT['English'];

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Handle initial query if passed from HomeView
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim());
    }
  }, [initialQuery]);

  // Clean up audio speech on unmount
  useEffect(() => {
    return () => {
      if (stopVoiceSpeechRef.current) {
        stopVoiceSpeechRef.current();
      }
      if (stopRecognitionRef.current) {
        stopRecognitionRef.current();
      }
    };
  }, []);

  // Send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    const imageToSend = selectedImage;

    if (!text && !imageToSend) return;
    if (isGenerating) return;

    // Reset inputs
    setInputText('');
    setSelectedImage(null);

    const userMessageId = 'msg-' + Date.now();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: text || (imageToSend ? 'Analyze this document/form' : ''),
      timestamp: timeNow,
      image: imageToSend || undefined
    };

    // Placeholder bot message for streaming
    const botMessageId = 'bot-' + (Date.now() + 1);
    const placeholderBotMsg: ChatMessage = {
      id: botMessageId,
      role: 'model',
      text: '',
      timestamp: timeNow,
      isStreaming: true
    };

    setMessages(prev => [...prev, newUserMsg, placeholderBotMsg]);
    setIsGenerating(true);

    try {
      const response = await sendMessageToRaaha({
        message: text,
        image: imageToSend || undefined,
        selectedLang,
        history: messages,
        onStreamChunk: (_chunk, aggregated) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === botMessageId
                ? { ...m, text: aggregated, isStreaming: true }
                : m
            )
          );
        }
      });

      // Update final message state
      setMessages(prev =>
        prev.map(m =>
          m.id === botMessageId
            ? {
                ...m,
                text: response.text,
                isStreaming: false,
                actionSuggestion: response.actionSuggestion
              }
            : m
        )
      );
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error?.message || 'Sorry, I could not connect right now. Please check your internet connection or Gemini API key.';

      setMessages(prev =>
        prev.map(m =>
          m.id === botMessageId
            ? {
                ...m,
                text: `⚠️ **Notice**: ${errorMessage}`,
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice recording toggle
  const toggleVoiceRecording = () => {
    if (isRecording) {
      if (stopRecognitionRef.current) {
        stopRecognitionRef.current();
        stopRecognitionRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const stopFn = startVoiceRecognition({
      langName: selectedLang,
      onResult: (transcript) => {
        setInputText(prev => (prev ? prev + ' ' + transcript : transcript));
        setIsRecording(false);
      },
      onError: (err) => {
        console.warn('Voice recognition error:', err);
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });

    stopRecognitionRef.current = stopFn;
  };

  // Text to Speech playback
  const handlePlayAudio = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      if (stopVoiceSpeechRef.current) {
        stopVoiceSpeechRef.current();
        stopVoiceSpeechRef.current = null;
      }
      setSpeakingMessageId(null);
      return;
    }

    if (stopVoiceSpeechRef.current) {
      stopVoiceSpeechRef.current();
    }

    setSpeakingMessageId(msgId);
    stopVoiceSpeechRef.current = playTextToSpeech(text, selectedLang, () => {
      setSpeakingMessageId(null);
    });
  };

  // Copy text to clipboard
  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Reset chat conversation
  const handleResetChat = () => {
    if (stopVoiceSpeechRef.current) {
      stopVoiceSpeechRef.current();
    }
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
  };

  // Action Button Handler
  const handleActionClick = (action: ChatMessage['actionSuggestion']) => {
    if (!action) return;
    if (action.type === 'withdrawal' || action.type === 'deposit' || action.type === 'transfer') {
      setActiveBankModal(action.type);
    } else if (action.type === 'scam-shield' && onNavigate) {
      onNavigate('scam-shield');
    } else if (action.type === 'services' && onNavigate) {
      onNavigate('services');
    }
  };

  const isConfigured = isGeminiConfigured();

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] relative overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex justify-between items-center px-4 pt-12 pb-4 bg-white border-b border-gray-100 shadow-sm z-20 relative">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate ? onNavigate('home') : window.history.back()} 
            className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            title="Back to Home"
          >
            <ChevronLeft size={24} />
          </button>
          <img src={AppLogo} alt="CoreT" className="h-7 object-contain" />
          <div className="flex flex-col ml-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-gray-900 text-sm leading-tight">RAAHA</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-[#004B87]">
                <Sparkles size={10} className="text-[#004B87]" />
                <span>AI 3.6</span>
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium">Your banking & citizen guide</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={handleResetChat}
              title="Reset conversation"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <Globe size={14} className="text-[#004B87]" />
              <span>{selectedLang}</span>
              <ChevronDown size={14} />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLang(lang);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                      selectedLang === lang ? 'bg-blue-50 text-[#004B87] font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Scroll Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        
        {/* Welcome Card from RAAHA */}
        <div className="flex gap-3 max-w-[90%]">
          <div className="w-8 h-8 rounded-full bg-[#004B87] text-white flex items-center justify-center shrink-0 shadow-md mt-1">
            <Bot size={18} />
          </div>
          <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
            <p className="text-gray-800 text-sm mb-3 leading-relaxed">
              <strong>{currentLangContent.welcome}</strong>
            </p>
            <ul className="space-y-2 mb-4 text-xs text-gray-700">
              {currentLangContent.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#004B87] mt-0.5 font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-800 text-xs font-semibold">{currentLangContent.promptQuestion}</p>
          </div>
        </div>

        {/* Suggestion Chips (when conversation is just starting) */}
        {messages.length === 0 && (
          <div className="flex flex-col items-end gap-2 mt-4">
            {currentLangContent.suggestions.map((text, i) => (
              <button 
                key={i} 
                onClick={() => handleSendMessage(text)}
                className="bg-white border border-blue-200 text-[#004B87] text-xs font-medium px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm max-w-[90%] text-left hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-[0.99]"
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Chat Messages */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                {/* Attached Image Preview */}
                {msg.image && (
                  <div className="max-w-[75%] rounded-2xl overflow-hidden border border-blue-200 shadow-sm mb-1">
                    <img 
                      src={msg.image} 
                      alt="Uploaded slip" 
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                )}
                <div className="bg-[#004B87] text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-xs font-medium leading-relaxed">
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-400 mr-1">{msg.timestamp}</span>
              </div>
            );
          }

          // Model / Bot message
          return (
            <div key={msg.id} className="flex gap-3 max-w-[90%]">
              <div className="w-8 h-8 rounded-full bg-[#004B87] text-white flex items-center justify-center shrink-0 shadow-md mt-1">
                <Bot size={18} />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                  {msg.isStreaming && !msg.text ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-2 h-2 rounded-full bg-[#004B87] animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-[#004B87] animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 rounded-full bg-[#004B87] animate-bounce [animation-delay:0.4s]"></div>
                      <span className="text-xs text-gray-400 font-medium ml-2">RAAHA is thinking...</span>
                    </div>
                  ) : (
                    <MarkdownFormattedText text={msg.text} />
                  )}

                  {/* Interactive Action Suggestion Card */}
                  {msg.actionSuggestion && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleActionClick(msg.actionSuggestion)}
                        className="w-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 text-xs font-bold flex items-center justify-between transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={15} className="text-emerald-600" />
                          <span>{msg.actionSuggestion.label}</span>
                        </div>
                        <ArrowRight size={14} className="text-emerald-700" />
                      </button>
                    </div>
                  )}

                  {/* Message Tools (TTS Audio + Copy) */}
                  {!msg.isStreaming && msg.text && (
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-gray-400">
                      <span className="text-[10px] text-gray-400 font-medium">{msg.timestamp}</span>
                      <div className="flex items-center gap-1">
                        {/* Audio Narration Button */}
                        <button
                          onClick={() => handlePlayAudio(msg.id, msg.text)}
                          title={speakingMessageId === msg.id ? "Stop voice" : "Listen in voice"}
                          className={`p-1.5 rounded-lg transition-colors ${
                            speakingMessageId === msg.id 
                              ? 'bg-blue-100 text-[#004B87]' 
                              : 'hover:bg-gray-100 hover:text-gray-700'
                          }`}
                        >
                          {speakingMessageId === msg.id ? (
                            <div className="flex items-center gap-1 text-[#004B87]">
                              <VolumeX size={14} />
                              <span className="text-[10px] font-bold">Stop</span>
                            </div>
                          ) : (
                            <Volume2 size={14} />
                          )}
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          title="Copy response"
                          className="p-1.5 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar Section */}
      <div className="bg-white p-3 border-t border-gray-100 z-10 relative">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Selected Image Preview Pill */}
        {selectedImage && (
          <div className="mb-2 flex items-center justify-between bg-blue-50/70 border border-blue-200 px-3 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-blue-300 shrink-0 bg-white">
                <img src={selectedImage} alt="Attachment" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-semibold text-blue-900">Document / Slip Attached</span>
            </div>
            <button 
              onClick={() => setSelectedImage(null)}
              className="p-1 hover:bg-blue-100 text-blue-700 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Voice recording banner if active */}
        {isRecording && (
          <div className="mb-2 flex items-center justify-between bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl animate-pulse">
            <div className="flex items-center gap-2 text-red-700 text-xs font-bold">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
              <span>{currentLangContent.listeningText} ({selectedLang})</span>
            </div>
            <button 
              onClick={toggleVoiceRecording}
              className="text-xs font-bold text-red-700 underline"
            >
              Done
            </button>
          </div>
        )}

        {/* Input Controls */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1 pl-3">
          {/* Image Attachment Button */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach bank slip or document photo"
            className="p-1.5 text-gray-500 hover:text-[#004B87] hover:bg-gray-200 rounded-full transition-colors shrink-0"
          >
            <Paperclip size={20} />
          </button>

          {/* Text Input */}
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedImage ? "Ask a question about this slip/document..." : currentLangContent.placeholder}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-2 px-1 text-gray-800 placeholder-gray-400"
          />

          {/* Mic Button (Voice-to-Text) */}
          <button 
            type="button"
            onClick={toggleVoiceRecording}
            title={isRecording ? "Stop recording" : "Speak your question"}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all ${
              isRecording 
                ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-200' 
                : 'bg-[#004B87] text-white hover:bg-blue-800'
            }`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button 
            type="button"
            onClick={() => handleSendMessage()}
            disabled={(!inputText.trim() && !selectedImage) || isGenerating}
            title="Send question"
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-0.5 transition-all ${
              (inputText.trim() || selectedImage) && !isGenerating
                ? 'bg-[#004B87] text-white hover:bg-blue-800 shadow-md' 
                : 'bg-white border border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* Guided Bank Form Experience Modal */}
      {activeBankModal && (
        <BankFormModal 
          type={activeBankModal} 
          onClose={() => setActiveBankModal(null)} 
        />
      )}
    </div>
  );
}
