import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  ChevronDown,
  Calendar,
  FileText,
  Wallet,
  ArrowRightLeft,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";
import { NumPad } from "@/components/shared/NumPad";
import { CategoryPicker, defaultExpenseCategories, defaultIncomeCategories, defaultTransferCategories } from "@/components/shared/CategoryPicker";
import { useTransactions } from "@/db/hooks";
import { useAccounts } from "@/db/hooks";
import { useCategories } from "@/db/hooks";
import { TransactionType } from "@/types";
import { cn } from "@/lib/utils";

type TransactionTypeValue = "expense" | "income" | "transfer";

interface SelectedCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Format number with Indian comma system
function formatIndianNumber(num: number): string {
  const str = num.toString();
  const parts = str.split(".");
  let intPart = parts[0];
  const decPart = parts[1];

  // Indian number system: last 3 digits, then groups of 2
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    intPart = `${formatted},${lastThree}`;
  }

  return decPart ? `${intPart}.${decPart}` : intPart;
}

export function AddTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type") as TransactionTypeValue | null;

  const [activeType, setActiveType] = useState<TransactionTypeValue>(
    typeParam || "expense"
  );
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Database hooks
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { expenseCategories, incomeCategories, transferCategories } = useCategories();

  // Get categories based on type
  const categories = useMemo(() => {
    switch (activeType) {
      case "income":
        return incomeCategories;
      case "transfer":
        return transferCategories;
      default:
        return expenseCategories;
    }
  }, [activeType, expenseCategories, incomeCategories, transferCategories]);

  // Set default account when accounts load
  useMemo(() => {
    if (accounts?.length && !selectedAccountId) {
      const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
  }, [accounts, selectedAccountId]);

  const types: { id: TransactionTypeValue; label: string; color: string; activeColor: string }[] = [
    { id: "expense", label: "Expense", color: "text-destructive", activeColor: "bg-destructive" },
    { id: "income", label: "Income", color: "text-emerald-500", activeColor: "bg-emerald-500" },
    { id: "transfer", label: "Transfer", color: "text-violet-500", activeColor: "bg-violet-500" },
  ];

  const numericAmount = useMemo(() => {
    const parsed = Number.parseFloat(amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const formattedAmount = useMemo(() => {
    if (!amount) return "0";
    const parsed = Number.parseFloat(amount);
    if (Number.isNaN(parsed)) return "0";
    return formatIndianNumber(parsed);
  }, [amount]);

  const selectedAccount = useMemo(() => {
    return accounts?.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const selectedToAccount = useMemo(() => {
    return accounts?.find((a) => a.id === selectedToAccountId);
  }, [accounts, selectedToAccountId]);

  // Validation
  const canSave = useMemo(() => {
    if (numericAmount <= 0) return false;
    if (!selectedCategory) return false;
    if (!selectedAccountId) return false;
    if (activeType === "transfer" && !selectedToAccountId) return false;
    if (activeType === "transfer" && selectedAccountId === selectedToAccountId) return false;
    return true;
  }, [numericAmount, selectedCategory, selectedAccountId, selectedToAccountId, activeType]);

  // Reset category when type changes
  const handleTypeChange = useCallback((type: TransactionTypeValue) => {
    setActiveType(type);
    setSelectedCategory(null);
  }, []);

  const handleSave = async () => {
    if (!canSave || isSaving) return;

    setIsSaving(true);
    try {
      // Convert amount to paise (smallest unit)
      const amountInPaise = Math.round(numericAmount * 100);

      await createTransaction({
        userId: "default-user",
        type: activeType === "expense"
          ? TransactionType.EXPENSE
          : activeType === "income"
          ? TransactionType.INCOME
          : TransactionType.TRANSFER,
        amount: amountInPaise,
        currency: "INR",
        accountId: selectedAccountId,
        toAccountId: activeType === "transfer" ? selectedToAccountId : undefined,
        categoryId: selectedCategory?.id || "",
        description: note || selectedCategory?.name || "Transaction",
        date: new Date(selectedDate).toISOString(),
        tagIds: [],
        attachments: [],
        isRecurring: false,
        isFamilyTransaction: false,
        isPending: false,
        isExcludedFromStats: false,
      });

      // Show success animation
      setShowSuccess(true);

      // Navigate back after animation
      setTimeout(() => {
        navigate(-1);
      }, 800);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      setIsSaving(false);
    }
  };

  return (
    <Page className="bg-background">
      <Header
        title="Add Transaction"
        showBack
        rightActions={
          <motion.button
            className="p-2"
            onClick={() => navigate(-1)}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-6 h-6" />
          </motion.button>
        }
      />

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                activeType === "expense" ? "bg-destructive" :
                activeType === "income" ? "bg-emerald-500" : "bg-violet-500"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-[calc(100vh-var(--header-height)-var(--safe-area-top))]">
        {/* Transaction Type Tabs */}
        <motion.div
          className="flex bg-muted rounded-xl p-1 mx-4 mt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                activeType === type.id
                  ? `${type.activeColor} text-white`
                  : "text-muted-foreground"
              )}
            >
              {type.label}
            </button>
          ))}
        </motion.div>

        {/* Amount Display */}
        <motion.div
          className="px-4 py-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="ios-caption mb-2">
            {activeType === "expense" ? "You're spending" :
             activeType === "income" ? "You're receiving" : "You're transferring"}
          </p>
          <div className="flex items-center justify-center gap-1">
            <span className={cn(
              "text-3xl",
              activeType === "expense" ? "text-destructive" :
              activeType === "income" ? "text-emerald-500" : "text-violet-500"
            )}>₹</span>
            <span className={cn(
              "text-4xl font-bold rupee",
              activeType === "expense" ? "text-destructive" :
              activeType === "income" ? "text-emerald-500" : "text-violet-500"
            )}>
              {formattedAmount}
            </span>
          </div>
        </motion.div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Account Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="ios-caption block mb-2">
              {activeType === "transfer" ? "From Account" : "Account"}
            </label>
            <button
              type="button"
              onClick={() => setShowAccountPicker(!showAccountPicker)}
              className="ios-card w-full p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">
                  {selectedAccount?.name || "Select Account"}
                </span>
              </div>
              <ChevronDown className={cn(
                "w-5 h-5 text-muted-foreground transition-transform",
                showAccountPicker && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showAccountPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="ios-card mt-2 divide-y divide-border">
                    {accounts?.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setShowAccountPicker(false);
                        }}
                        className={cn(
                          "w-full p-3 flex items-center gap-3 transition-colors",
                          selectedAccountId === account.id && "bg-primary/5"
                        )}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${account.color}20` }}
                        >
                          <Wallet className="w-4 h-4" style={{ color: account.color }} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{account.name}</p>
                          <p className="ios-caption rupee">
                            ₹{formatIndianNumber(account.balance / 100)}
                          </p>
                        </div>
                        {selectedAccountId === account.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* To Account (for transfers) */}
          {activeType === "transfer" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="ios-caption block mb-2">To Account</label>
              <button
                type="button"
                onClick={() => setShowToAccountPicker(!showToAccountPicker)}
                className="ios-card w-full p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-violet-500" />
                  </div>
                  <span className="font-medium">
                    {selectedToAccount?.name || "Select Account"}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  showToAccountPicker && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {showToAccountPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ios-card mt-2 divide-y divide-border">
                      {accounts?.filter((a) => a.id !== selectedAccountId).map((account) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedToAccountId(account.id);
                            setShowToAccountPicker(false);
                          }}
                          className={cn(
                            "w-full p-3 flex items-center gap-3 transition-colors",
                            selectedToAccountId === account.id && "bg-primary/5"
                          )}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <Wallet className="w-4 h-4" style={{ color: account.color }} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{account.name}</p>
                            <p className="ios-caption rupee">
                              ₹{formatIndianNumber(account.balance / 100)}
                            </p>
                          </div>
                          {selectedToAccountId === account.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Category Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="ios-caption mb-2">Category</h3>
            <CategoryPicker
              categories={categories}
              type={activeType}
              selectedId={selectedCategory?.id}
              onSelect={(cat) => setSelectedCategory(cat)}
            />
          </motion.div>

          {/* Date Picker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="ios-caption block mb-2">Date</label>
            <div className="ios-card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-medium"
              />
            </div>
          </motion.div>

          {/* Note Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className="ios-caption block mb-2">Note (optional)</label>
            <div className="ios-card p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 bg-transparent border-none outline-none font-medium placeholder:text-muted-foreground"
              />
            </div>
          </motion.div>

          {/* Spacer for numpad */}
          <div className="h-4" />
        </div>

        {/* Fixed Bottom Section: NumPad + Save Button */}
        <div className="bg-background border-t border-border/50 px-4 pt-4 pb-6">
          {/* NumPad */}
          <NumPad
            value={amount}
            onChange={setAmount}
            className="mb-4"
          />

          {/* Save Button */}
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-lg text-white transition-all",
              activeType === "expense"
                ? "bg-destructive disabled:bg-destructive/50"
                : activeType === "income"
                ? "bg-emerald-500 disabled:bg-emerald-500/50"
                : "bg-violet-500 disabled:bg-violet-500/50",
              !canSave && "opacity-50"
            )}
            whileTap={canSave ? { scale: 0.98 } : undefined}
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Saving...
              </span>
            ) : (
              `Save ${activeType.charAt(0).toUpperCase() + activeType.slice(1)}`
            )}
          </motion.button>
        </div>
      </div>
    </Page>
  );
}

export default AddTransactionPage;
