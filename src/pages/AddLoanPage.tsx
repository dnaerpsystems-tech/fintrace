import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Home, Car, User, GraduationCap, Gem,
  Briefcase, CreditCard, FileText, Check, IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import { calculateEMI, LOAN_TYPES, type LoanType } from '@/lib/calculations/loan';
import { validateLoan } from '@/lib/validators';

const loanTypeOptions: { type: LoanType; icon: React.ElementType }[] = [
  { type: 'home', icon: Home },
  { type: 'car', icon: Car },
  { type: 'personal', icon: User },
  { type: 'education', icon: GraduationCap },
  { type: 'gold', icon: Gem },
  { type: 'business', icon: Briefcase },
  { type: 'credit_card', icon: CreditCard },
  { type: 'other', icon: FileText },
];

export default function AddLoanPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<LoanType>('home');
  const [principalInput, setPrincipalInput] = useState('');
  const [rate, setRate] = useState<number>(LOAN_TYPES.home.defaultRate);
  const [tenureMonths, setTenureMonths] = useState(120);
  const [emiDay, setEmiDay] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const principal = parseAmount(principalInput);
  const typeConfig = LOAN_TYPES[selectedType];

  // Calculate EMI preview
  const emiResult = useMemo(() => {
    if (principal <= 0 || rate <= 0 || tenureMonths <= 0) {
      return null;
    }
    return calculateEMI(principal, rate, tenureMonths);
  }, [principal, rate, tenureMonths]);

  const handleTypeChange = (type: LoanType) => {
    setSelectedType(type);
    setRate(LOAN_TYPES[type].defaultRate);
  };

  const handleSave = () => {
    const validation = validateLoan({
      name,
      type: selectedType,
      principal,
      annualRate: rate,
      tenureMonths,
      emiDay,
      startDate: new Date(),
    });

    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      for (const error of validation.errors) {
        errorMap[error.field] = error.message;
      }
      setErrors(errorMap);
      return;
    }

    // TODO: Save to Dexie database
    console.log('Saving loan:', { name, type: selectedType, principal, rate, tenureMonths, emiDay });
    navigate('/loans');
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
            <h1 className="text-xl font-bold text-gray-900">Add Loan</h1>
            <p className="text-sm text-gray-500">Track your EMI payments</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Loan Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Loan Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Home Loan - HDFC"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="mt-1.5"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Loan Type */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Loan Type
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {loanTypeOptions.map(({ type, icon: Icon }) => {
              const config = LOAN_TYPES[type];
              const isSelected = selectedType === type;

              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTypeChange(type)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-2 border-emerald-500'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {config.label.split(' ')[0]}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Principal Amount */}
        <div>
          <Label htmlFor="principal" className="text-sm font-medium text-gray-700">
            Principal Amount
          </Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <Input
              id="principal"
              type="text"
              inputMode="numeric"
              placeholder="50,00,000"
              value={principalInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrincipalInput(e.target.value)}
              className="pl-8"
            />
          </div>
          {principal > 0 && (
            <p className="text-xs text-gray-500 mt-1">{formatINR(principal)}</p>
          )}
          {errors.principal && <p className="text-red-500 text-xs mt-1">{errors.principal}</p>}
        </div>

        {/* Interest Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">Interest Rate</Label>
            <span className="text-lg font-semibold text-emerald-600">{rate.toFixed(2)}% p.a.</span>
          </div>
          <Slider
            value={[rate]}
            onValueChange={(value: number[]) => setRate(value[0])}
            min={1}
            max={36}
            step={0.25}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1%</span>
            <span>36%</span>
          </div>
          {errors.annualRate && <p className="text-red-500 text-xs mt-1">{errors.annualRate}</p>}
        </div>

        {/* Tenure */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">Tenure</Label>
            <span className="text-lg font-semibold text-emerald-600">
              {tenureMonths >= 12
                ? `${Math.floor(tenureMonths / 12)} yrs ${tenureMonths % 12 > 0 ? `${tenureMonths % 12} mo` : ''}`
                : `${tenureMonths} months`
              }
            </span>
          </div>
          <Slider
            value={[tenureMonths]}
            onValueChange={(value: number[]) => setTenureMonths(value[0])}
            min={1}
            max={typeConfig.maxTenure}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 mo</span>
            <span>{Math.floor(typeConfig.maxTenure / 12)} yrs</span>
          </div>
          {errors.tenureMonths && <p className="text-red-500 text-xs mt-1">{errors.tenureMonths}</p>}
        </div>

        {/* EMI Day */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">EMI Due Date</Label>
            <span className="text-lg font-semibold text-emerald-600">{emiDay}th of every month</span>
          </div>
          <Slider
            value={[emiDay]}
            onValueChange={(value: number[]) => setEmiDay(value[0])}
            min={1}
            max={28}
            step={1}
            className="py-4"
          />
        </div>

        {/* EMI Preview Card */}
        {emiResult && (
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
            <CardContent className="p-5">
              <p className="text-emerald-100 text-sm font-medium mb-1">Monthly EMI</p>
              <p className="text-4xl font-bold">{formatINR(emiResult.emi)}</p>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-emerald-100 text-xs">Total Interest</p>
                  <p className="text-lg font-semibold">{formatINR(emiResult.totalInterest, { compact: true })}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs">Total Payment</p>
                  <p className="text-lg font-semibold">{formatINR(emiResult.totalPayment, { compact: true })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          disabled={!principal || !name}
        >
          <Check className="w-5 h-5 mr-2" />
          Save Loan
        </Button>
      </div>
    </div>
  );
}
