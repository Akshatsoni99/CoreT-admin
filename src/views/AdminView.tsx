import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  FileText, 
  Eye, 
  Copy, 
  CheckCheck, 
  X, 
  Download, 
  RefreshCcw, 
  AlertCircle,
  EyeOff,
  UserCheck,
  Calendar,
  Lock,
  ArrowLeft,
  Camera,
  Upload,
  PlayCircle,
  Sparkles,
  Check,
  Ban,
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { BankServiceRequest, BankServiceRequestStatus } from '../../server/types';
import { 
  fetchBankServiceRequests, 
  updateBankServiceRequestStatus,
  cleanAllBankRequests,
  restoreDefaultBankRequests
} from '../services/apiService';
import { maskAccountNumber } from '../services/bankAdminStore';

interface AdminViewProps {
  onBackToCitizen: () => void;
}

export function AdminView({ onBackToCitizen }: AdminViewProps) {
  const [requests, setRequests] = useState<BankServiceRequest[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<BankServiceRequest | null>(null);
  const [showFullAccount, setShowFullAccount] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Rejection reason modal state
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Clean all and Restore all confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'clean' | 'restore';
    title: string;
    message: string;
    isProcessing?: boolean;
  } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load requests from API
  const loadRequests = useCallback(async () => {
    try {
      const data = await fetchBankServiceRequests();
      setRequests(data);
      setLastSyncTime(new Date());

      // If a record is currently open in modal, keep it refreshed
      if (selectedRecord) {
        const found = data.find(r => r.id === selectedRecord.id || r.uniqueVerificationId === selectedRecord.uniqueVerificationId);
        if (found) setSelectedRecord(found);
      }
    } catch (e) {
      console.warn('Error loading requests:', e);
    }
  }, [selectedRecord?.id]);

  // Initial load and polling every 3 seconds for real-time live sync
  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadRequests();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Open Clean All Confirmation Dialog
  const handleOpenCleanModal = () => {
    setConfirmModal({
      isOpen: true,
      type: 'clean',
      title: 'ARE YOU SURE you want to clean all requests?',
      message: 'This will permanently remove all bank requests (Pending, Approved, and Rejected) from the database and local queue. This action cannot be undone.',
      isProcessing: false,
    });
  };

  // Open Restore All Confirmation Dialog
  const handleOpenRestoreModal = () => {
    setConfirmModal({
      isOpen: true,
      type: 'restore',
      title: 'ARE YOU SURE you want to restore default records?',
      message: 'This will reset the queue and restore fresh sample demo bank requests (Withdrawals, Deposits, and OCR Scans) for live testing.',
      isProcessing: false,
    });
  };

  // Confirm and Execute Clean or Restore Action
  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setConfirmModal(prev => prev ? { ...prev, isProcessing: true } : null);

    try {
      if (confirmModal.type === 'clean') {
        await cleanAllBankRequests();
        await loadRequests();
        setSelectedRecord(null);
        setNotification({ message: 'All bank requests have been cleaned successfully.', type: 'success' });
      } else if (confirmModal.type === 'restore') {
        await restoreDefaultBankRequests();
        await loadRequests();
        setNotification({ message: 'Default demo records have been restored successfully.', type: 'success' });
      }
    } catch (err: any) {
      console.error('Action failed:', err);
      setNotification({ message: `Action failed: ${err.message || 'Unknown error'}`, type: 'info' });
    } finally {
      setConfirmModal(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Cancel Confirmation
  const handleCloseConfirmModal = () => {
    if (confirmModal?.isProcessing) return;
    setConfirmModal(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status Action: Approve
  const handleApprove = async () => {
    if (!selectedRecord || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await updateBankServiceRequestStatus(
        selectedRecord.uniqueVerificationId || selectedRecord.id,
        {
          status: 'APPROVED',
          officer: 'Branch Manager',
        }
      );
      setSelectedRecord(updated);
      await loadRequests();
    } catch (e) {
      console.error('Approve failed:', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Status Action: Trigger Reject Dialog
  const handleOpenRejectModal = () => {
    setRejectionReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  // Status Action: Confirm Reject with reason
  const handleConfirmReject = async () => {
    if (!selectedRecord || isUpdatingStatus) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please select or enter a rejection reason.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const updated = await updateBankServiceRequestStatus(
        selectedRecord.uniqueVerificationId || selectedRecord.id,
        {
          status: 'REJECTED',
          officer: 'Branch Cashier',
          reason: rejectionReason.trim(),
        }
      );
      setSelectedRecord(updated);
      setRejectModalOpen(false);
      await loadRequests();
    } catch (e) {
      console.error('Reject failed:', e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Metrics Calculations
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;
  const withdrawals = requests.filter(r => r.serviceType === 'withdrawal');
  const deposits = requests.filter(r => r.serviceType === 'deposit');

  const totalVolume = requests.reduce((sum, r) => {
    const amt = r.amountNumeric || parseFloat((r.allFormFields?.amount || '0').replace(/,/g, ''));
    return isNaN(amt) ? sum : sum + amt;
  }, 0);

  // Filtering
  const filteredRecords = requests.filter(r => {
    // Service filter
    if (filterType !== 'all' && r.serviceType !== filterType) return false;
    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    // Source filter
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'ocr' && r.source !== 'ocr_scan') return false;
      if (sourceFilter === 'upload' && r.source !== 'upload_photo') return false;
      if (sourceFilter === 'demo' && !r.source?.startsWith('demo_')) return false;
      if (sourceFilter === 'find_service' && !r.source?.startsWith('find_service_')) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (r.uniqueVerificationId || r.id || '').toLowerCase().includes(q);
      const matchName = (r.accountHolderName || '').toLowerCase().includes(q);
      const matchAcc = (r.accountNumber || '').includes(q);
      const matchService = (r.serviceType || '').toLowerCase().includes(q);
      const matchSource = (r.source || '').toLowerCase().includes(q);
      const matchStatus = (r.status || '').toLowerCase().includes(q);
      if (!matchId && !matchName && !matchAcc && !matchService && !matchSource && !matchStatus) return false;
    }
    return true;
  });

  const getStatusBadge = (status: BankServiceRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <Clock size={12} className="text-amber-600" /> Pending Approval
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={12} className="text-emerald-600" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-300">
            <AlertCircle size={12} className="text-red-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'ocr_scan':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Camera size={10} /> Camera OCR
          </span>
        );
      case 'upload_photo':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Upload size={10} /> Uploaded Photo
          </span>
        );
      case 'demo_withdrawal':
      case 'demo_deposit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            <PlayCircle size={10} /> Demo Slip
          </span>
        );
      case 'find_service_withdrawal':
      case 'find_service_deposit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles size={10} /> Find a Service
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Direct
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowDownLeft size={16} className="text-red-600" />;
      case 'deposit':
        return <ArrowUpRight size={16} className="text-emerald-600" />;
      case 'transfer':
        return <ArrowRightLeft size={16} className="text-blue-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-gray-900 font-sans flex flex-col antialiased">
      {/* Top Operations Header */}
      <header className="bg-[#002D5A] text-white sticky top-0 z-30 shadow-md border-b border-blue-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Building2 size={20} className="text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base sm:text-lg">CoreT Bank Admin</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                  Branch Counter Operations
                </span>
              </div>
              <p className="text-[11px] text-blue-200">Live Request Verification & Audit System (REST API Connected)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            {/* CLEAN ALL Button */}
            <button
              onClick={handleOpenCleanModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-bold transition-all border border-red-400/30 shadow-xs hover:border-red-400/60 active:scale-95 cursor-pointer"
              title="Clean all requests from system queue"
            >
              <Trash2 size={13} className="text-red-300" />
              <span>Clean All</span>
            </button>

            {/* RESTORE ALL Button */}
            <button
              onClick={handleOpenRestoreModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-xs font-bold transition-all border border-emerald-400/30 shadow-xs hover:border-emerald-400/60 active:scale-95 cursor-pointer"
              title="Restore sample demo bank requests"
            >
              <RotateCcw size={13} className="text-emerald-300" />
              <span>Restore All</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20 active:scale-95 cursor-pointer"
              title="Refresh request queue from backend"
            >
              <RefreshCcw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Switch to Citizen App (if embedded) */}
            {onBackToCitizen && (
              <button
                onClick={onBackToCitizen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/20 active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={15} /> Switch to Citizen App
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Action Notification Banner */}
        {notification && (
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold shadow-xs transition-all animate-fadeIn ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
        
        {/* KPI Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Pending Queue</span>
            <span className="text-2xl font-black text-amber-600 block mt-1">{pendingCount}</span>
            <span className="text-[10px] text-gray-400">Needs Action</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Approved</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{approvedCount}</span>
            <span className="text-[10px] text-gray-400">Verified & Passed</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Rejected</span>
            <span className="text-2xl font-black text-red-600 block mt-1">{rejectedCount}</span>
            <span className="text-[10px] text-gray-400">With Saved Reasons</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Withdrawals</span>
            <span className="text-2xl font-black text-[#002D5A] block mt-1">{withdrawals.length}</span>
            <span className="text-[10px] text-gray-400">Cash Outflow</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Deposits</span>
            <span className="text-2xl font-black text-[#002D5A] block mt-1">{deposits.length}</span>
            <span className="text-[10px] text-gray-400">Cash Inflow</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Total Volume</span>
            <span className="text-xl font-black text-[#004B87] block mt-1 truncate">₹{totalVolume.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-gray-400">{totalCount} total requests</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Verification ID, Customer, Account, or Source..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#004B87] focus:bg-white"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { id: 'all', label: 'All Services' },
                  { id: 'withdrawal', label: 'Withdrawal' },
                  { id: 'deposit', label: 'Deposit' },
                  { id: 'transfer', label: 'Transfer' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      filterType === tab.id
                        ? 'bg-[#002D5A] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#004B87]"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Source Filter (Requirement 38) */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#004B87]"
              >
                <option value="all">All Sources</option>
                <option value="ocr">Camera OCR</option>
                <option value="upload">Uploaded Photo</option>
                <option value="demo">Demo Slips</option>
                <option value="find_service">Find a Service</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incoming Requests Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Live Incoming Bank Requests</h3>
              <p className="text-[11px] text-gray-500">
                Showing {filteredRecords.length} requests • Auto-refreshed {lastSyncTime.toLocaleTimeString()}
              </p>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Backend API Live Sync Active
            </span>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Building2 size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">No bank service requests match your criteria</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Completed user transactions from Find a Service, Scan a QR (Camera, Upload, Demo) will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Account Number</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Verification ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredRecords.map((record) => {
                    const recordId = record.uniqueVerificationId || record.id;
                    const isSelected = selectedRecord?.id === record.id || selectedRecord?.uniqueVerificationId === record.uniqueVerificationId;
                    const timeFormatted = new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr 
                        key={recordId}
                        className={`hover:bg-blue-50/40 transition-colors ${isSelected ? 'bg-blue-50/70' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                              {getTypeIcon(record.serviceType)}
                            </div>
                            <span className="font-bold text-gray-900 capitalize">{record.serviceType}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {record.accountHolderName}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {maskAccountNumber(record.accountNumber)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#004B87]">
                          {record.amountNumeric !== undefined ? `₹${record.amountNumeric.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {getSourceBadge(record.source)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="block font-medium">{record.date}</span>
                          <span className="text-[10px] text-gray-400">{timeFormatted}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-gray-200">
                            <span>{record.uniqueVerificationId || record.id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(record.uniqueVerificationId || record.id);
                              }}
                              className="text-gray-400 hover:text-gray-700"
                              title="Copy Verification ID"
                            >
                              {copiedId === (record.uniqueVerificationId || record.id) ? (
                                <CheckCheck size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowFullAccount(false);
                            }}
                            className="px-3 py-1.5 bg-[#004B87] hover:bg-blue-800 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Eye size={13} /> Inspect & Verify
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Record Inspection Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <header className="px-6 py-4 bg-[#002D5A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                  {getTypeIcon(selectedRecord.serviceType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base capitalize">{selectedRecord.purpose || `${selectedRecord.serviceType} Slip`}</h3>
                    {getSourceBadge(selectedRecord.source)}
                  </div>
                  <p className="text-[11px] text-blue-200 font-mono">
                    ID: {selectedRecord.uniqueVerificationId || selectedRecord.id} • {selectedRecord.requestId || selectedRecord.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </header>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Customer Details</span>
                  <div>
                    <span className="text-xs text-gray-500 block">Name:</span>
                    <span className="text-sm font-bold text-gray-900">{selectedRecord.accountHolderName}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Account Number:</span>
                      <button
                        onClick={() => setShowFullAccount(!showFullAccount)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showFullAccount ? <EyeOff size={11} /> : <Eye size={11} />}
                        {showFullAccount ? 'Mask' : 'Reveal'}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-xs text-gray-900">
                      {showFullAccount ? selectedRecord.accountNumber : maskAccountNumber(selectedRecord.accountNumber)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Bank & Branch:</span>
                    <span className="text-xs font-semibold text-gray-800">{selectedRecord.bankName || 'State Bank of India'} • {selectedRecord.branch || 'Main Branch'}</span>
                  </div>
                </div>

                {/* Amount & Date Info */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Transaction Value</span>
                  <div>
                    <span className="text-xs text-gray-500 block">Amount:</span>
                    <span className="text-xl font-black text-[#004B87]">
                      {selectedRecord.amountNumeric !== undefined ? `₹${selectedRecord.amountNumeric.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">In Words:</span>
                    <span className="text-xs font-semibold text-gray-700">{selectedRecord.amountInWords || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Date of Slip:</span>
                    <span className="text-xs font-bold text-gray-800">{selectedRecord.date}</span>
                  </div>
                </div>

                {/* Status & Timestamp */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Audit Status</span>
                  <div>
                    <span className="text-xs text-gray-500 block">Current State:</span>
                    <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Submitted At:</span>
                    <span className="text-xs text-gray-700 font-mono">
                      {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {selectedRecord.status === 'APPROVED' && selectedRecord.approvedAt && (
                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-xs text-emerald-800">
                      <span className="font-bold block">Approved by: {selectedRecord.approvedBy || 'Branch Cashier'}</span>
                      <span className="text-[10px] text-emerald-600 font-mono">{new Date(selectedRecord.approvedAt).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedRecord.status === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 p-2 rounded-lg text-xs text-red-800">
                      <span className="font-bold block">Rejected by: {selectedRecord.rejectedBy || 'Branch Cashier'}</span>
                      <p className="mt-0.5 text-xs text-red-700 font-medium">Reason: {selectedRecord.rejectionReason || 'Verification failed'}</p>
                      {selectedRecord.rejectedAt && (
                        <span className="text-[10px] text-red-500 font-mono block mt-0.5">{new Date(selectedRecord.rejectedAt).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Extracted vs User Confirmed Comparison (Requirement 13 & 16) */}
              {selectedRecord.ocrDetectedFields && Object.keys(selectedRecord.ocrDetectedFields).length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} /> OCR Document Intelligence Comparison
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-amber-200 text-amber-900 font-bold">
                          <th className="py-1.5 px-2">Field</th>
                          <th className="py-1.5 px-2">OCR Detected Value</th>
                          <th className="py-1.5 px-2">User Confirmed / Final Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {Object.entries(selectedRecord.ocrDetectedFields).map(([key, ocrVal]) => {
                          const finalVal = selectedRecord.finalFormData?.[key] || selectedRecord.allFormFields?.[key] || '—';
                          const isModified = ocrVal !== finalVal;
                          return (
                            <tr key={key} className={isModified ? 'bg-amber-100/50' : ''}>
                              <td className="py-1.5 px-2 font-bold text-gray-700 capitalize">{key}</td>
                              <td className="py-1.5 px-2 font-mono text-gray-600">{ocrVal || '—'}</td>
                              <td className="py-1.5 px-2 font-bold text-gray-900">
                                {finalVal}
                                {isModified && (
                                  <span className="ml-1.5 text-[10px] text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                    User Corrected
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Physical Slip Canvas Preview */}
              <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-100 border-b border-gray-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#004B87]" />
                    <span className="text-xs font-bold text-gray-800">
                      Completed Physical Slip Rendered with User Data & Drawn Signature
                    </span>
                  </div>
                  {selectedRecord.generatedSlipData && (
                    <a
                      href={selectedRecord.generatedSlipData}
                      download={`${selectedRecord.serviceType}-slip-${selectedRecord.uniqueVerificationId || selectedRecord.id}.png`}
                      className="px-2.5 py-1 rounded bg-white border border-gray-300 text-xs font-bold text-[#004B87] hover:bg-blue-50 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Download size={13} /> Download Slip PNG
                    </a>
                  )}
                </div>

                <div className="p-4 bg-gray-950 flex items-center justify-center min-h-[220px]">
                  {selectedRecord.generatedSlipData ? (
                    <img
                      src={selectedRecord.generatedSlipData}
                      alt="Completed Physical Slip"
                      className="max-w-full h-auto max-h-[440px] object-contain rounded border border-gray-700 shadow-xl"
                    />
                  ) : (
                    <div className="text-gray-400 text-xs">Physical slip preview not available</div>
                  )}
                </div>
              </div>

              {/* Uploaded / Captured Document (if applicable) */}
              {selectedRecord.uploadedDocument && (
                <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
                  <div className="p-3 bg-gray-100 border-b border-gray-300 flex items-center gap-2">
                    <Camera size={16} className="text-[#004B87]" />
                    <span className="text-xs font-bold text-gray-800">
                      Original Uploaded / Scanned Document Photo
                    </span>
                  </div>
                  <div className="p-4 bg-gray-900 flex items-center justify-center min-h-[180px]">
                    <img
                      src={selectedRecord.uploadedDocument}
                      alt="Uploaded Document"
                      className="max-w-full h-auto max-h-[360px] object-contain rounded border border-gray-700 shadow"
                    />
                  </div>
                </div>
              )}

              {/* Manual Drawn Signature Box */}
              {selectedRecord.signature && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <span className="text-xs font-bold text-gray-700 block mb-2">Captured User Signature Bitmap</span>
                  <div className="w-64 h-24 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-2">
                    <img
                      src={selectedRecord.signature}
                      alt="User Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Contextual Approve & Reject Action Controls (Requirements 17, 18, 19) */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#002D5A] uppercase tracking-wider">
                      Bank Officer Action Controls
                    </h4>
                    <p className="text-xs text-gray-500">
                      Process this transaction. Every decision is securely registered in the backend.
                    </p>
                  </div>
                  <div>{getStatusBadge(selectedRecord.status)}</div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Service Specific APPROVE button */}
                  <button
                    onClick={handleApprove}
                    disabled={isUpdatingStatus || selectedRecord.status === 'APPROVED'}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Check size={16} strokeWidth={3} />
                    <span>
                      {selectedRecord.serviceType === 'withdrawal'
                        ? 'APPROVE WITHDRAWAL'
                        : selectedRecord.serviceType === 'deposit'
                        ? 'APPROVE DEPOSIT'
                        : 'APPROVE REQUEST'}
                    </span>
                  </button>

                  {/* Service Specific REJECT button */}
                  <button
                    onClick={handleOpenRejectModal}
                    disabled={isUpdatingStatus || selectedRecord.status === 'REJECTED'}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Ban size={16} />
                    <span>
                      {selectedRecord.serviceType === 'withdrawal'
                        ? 'REJECT WITHDRAWAL'
                        : selectedRecord.serviceType === 'deposit'
                        ? 'REJECT DEPOSIT'
                        : 'REJECT REQUEST'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal (Requirement 19) */}
      {rejectModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-red-200 animate-in zoom-in-95 duration-150">
            <header className="px-5 py-3.5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                <h4 className="font-bold text-sm">
                  {selectedRecord.serviceType === 'withdrawal' ? 'Reject Withdrawal Request' : 'Reject Bank Request'}
                </h4>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-white hover:bg-white/10 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Please specify the reason for rejecting request{' '}
                <strong className="text-gray-900 font-mono">{selectedRecord.uniqueVerificationId || selectedRecord.id}</strong>.
                This reason will be stored in the audit record and viewable by the citizen.
              </p>

              {/* Quick Reason Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Quick Select Reasons
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Signature does not match bank records',
                    'Invalid account number',
                    'Insufficient account balance',
                    'Passbook not presented at counter',
                    'Amount in figures and words mismatch',
                    'Incomplete KYC documentation'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRejectionReason(preset);
                        setRejectError('');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-colors ${
                        rejectionReason === preset
                          ? 'bg-red-50 text-red-800 border-red-300 font-bold'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 block">
                  Custom Rejection Reason:
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (e.target.value.trim()) setRejectError('');
                  }}
                  placeholder="Type specific rejection details here..."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-red-500 focus:bg-white"
                />
                {rejectError && <p className="text-xs text-red-600 font-bold">{rejectError}</p>}
              </div>
            </div>

            <footer className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Ban size={14} />
                <span>{isUpdatingStatus ? 'Rejecting...' : 'Confirm Rejection'}</span>
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ARE YOU SURE Confirmation Dialog for CLEAN ALL and RESTORE ALL */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseConfirmModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-5 flex items-start gap-3.5 ${
              confirmModal.type === 'clean' ? 'bg-red-50/80 border-b border-red-100' : 'bg-emerald-50/80 border-b border-emerald-100'
            }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                confirmModal.type === 'clean' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
              }`}>
                {confirmModal.type === 'clean' ? <AlertTriangle size={22} /> : <RotateCcw size={22} />}
              </div>
              <div className="flex-1">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 ${
                  confirmModal.type === 'clean' ? 'bg-red-200/60 text-red-800' : 'bg-emerald-200/60 text-emerald-800'
                }`}>
                  {confirmModal.type === 'clean' ? 'Queue Management' : 'Data Reset'}
                </span>
                <h3 className="text-base font-black text-gray-900 leading-snug">
                  {confirmModal.title}
                </h3>
              </div>
              <button 
                onClick={handleCloseConfirmModal}
                disabled={confirmModal.isProcessing}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5">
              <p className="text-xs text-gray-600 leading-relaxed">
                {confirmModal.message}
              </p>

              {confirmModal.type === 'clean' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-amber-900 font-medium">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>All currently queued bank transactions will be deleted from both the REST server file storage and local browser storage.</span>
                </div>
              )}

              {confirmModal.type === 'restore' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-blue-900 font-medium">
                  <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>Will restore 5 fresh demo transactions (Cash Withdrawal, Cash Deposit, and OCR Scan) in Pending, Approved, and Rejected states.</span>
                </div>
              )}
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseConfirmModal}
                disabled={confirmModal.isProcessing}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                No, Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmModal.isProcessing}
                className={`px-4 py-2 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 ${
                  confirmModal.type === 'clean'
                    ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                }`}
              >
                {confirmModal.isProcessing ? (
                  <>
                    <RefreshCcw size={13} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : confirmModal.type === 'clean' ? (
                  <>
                    <Trash2 size={13} />
                    <span>Yes, Clean All</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Yes, Restore All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
