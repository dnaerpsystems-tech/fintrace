/**
 * Add Investment Page
 * Create new investments with type selection and validation
 * Tier-One Standards: Form validation, error handling, intuitive UX
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  PieChart,
  LineChart,
  Lock,
  Shield,
  Landmark,
  Star,
  Home,
  Bitcoin,
  FileText,
  Briefcase,
  Check,
  Info,
  TrendingUp,
  TrendingDown,
  Calculator,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import {
  createInvestment,
  INVESTMENT_TYPE_CONFIG,
  TAX_SECTIONS,
  type InvestmentType,
  type CreateInvestmentInput,
} from '@/lib/services/investmentService';

// ==================== CONSTANTS ====================

const DEFAULT_USER_ID = 'default-user';

const INVESTMENT_TYPES: { type: InvestmentType; icon: React.ElementType }[] = [
  { type: 'mutual_fund', icon: PieChart },
  { type: 'stocks', icon: LineChart },
  { type: 'fixed_deposit', icon: Lock },
  { type: 'ppf', icon: Shield },
  { type: 'nps', icon: Landmark },
  { type: 'gold', icon: Star },
  { type: 'real_estate', icon: Home },
  { type: 'crypto', icon: Bitcoin },
  { type: 'bonds', icon: FileText },
  { type: 'other', icon: Briefcase },
];

const TAX_SECTION_OPTIONS = [
  { value: '', label: 'None' },
  { value: '80C', label: 'Section 80C (₹1.5L limit)' },
  { value: '80CCD(1B)', label: 'Section 80CCD(1B) - NPS (₹50K limit)' },
];

// ==================== VALIDATION ====================

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

function validateInvestmentForm(data: {
  name: string;
  type: InvestmentType;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Investment name must be at least 2 characters';
  }

  if (data.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }

  if (data.avgBuyPrice <= 0) {
    errors.avgBuyPrice = 'Average buy price must be greater than 0';
  }

  if (data.currentPrice <= 0) {
    errors.currentPrice = 'Current price must be greater than 0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ==================== COMPONENTS ====================

function InvestmentTypeCard({
  type,
  icon: Icon,
  isSelected,
  onSelect,
}: {
  type: InvestmentType;
  icon: React.ElementType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const config = INVESTMENT_TYPE_CONFIG[type];

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
        isSelected
          ? 'bg-violet-50 border-2 border-violet-500 shadow-sm'
          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
      }`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>
      <span
        className={`text-xs font-medium text-center ${
          isSelected ? 'text-violet-700' : 'text-gray-700'
        }`}
      >
        {config.label}
      </span>
    </motion.button>
  );
}

function ReturnPreview({
  investedAmount,
  currentValue,
}: {
  investedAmount: number;
  currentValue: number;
}) {
  const absoluteReturn = currentValue - investedAmount;
  const percentageReturn = investedAmount > 0 ? ((currentValue - investedAmount) / investedAmount) * 100 : 0;
  const isProfit = absoluteReturn >= 0;

  if (investedAmount === 0 || currentValue === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Return Preview</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Invested</p>
          <p className="font-semibold text-gray-900">{formatINR(investedAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Current Value</p>
          <p className="font-semibold text-gray-900">{formatINR(currentValue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Returns</p>
          <div className="flex items-center gap-1">
            {isProfit ? (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`font-semibold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}{formatINR(absoluteReturn)}
            </span>
          </div>
          <p className={`text-xs ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
            ({isProfit ? '+' : ''}{percentageReturn.toFixed(2)}%)
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function AddInvestmentPage() {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<InvestmentType>('mutual_fund');
  const [symbol, setSymbol] = useState('');
  const [folioNumber, setFolioNumber] = useState('');
  const [broker, setBroker] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [avgBuyPriceInput, setAvgBuyPriceInput] = useState('');
  const [currentPriceInput, setCurrentPriceInput] = useState('');
  const [isTaxSaving, setIsTaxSaving] = useState(false);
  const [taxSection, setTaxSection] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaxSection, setShowTaxSection] = useState(false);

  // Parse numeric values
  const quantity = useMemo(() => {
    const parsed = Number.parseFloat(quantityInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [quantityInput]);

  const avgBuyPrice = useMemo(() => parseAmount(avgBuyPriceInput), [avgBuyPriceInput]);
  const currentPrice = useMemo(() => parseAmount(currentPriceInput), [currentPriceInput]);

  // Calculate values
  const investedAmount = quantity * avgBuyPrice;
  const currentValue = quantity * currentPrice;

  // Auto-fill current price if empty
  const handleAvgBuyPriceChange = (value: string) => {
    setAvgBuyPriceInput(value);
    if (!currentPriceInput) {
      setCurrentPriceInput(value);
    }
  };

  // Show tax section selector for certain types
  const showTaxOptions = ['mutual_fund', 'ppf', 'nps', 'fixed_deposit', 'bonds'].includes(selectedType);

  const handleSave = async () => {
    // Validate
    const validation = validateInvestmentForm({
      name,
      type: selectedType,
      quantity,
      avgBuyPrice,
      currentPrice,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const input: CreateInvestmentInput = {
        name: name.trim(),
        type: selectedType,
        symbol: symbol.trim() || undefined,
        folioNumber: folioNumber.trim() || undefined,
        broker: broker.trim() || undefined,
        quantity,
        avgBuyPrice,
        currentPrice,
        isTaxSaving: isTaxSaving && !!taxSection,
        taxSection: isTaxSaving ? taxSection : undefined,
        notes: notes.trim() || undefined,
      };

      await createInvestment(input, DEFAULT_USER_ID);
      navigate('/invest');
    } catch (error) {
      console.error('Error creating investment:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create investment',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add Investment</h1>
            <p className="text-sm text-gray-500">Track your portfolio</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Investment Type */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Investment Type
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {INVESTMENT_TYPES.map(({ type, icon }) => (
              <InvestmentTypeCard
                key={type}
                type={type}
                icon={icon}
                isSelected={selectedType === type}
                onSelect={() => setSelectedType(type)}
              />
            ))}
          </div>
        </div>

        {/* Investment Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Investment Name *
          </Label>
          <Input
            id="name"
            placeholder={
              selectedType === 'mutual_fund'
                ? 'e.g., HDFC Mid Cap Fund'
                : selectedType === 'stocks'
                ? 'e.g., Reliance Industries'
                : 'Investment name'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1.5 ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Symbol / Folio / Broker Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="symbol" className="text-sm font-medium text-gray-700">
              {selectedType === 'mutual_fund' ? 'Scheme Code' : 'Symbol'}
            </Label>
            <Input
              id="symbol"
              placeholder={selectedType === 'stocks' ? 'e.g., RELIANCE' : 'Optional'}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="folio" className="text-sm font-medium text-gray-700">
              {selectedType === 'mutual_fund' ? 'Folio Number' : 'Account/ID'}
            </Label>
            <Input
              id="folio"
              placeholder="Optional"
              value={folioNumber}
              onChange={(e) => setFolioNumber(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        {/* Broker */}
        <div>
          <Label htmlFor="broker" className="text-sm font-medium text-gray-700">
            Broker / Platform
          </Label>
          <Input
            id="broker"
            placeholder="e.g., Zerodha, Groww, HDFC Bank"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Quantity and Prices */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="text"
              inputMode="decimal"
              placeholder={selectedType === 'mutual_fund' ? 'Units' : 'Qty'}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className={`mt-1.5 ${errors.quantity ? 'border-red-500' : ''}`}
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <Label htmlFor="avgBuyPrice" className="text-sm font-medium text-gray-700">
              Avg. Buy Price *
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <Input
                id="avgBuyPrice"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={avgBuyPriceInput}
                onChange={(e) => handleAvgBuyPriceChange(e.target.value)}
                className={`pl-7 ${errors.avgBuyPrice ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.avgBuyPrice && <p className="text-red-500 text-xs mt-1">{errors.avgBuyPrice}</p>}
          </div>

          <div>
            <Label htmlFor="currentPrice" className="text-sm font-medium text-gray-700">
              Current Price *
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <Input
                id="currentPrice"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={currentPriceInput}
                onChange={(e) => setCurrentPriceInput(e.target.value)}
                className={`pl-7 ${errors.currentPrice ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.currentPrice && <p className="text-red-500 text-xs mt-1">{errors.currentPrice}</p>}
          </div>
        </div>

        {/* Return Preview */}
        <AnimatePresence>
          {investedAmount > 0 && currentValue > 0 && (
            <ReturnPreview investedAmount={investedAmount} currentValue={currentValue} />
          )}
        </AnimatePresence>

        {/* Tax Saving Options */}
        {showTaxOptions && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="font-medium">Tax Saving Investment</p>
                    <p className="text-sm text-gray-500">Eligible for tax deduction</p>
                  </div>
                </div>
                <Switch
                  checked={isTaxSaving}
                  onCheckedChange={(checked) => {
                    setIsTaxSaving(checked);
                    if (checked) {
                      setShowTaxSection(true);
                      // Auto-select section based on type
                      if (selectedType === 'nps') {
                        setTaxSection('80CCD(1B)');
                      } else if (['mutual_fund', 'ppf', 'fixed_deposit'].includes(selectedType)) {
                        setTaxSection('80C');
                      }
                    } else {
                      setTaxSection('');
                    }
                  }}
                />
              </div>

              {isTaxSaving && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tax Section
                  </Label>
                  <select
                    value={taxSection}
                    onChange={(e) => setTaxSection(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-200 bg-white text-sm"
                  >
                    {TAX_SECTION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Any additional details..."
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            className="mt-1.5 min-h-[80px]"
          />
        </div>

        {/* Info Card */}
        <Card className="bg-violet-50 border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-violet-500 mt-0.5" />
              <div className="text-sm text-violet-700">
                <p className="font-medium mb-1">Investment Tracking</p>
                <p>
                  Update current prices periodically to track your returns accurately.
                  All values are stored in paisa for precision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Error */}
        {errors.submit && (
          <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
            {errors.submit}
          </p>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-12 bg-violet-500 hover:bg-violet-600 text-white font-semibold"
          disabled={!name || quantity <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            'Creating...'
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Add Investment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
