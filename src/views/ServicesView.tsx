import { useState } from 'react';
import { 
  ChevronLeft, 
  Search, 
  User, 
  HeartPulse, 
  Landmark, 
  GraduationCap, 
  Users, 
  Zap, 
  Flame, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import { BankFormModal, BankServiceType } from '../components/banking/BankFormModal';

interface ServiceItem {
  name: string;
  desc: string;
  docs: string[];
  url: string;
  slipType?: BankServiceType;
  icon?: any;
}

interface CategoryItem {
  id: string;
  icon: any;
  name: string;
  desc: string;
  color: string;
  bg: string;
  services: ServiceItem[];
}

// Data for Categories & Services with "Most Used Bank Services" included
const categoriesData: CategoryItem[] = [
  { 
    id: 'identity', 
    icon: User, 
    name: 'Identity', 
    desc: 'Aadhaar, PAN, Voter ID', 
    color: 'text-blue-500', 
    bg: 'bg-blue-50', 
    services: [
      { name: 'Aadhaar Card', desc: 'Unique Identification Authority of India', docs: ['Proof of Identity (POI)', 'Proof of Address (POA)', 'Date of Birth (DOB) Proof'], url: 'https://myaadhaar.uidai.gov.in/' },
      { name: 'PAN Card', desc: 'Income Tax Department', docs: ['Aadhaar Card', 'Passport Size Photo', 'Address Proof'], url: 'https://www.incometax.gov.in/' },
      { name: 'Voter ID', desc: 'Election Commission of India', docs: ['Address Proof', 'Age Proof (if 18-21)', 'Recent Photograph'], url: 'https://voters.eci.gov.in/' }
    ]
  },
  { 
    id: 'healthcare', 
    icon: HeartPulse, 
    name: 'Healthcare', 
    desc: 'Health cards, Medical benefits', 
    color: 'text-red-500', 
    bg: 'bg-red-50', 
    services: [
      { name: 'Ayushman Bharat Card', desc: 'National Health Authority', docs: ['Aadhaar Card', 'Ration Card', 'Income Certificate'], url: 'https://pmjay.gov.in/' },
      { name: 'ABHA Card', desc: 'Digital Health ID', docs: ['Aadhaar Card', 'Mobile Number'], url: 'https://abha.abdm.gov.in/' }
    ]
  },
  { 
    id: 'bank_services', 
    icon: Landmark, 
    name: 'Most Used Bank Services', 
    desc: 'Withdraw, deposit, transfer & KYC', 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    services: [
      { 
        name: 'Cash Withdrawal', 
        desc: 'Fill a cash withdrawal slip', 
        icon: ArrowDownLeft,
        slipType: 'withdrawal',
        docs: ['Bank Passbook', 'Physical Withdrawal Slip', 'Valid Identity Proof'], 
        url: '#' 
      },
      { 
        name: 'Cash Deposit', 
        desc: 'Fill a cash deposit slip', 
        icon: ArrowUpRight,
        slipType: 'deposit',
        docs: ['Cash/Cheque to deposit', 'Bank Account Number', 'PAN Card (if ₹50,000+)'], 
        url: '#' 
      },
      { 
        name: 'Bank Transfer', 
        desc: 'Fill a bank transfer form', 
        icon: ArrowRightLeft,
        slipType: 'transfer',
        docs: ['Applicant Account Details', 'Beneficiary Account Number', 'Bank IFSC Code'], 
        url: '#' 
      }
    ]
  },
  { 
    id: 'taxes', 
    icon: Landmark, 
    name: 'Taxes', 
    desc: 'Income Tax, Property Tax', 
    color: 'text-green-500', 
    bg: 'bg-green-50', 
    services: [
      { name: 'ITR Filing', desc: 'Income Tax Department', docs: ['Form 16', 'Bank Statements', 'PAN Card', 'Investment Proofs'], url: 'https://www.incometax.gov.in/' }
    ]
  },
  { 
    id: 'education', 
    icon: GraduationCap, 
    name: 'Education', 
    desc: 'Scholarships, Certificates', 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-50', 
    services: [
      { name: 'National Scholarship', desc: 'Ministry of Education', docs: ['Mark Sheets', 'Income Certificate', 'Caste Certificate', 'Bank Details'], url: 'https://scholarships.gov.in/' }
    ]
  },
  { 
    id: 'social_welfare', 
    icon: Users, 
    name: 'Social Welfare', 
    desc: 'Pensions, Benefits', 
    color: 'text-purple-500', 
    bg: 'bg-purple-50', 
    services: [
      { name: 'Old Age Pension', desc: 'Ministry of Rural Development', docs: ['Age Proof', 'Aadhaar Card', 'Income Certificate', 'BPL Card'], url: 'https://nsap.nic.in/' }
    ]
  },
  { 
    id: 'utilities', 
    icon: Zap, 
    name: 'Utilities', 
    desc: 'Electricity, Water, Gas', 
    color: 'text-orange-500', 
    bg: 'bg-orange-50', 
    services: [
      { name: 'New Electricity Connection', desc: 'State Electricity Board', docs: ['Ownership Proof', 'Identity Proof', 'Passport Size Photo'], url: 'https://www.india.gov.in/' }
    ]
  },
];

type ViewState = 
  | { type: 'main' }
  | { type: 'category'; categoryId: string }
  | { type: 'detail'; categoryId: string; serviceName: string };

export interface ServicesViewProps {
  onBack?: () => void;
}

export function ServicesView({ onBack }: ServicesViewProps) {
  const [view, setView] = useState<ViewState>({ type: 'main' });
  const [activeBankModal, setActiveBankModal] = useState<BankServiceType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categoriesData.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.desc.toLowerCase().includes(q) ||
      cat.services.some(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    );
  });

  const renderMainView = () => (
    <>
      <header className="flex flex-col px-4 pt-12 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center mb-4">
          <button 
            onClick={onBack} 
            className="p-1.5 -ml-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full flex items-center gap-1 transition-colors font-bold text-xs"
            title="Back to Home"
          >
            <ChevronLeft size={22} />
            <span className="text-xs">Back</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Services</h1>
        </div>
        <p className="text-gray-500 text-sm mb-4">Discover and apply for citizen & bank services across India.</p>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a service (e.g. withdrawal, income certificate)" 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Popular Categories</h2>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-blue-600 text-xs font-bold"
            >
              Clear Search
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {filteredCategories.map((cat) => (
            <button 
              key={cat.id} 
              onClick={() => setView({ type: 'category', categoryId: cat.id })}
              className={`border rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:border-blue-200 hover:shadow-md transition-all bg-white ${
                cat.id === 'bank_services' ? 'border-emerald-200/80 ring-1 ring-emerald-500/20' : 'border-gray-100'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center mb-3`}>
                <cat.icon size={24} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{cat.name}</h3>
              <p className="text-[10px] text-gray-500 leading-tight">{cat.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Trending Services</h2>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { name: 'Cash Withdrawal Slip', cat: 'bank_services', slip: 'withdrawal' as BankServiceType },
            { name: 'Cash Deposit Slip', cat: 'bank_services', slip: 'deposit' as BankServiceType },
            { name: 'Income Certificate', cat: 'identity' },
            { name: 'Caste Certificate', cat: 'identity' }
          ].map((item, i) => (
            <div 
              key={i} 
              onClick={() => {
                if (item.slip) {
                  setActiveBankModal(item.slip);
                } else {
                  setView({ type: 'category', categoryId: item.cat });
                }
              }}
              className="border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm bg-white cursor-pointer hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#004B87] font-bold w-6 text-center">{i + 1}</span>
                <div>
                  <span className="font-medium text-gray-900 text-sm block">{item.name}</span>
                  {item.slip && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      Bank Form Guide
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderCategoryView = (categoryId: string) => {
    const category = categoriesData.find(c => c.id === categoryId)!;
    const isBank = category.id === 'bank_services';
    
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        <header className="flex items-center px-4 pt-12 pb-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button onClick={() => setView({ type: 'main' })} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2.5 ml-2">
            <div className={`w-8 h-8 rounded-full ${category.bg} ${category.color} flex items-center justify-center`}>
              <category.icon size={18} />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">{category.name}</h1>
              <p className="text-[10px] text-gray-500">{category.desc}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
          {isBank && (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 mb-2 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Guided Bank Slip Assistant</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Select a slip below. RAAHA will guide you step by step to fill out the form easily, even without banking knowledge.
                </p>
              </div>
            </div>
          )}

          {category.services.map((service, i) => {
            const Icon = service.icon || FileText;
            return (
              <button 
                key={i} 
                onClick={() => {
                  if (service.slipType) {
                    setActiveBankModal(service.slipType);
                  } else {
                    setView({ type: 'detail', categoryId: category.id, serviceName: service.name });
                  }
                }}
                className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isBank ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#004B87]'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{service.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{service.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {service.slipType && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full hidden sm:inline-block">
                      Fill Slip
                    </span>
                  )}
                  <ChevronRight className="text-gray-400 shrink-0" size={20} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailView = (categoryId: string, serviceName: string) => {
    const category = categoriesData.find(c => c.id === categoryId)!;
    const service = category.services.find(s => s.name === serviceName)!;

    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        <header className="flex items-center px-4 pt-12 pb-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button onClick={() => setView({ type: 'category', categoryId })} className="p-2 -ml-2 text-gray-900">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2 truncate">{service.name}</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{service.desc}</p>
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 size={14} /> Official Government Service
            </span>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
               Important Documents Required
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              {service.docs.map((doc, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{doc}</span>
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">Required</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-100 absolute bottom-0 inset-x-0 z-20 pb-8">
          <button 
            onClick={() => window.open(service.url, '_blank')}
            className="w-full bg-[#004B87] hover:bg-blue-800 text-white rounded-full py-4 font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#004B87]/30"
          >
            Redirect to Official Website <ExternalLink size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white relative">
      {view.type === 'main' && renderMainView()}
      {view.type === 'category' && renderCategoryView(view.categoryId)}
      {view.type === 'detail' && renderDetailView(view.categoryId, view.serviceName)}

      {/* Guided Bank Form Experience Modal */}
      {activeBankModal && (
        <BankFormModal 
          type={activeBankModal} 
          source={activeBankModal === 'withdrawal' ? 'find_service_withdrawal' : 'find_service_deposit'}
          onClose={() => setActiveBankModal(null)} 
        />
      )}
    </div>
  );
}
