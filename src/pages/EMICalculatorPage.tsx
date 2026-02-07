import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calculator, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatINR, parseAmount } from '@/lib/formatters/currency';
import { calculateEMI, generateAmortizationSchedule } from '@/lib/calculations/loan';
import { formatDate } from '@/lib/formatters/date';

export default function EMICalculatorPage() {
  const navigate = useNavigate();

  const [principalInput, setPrincipalInput] = useState('5000000');
  const [rate, setRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(120);
  const [copied, setCopied] = useState(false);

  const principal = parseAmount(principalInput);

  // Calculate EMI
  const emiResult = useMemo(() => {
    if (principal <= 0 || rate <= 0 || tenureMonths <= 0) {
      return null;
    }
    return calculateEMI(principal, rate, tenureMonths);
  }, [principal, rate, tenureMonths]);

  // Generate amortization schedule
  const schedule = useMemo(() => {
    if (principal <= 0 || rate <= 0 || tenureMonths <= 0) {
      return [];
    }
    return generateAmortizationSchedule({
      principal,
      annualRate: rate,
      tenureMonths,
      startDate: new Date(),
      emiDay: 5,
    });
  }, [principal, rate, tenureMonths]);

  const handleCopy = () => {
    if (!emiResult) return;

    const text = `EMI Calculator Result:
Principal: ${formatINR(principal)}
Interest Rate: ${rate}% p.a.
Tenure: ${tenureMonths} months
Monthly EMI: ${formatINR(emiResult.emi)}
Total Interest: ${formatINR(emiResult.totalInterest)}
Total Payment: ${formatINR(emiResult.totalPayment)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">EMI Calculator</h1>
            <p className="text-sm text-gray-500">Plan your loan repayments</p>
          </div>
          <button
            onClick={handleCopy}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            {copied ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Input Section */}
        <Card>
          <CardContent className="p-4 space-y-6">
            {/* Principal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">Loan Amount</Label>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatINR(principal, { compact: true })}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="50,00,000"
                  value={principalInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrincipalInput(e.target.value)}
                  className="pl-8 text-lg font-medium"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[1000000, 2500000, 5000000, 10000000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPrincipalInput((amount / 100).toString())}
                    className="px-3 py-1 text-xs font-medium bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {formatINR(amount * 100, { compact: true, showSymbol: false })}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">Interest Rate</Label>
                <span className="text-lg font-semibold text-emerald-600">{rate.toFixed(2)}%</span>
              </div>
              <Slider
                value={[rate]}
                onValueChange={(value: number[]) => setRate(value[0])}
                min={1}
                max={24}
                step={0.25}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1%</span>
                <span>24%</span>
              </div>
            </div>

            {/* Tenure */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">Loan Tenure</Label>
                <span className="text-lg font-semibold text-emerald-600">
                  {tenureMonths >= 12
                    ? `${Math.floor(tenureMonths / 12)} years ${tenureMonths % 12 > 0 ? `${tenureMonths % 12} mo` : ''}`
                    : `${tenureMonths} months`
                  }
                </span>
              </div>
              <Slider
                value={[tenureMonths]}
                onValueChange={(value: number[]) => setTenureMonths(value[0])}
                min={1}
                max={360}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1 month</span>
                <span>30 years</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[12, 36, 60, 120, 180, 240].map((months) => (
                  <button
                    key={months}
                    onClick={() => setTenureMonths(months)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      tenureMonths === months
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {months >= 12 ? `${months / 12}Y` : `${months}M`}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Card */}
        {emiResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-emerald-100 text-sm">Monthly EMI</p>
                    <p className="text-3xl font-bold">{formatINR(emiResult.emi)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-emerald-100 text-xs">Principal</p>
                    <p className="text-lg font-semibold">{formatINR(principal, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-xs">Interest</p>
                    <p className="text-lg font-semibold">{formatINR(emiResult.totalInterest, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-emerald-100 text-xs">Total</p>
                    <p className="text-lg font-semibold">{formatINR(emiResult.totalPayment, { compact: true })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Breakdown */}
        {emiResult && (
          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdown" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {/* Visual breakdown */}
                  <div className="h-4 rounded-full overflow-hidden flex mb-4">
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(principal / emiResult.totalPayment) * 100}%` }}
                    />
                    <div
                      className="bg-orange-500 transition-all"
                      style={{ width: `${(emiResult.totalInterest / emiResult.totalPayment) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-sm text-gray-600">Principal Amount</span>
                      </div>
                      <span className="font-semibold">{formatINR(principal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-sm text-gray-600">Total Interest</span>
                      </div>
                      <span className="font-semibold text-orange-600">{formatINR(emiResult.totalInterest)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm font-medium text-gray-900">Total Payment</span>
                      <span className="text-lg font-bold">{formatINR(emiResult.totalPayment)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-left">
                          <th className="px-4 py-2 font-medium text-gray-600">#</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Principal</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Interest</th>
                          <th className="px-4 py-2 font-medium text-gray-600 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {schedule.slice(0, 36).map((entry) => (
                          <tr key={entry.month} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-500">{entry.month}</td>
                            <td className="px-4 py-2 text-emerald-600">{formatINR(entry.principalComponent, { showSymbol: false, decimals: 0 })}</td>
                            <td className="px-4 py-2 text-orange-500">{formatINR(entry.interestComponent, { showSymbol: false, decimals: 0 })}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatINR(entry.closingBalance, { compact: true })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {schedule.length > 36 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Showing first 36 months of {schedule.length} total
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
