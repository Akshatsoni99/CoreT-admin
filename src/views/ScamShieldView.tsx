import { useState } from 'react';
import { ChevronLeft, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function ScamShieldView() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  const filters = ['All', 'Flagged', 'Suspicious', 'Safe'];

  const messages = [
    { sender: 'BANK OF INDIA', phone: '+91 98765 12345', time: '10:24 AM', status: 'Safe', text: 'Your account balance is ₹12,450...', fullText: 'Your account balance is ₹12,450.00 as of today. If this was not you, please contact support.', type: 'safe' },
    { sender: 'SBI', phone: '+91 88888 00000', time: '09:12 AM', status: 'High Risk', text: 'Your account will be blocked. Verif...', fullText: 'Your account will be blocked. Verify now: https://sbi-secure-login.com to avoid account suspension immediately.', type: 'danger' },
    { sender: 'Airtel', phone: '+91 77777 99999', time: 'Yesterday', status: 'Caution', text: 'Get 1GB data free! Click here: htt...', fullText: 'Get 1GB data free! Click here: http://bit.ly/4kJ8z. Valid only for today.', type: 'warning' },
    { sender: 'Amazon', phone: '+91 99999 55555', time: 'Yesterday', status: 'Safe', text: 'Your order #12345 has been shipped.', fullText: 'Your order #12345 has been shipped and will be delivered by tomorrow. Track here: amzn.in/track', type: 'safe' },
    { sender: 'Unknown', phone: '+91 84512 36987', time: 'Yesterday', status: 'High Risk', text: 'Claim your reward: https://bit.ly/...', fullText: 'Congratulations! Claim your reward of ₹50,000: https://bit.ly/claim-prize now.', type: 'danger' },
    { sender: 'Electricity Dept', phone: '+91 90000 11111', time: '2 days ago', status: 'Caution', text: 'Your power will be disconnected...', fullText: 'Your power will be disconnected at 9 PM tonight due to unpaid bills. Call this number to pay immediately.', type: 'warning' },
  ];

  const filteredMessages = messages.filter(msg => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Flagged') return msg.type === 'danger';
    if (activeFilter === 'Suspicious') return msg.type === 'warning';
    if (activeFilter === 'Safe') return msg.type === 'safe';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <header className="flex items-center px-4 pt-12 pb-4 bg-white border-b border-gray-100 z-10 relative">
        <button className="p-2 -ml-2 text-gray-900 invisible">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 ml-2">Scam Shield</h1>
      </header>

      <div className="bg-white px-4 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide z-10 relative">
        {filters.map(filter => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === filter ? 'bg-[#004B87] text-white' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filteredMessages.map((msg, i) => (
          <button 
            key={i} 
            onClick={() => setSelectedMessage(msg)}
            className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 text-left hover:border-blue-200 transition-all focus:outline-none"
          >
            <div className="shrink-0 mt-1 relative">
              {msg.type === 'safe' && <CheckCircle2 className="text-white bg-green-500 rounded-full" size={24} strokeWidth={2} />}
              {msg.type === 'danger' && <AlertTriangle className="text-white bg-red-500 rounded-full p-1" size={24} strokeWidth={2.5} />}
              {msg.type === 'warning' && <Info className="text-white bg-yellow-500 rounded-full p-0.5" size={24} strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col truncate pr-2">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{msg.sender}</h3>
                  <span className="text-xs text-gray-500 font-mono truncate">{msg.phone}</span>
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">{msg.time}</span>
              </div>
              <p className="text-gray-600 text-sm truncate mb-2">{msg.text}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block ${
                msg.type === 'safe' ? 'bg-green-100 text-green-700' : 
                msg.type === 'danger' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {msg.status}
              </span>
            </div>
          </button>
        ))}
        {filteredMessages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">No messages found in this category.</div>
        )}
      </div>

      {/* Modal / Popup for Selected Message */}
      {selectedMessage && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className={`p-6 text-white relative ${
                selectedMessage.type === 'safe' ? 'bg-green-500' : 
                selectedMessage.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                {selectedMessage.type === 'safe' && <CheckCircle2 size={32} strokeWidth={2} />}
                {selectedMessage.type === 'danger' && <AlertTriangle size={32} strokeWidth={2.5} />}
                {selectedMessage.type === 'warning' && <Info size={32} strokeWidth={2} />}
                <div>
                  <h2 className="text-xl font-bold">{selectedMessage.status} Message</h2>
                  <p className="text-white/80 text-sm">Analyzed by CoreT AI</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedMessage.sender}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedMessage.phone}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{selectedMessage.time}</span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">{selectedMessage.fullText}</p>
              </div>

              {selectedMessage.type === 'danger' && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                  <h4 className="text-red-800 font-bold text-sm mb-2">⚠️ Why this is dangerous:</h4>
                  <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                    <li>Sender appears to impersonate official source</li>
                    <li>Suspicious link detected</li>
                    <li>Urgent language used</li>
                  </ul>
                </div>
              )}

              <button 
                onClick={() => setSelectedMessage(null)}
                className="w-full mt-6 bg-gray-900 text-white font-bold py-3.5 rounded-full hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
