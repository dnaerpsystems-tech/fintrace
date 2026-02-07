/**
 * Bank Account Linking Page
 * Complete Setu Account Aggregator consent flow UI
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ChevronRight,
  Smartphone,
  CreditCard,
  PiggyBank,
  TrendingUp,
  FileText,
  ExternalLink,
  Loader2,
  X,
  Plus,
  Search
} from 'lucide-react';
import { setuAAService, SUPPORTED_FIPS, type FIType } from '@/lib/services/setuAAService';

// ============================================
// Types
// ============================================

interface LinkedBank {
  id: string;
  bankName: string;
  bankLogo?: string;
  maskedAccountNumber: string;
  accountType: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  consentId: string;
  linkedAt: string;
  expiresAt: string;
  lastSynced?: string;
}

interface ConsentStep {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

// ============================================
// Mock Data
// ============================================

const mockLinkedBanks: LinkedBank[] = [
  {
    id: '1',
    bankName: 'HDFC Bank',
    maskedAccountNumber: 'XXXX XXXX 4521',
    accountType: 'Savings Account',
    status: 'active',
    consentId: 'consent_abc123',
    linkedAt: '2025-01-15T10:30:00Z',
    expiresAt: '2026-01-15T10:30:00Z',
    lastSynced: '2026-02-07T08:00:00Z',
  },
  {
    id: '2',
    bankName: 'ICICI Bank',
    maskedAccountNumber: 'XXXX XXXX 7832',
    accountType: 'Savings Account',
    status: 'active',
    consentId: 'consent_def456',
    linkedAt: '2025-02-20T14:15:00Z',
    expiresAt: '2026-02-20T14:15:00Z',
    lastSynced: '2026-02-06T22:00:00Z',
  },
];

const FI_TYPE_OPTIONS: { value: FIType; label: string; icon: React.ElementType }[] = [
  { value: 'DEPOSIT', label: 'Bank Accounts', icon: Building2 },
  { value: 'CREDIT_CARD', label: 'Credit Cards', icon: CreditCard },
  { value: 'RECURRING_DEPOSIT', label: 'Recurring Deposits', icon: PiggyBank },
  { value: 'TERM_DEPOSIT', label: 'Fixed Deposits', icon: PiggyBank },
  { value: 'MUTUAL_FUNDS', label: 'Mutual Funds', icon: TrendingUp },
  { value: 'INSURANCE_POLICIES', label: 'Insurance', icon: Shield },
  { value: 'NPS', label: 'NPS', icon: FileText },
];

// ============================================
// Component
// ============================================

export default function BankLinkingPage() {
  const navigate = useNavigate();
  const [linkedBanks, setLinkedBanks] = useState<LinkedBank[]>(mockLinkedBanks);
  const [isLinking, setIsLinking] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showConsentFlow, setShowConsentFlow] = useState(false);
  const [selectedBank, setSelectedBank] = useState<typeof SUPPORTED_FIPS[number] | null>(null);
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedFITypes, setSelectedFITypes] = useState<FIType[]>(['DEPOSIT']);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [consentSteps, setConsentSteps] = useState<ConsentStep[]>([
    { step: 1, title: 'Enter Details', description: 'Provide your mobile number', status: 'active' },
    { step: 2, title: 'Select Data Types', description: 'Choose what to share', status: 'pending' },
    { step: 3, title: 'Authorize', description: 'Complete on bank app', status: 'pending' },
    { step: 4, title: 'Complete', description: 'Account linked', status: 'pending' },
  ]);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState<LinkedBank | null>(null);

  const filteredBanks = SUPPORTED_FIPS.filter(bank =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartLinking = () => {
    setShowLinkDialog(true);
    setCurrentStep(1);
    setMobileNumber('');
    setSelectedFITypes(['DEPOSIT']);
    setSelectedBank(null);
    setConsentUrl(null);
    updateStepStatus(1, 'active');
  };

  const updateStepStatus = (step: number, status: ConsentStep['status']) => {
    setConsentSteps(prev => prev.map(s => ({
      ...s,
      status: s.step === step ? status :
              s.step < step ? 'completed' :
              s.step > step ? 'pending' : s.status
    })));
  };

  const handleSelectBank = (bank: typeof SUPPORTED_FIPS[number]) => {
    setSelectedBank(bank);
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!mobileNumber || mobileNumber.length !== 10) {
        return;
      }
      updateStepStatus(1, 'completed');
      updateStepStatus(2, 'active');
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedFITypes.length === 0) {
        return;
      }
      updateStepStatus(2, 'completed');
      updateStepStatus(3, 'active');
      setCurrentStep(3);

      // Create consent request
      setIsLinking(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In production, this would call the AA API
        const mockConsentUrl = `https://anumati.setu.co/consent?id=mock_${Date.now()}`;
        setConsentUrl(mockConsentUrl);
      } catch (error) {
        updateStepStatus(3, 'error');
      } finally {
        setIsLinking(false);
      }
    } else if (currentStep === 3) {
      // Simulate consent completion
      setIsLinking(true);
      await new Promise(resolve => setTimeout(resolve, 2000));

      updateStepStatus(3, 'completed');
      updateStepStatus(4, 'completed');
      setCurrentStep(4);
      setIsLinking(false);

      // Add new linked bank
      if (selectedBank) {
        const newBank: LinkedBank = {
          id: `bank_${Date.now()}`,
          bankName: selectedBank.name,
          maskedAccountNumber: `XXXX XXXX ${Math.floor(1000 + Math.random() * 9000)}`,
          accountType: 'Savings Account',
          status: 'active',
          consentId: `consent_${Date.now()}`,
          linkedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          lastSynced: new Date().toISOString(),
        };
        setLinkedBanks(prev => [...prev, newBank]);
      }
    }
  };

  const handleCloseDialog = () => {
    setShowLinkDialog(false);
    setShowConsentFlow(false);
  };

  const handleRefreshBank = async (bankId: string) => {
    setRefreshingId(bankId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLinkedBanks(prev => prev.map(b =>
      b.id === bankId ? { ...b, lastSynced: new Date().toISOString() } : b
    ));
    setRefreshingId(null);
  };

  const handleUnlinkBank = async (bank: LinkedBank) => {
    setUnlinkingId(bank.id);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLinkedBanks(prev => prev.filter(b => b.id !== bank.id));
    setUnlinkingId(null);
    setShowUnlinkConfirm(null);
  };

  const toggleFIType = (fiType: FIType) => {
    setSelectedFITypes(prev =>
      prev.includes(fiType)
        ? prev.filter(t => t !== fiType)
        : [...prev, fiType]
    );
  };

  const getStatusBadge = (status: LinkedBank['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-gray-100 text-gray-700">Revoked</Badge>;
    }
  };

  return (
    <Page>
      <Header title="Bank Connections" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Link2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">Account Aggregator</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Securely link your bank accounts via RBI-approved AA framework
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{linkedBanks.length}</p>
                <p className="text-sm text-emerald-100">Linked Accounts</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  {linkedBanks.filter(b => b.status === 'active').length}
                </p>
                <p className="text-sm text-emerald-100">Active Consents</p>
              </div>
            </div>

            <Button
              onClick={handleStartLinking}
              className="w-full mt-6 bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Link New Account
            </Button>
          </Card>
        </motion.div>

        {/* Linked Accounts */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Linked Accounts
          </h3>

          {linkedBanks.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Link2 className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-medium text-gray-900">No accounts linked</h4>
              <p className="text-sm text-gray-500 mt-1">
                Link your bank accounts to automatically import transactions
              </p>
              <Button onClick={handleStartLinking} className="mt-4">
                Link Account
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedBanks.map((bank, index) => (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{bank.bankName}</h4>
                            <p className="text-sm text-gray-500">{bank.maskedAccountNumber}</p>
                          </div>
                          {getStatusBadge(bank.status)}
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Synced {bank.lastSynced ? new Date(bank.lastSynced).toLocaleDateString('en-IN') : 'Never'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Expires {new Date(bank.expiresAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefreshBank(bank.id)}
                            disabled={refreshingId === bank.id}
                          >
                            {refreshingId === bank.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            <span className="ml-1">Sync</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowUnlinkConfirm(bank)}
                          >
                            <Unlink className="w-4 h-4" />
                            <span className="ml-1">Unlink</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Security Info */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">Secure & RBI Approved</h4>
              <p className="text-sm text-blue-700 mt-1">
                Account Aggregator is an RBI-regulated framework. Your data is encrypted
                and shared only with your explicit consent. You can revoke access anytime.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Link Account Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Bank Account</DialogTitle>
            <DialogDescription>
              Connect your bank account securely via Account Aggregator
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
            {consentSteps.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.status === 'completed' ? 'bg-emerald-500 text-white' :
                  step.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' :
                  step.status === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.step
                  )}
                </div>
                {index < consentSteps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    step.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Mobile Number */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label>Mobile Number</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">+91</span>
                    <Input
                      type="tel"
                      placeholder="Enter 10-digit mobile"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the mobile number linked to your bank account
                  </p>
                </div>

                <div>
                  <Label>Select Bank (Optional)</Label>
                  <div className="mt-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search banks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {filteredBanks.map(bank => (
                      <button
                        key={bank.id}
                        onClick={() => handleSelectBank(bank)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          selectedBank?.id === bank.id
                            ? 'bg-emerald-100 border border-emerald-300'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">{bank.name}</span>
                        {selectedBank?.id === bank.id && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Data Types */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <Label>Select Data Types to Share</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose what financial information you want to share
                  </p>
                </div>

                <div className="space-y-2">
                  {FI_TYPE_OPTIONS.map(option => {
                    const Icon = option.icon;
                    const isSelected = selectedFITypes.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleFIType(option.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                        </div>
                        <span className="flex-1 text-left font-medium">{option.label}</span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Card className="p-3 bg-amber-50 border-amber-200">
                  <p className="text-xs text-amber-700">
                    <strong>Data Retention:</strong> Your data will be stored for 12 months.
                    You can revoke consent anytime from this page.
                  </p>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Authorization */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 text-center"
              >
                {isLinking && !consentUrl ? (
                  <div className="py-8">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600">Creating consent request...</p>
                  </div>
                ) : consentUrl ? (
                  <>
                    <div className="py-4">
                      <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                        <Smartphone className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h4 className="mt-4 font-semibold text-gray-900">
                        Complete Authorization
                      </h4>
                      <p className="mt-2 text-sm text-gray-500">
                        Click the button below to authorize on your bank's app or website
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => window.open(consentUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Bank Authorization
                    </Button>

                    <p className="text-xs text-gray-500">
                      After completing authorization, click "I've Authorized" below
                    </p>
                  </>
                ) : null}
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </motion.div>
                <h4 className="mt-4 font-semibold text-gray-900 text-lg">
                  Account Linked Successfully!
                </h4>
                <p className="mt-2 text-sm text-gray-500">
                  Your bank account has been linked. Transactions will be imported shortly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter className="flex gap-2">
            {currentStep < 4 && (
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
            )}
            <Button
              onClick={currentStep === 4 ? handleCloseDialog : handleNextStep}
              disabled={
                isLinking ||
                (currentStep === 1 && mobileNumber.length !== 10) ||
                (currentStep === 2 && selectedFITypes.length === 0)
              }
              className="flex-1"
            >
              {isLinking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {currentStep === 3 && consentUrl ? "I've Authorized" :
               currentStep === 4 ? 'Done' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={!!showUnlinkConfirm} onOpenChange={() => setShowUnlinkConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Account?</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink {showUnlinkConfirm?.bankName}?
              This will revoke the consent and stop syncing transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlinkConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showUnlinkConfirm && handleUnlinkBank(showUnlinkConfirm)}
              disabled={unlinkingId === showUnlinkConfirm?.id}
            >
              {unlinkingId === showUnlinkConfirm?.id && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Unlink Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
