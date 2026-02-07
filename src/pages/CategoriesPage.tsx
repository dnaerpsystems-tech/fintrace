/**
 * Categories Management Page
 * Manage expense and income categories
 * Tier-One Standards: Full CRUD, validation, search, sorting
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  Tag,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Zap,
  Film,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  Gift,
  Phone,
  Wifi,
  Fuel,
  Shirt,
  Baby,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  Repeat,
  Users,
  Star,
  MoreHorizontal,
  Loader2,
  Archive,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCategories } from '@/db/hooks';
import { CategoryType, type Category } from '@/types';

// ==================== CONSTANTS ====================

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  shopping: ShoppingCart,
  food: Coffee,
  transport: Car,
  housing: Home,
  utilities: Zap,
  entertainment: Film,
  health: Heart,
  business: Briefcase,
  education: GraduationCap,
  travel: Plane,
  gifts: Gift,
  phone: Phone,
  internet: Wifi,
  fuel: Fuel,
  clothing: Shirt,
  kids: Baby,
  savings: PiggyBank,
  credit: CreditCard,
  wallet: Wallet,
  investment: TrendingUp,
  subscription: Repeat,
  family: Users,
  star: Star,
  tag: Tag,
  other: MoreHorizontal,
};

const ICON_OPTIONS = Object.keys(CATEGORY_ICONS);

const COLOR_OPTIONS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
];

// ==================== TYPES ====================

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

// ==================== COMPONENTS ====================

function CategoryCard({
  category,
  onEdit,
  onArchive,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const IconComponent = CATEGORY_ICONS[category.icon] || Tag;

  return (
    <motion.div
      className="ios-card p-4"
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <IconComponent className="w-6 h-6" style={{ color: category.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{category.name}</p>
            {category.isSystem && (
              <Lock className="w-3 h-3 text-gray-400" />
            )}
          </div>
          <p className="text-xs text-gray-500 capitalize">{category.type}</p>
        </div>

        {!category.isSystem && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <Edit3 className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={onDelete}
              className="w-9 h-9 rounded-full hover:bg-red-100 flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CategoryFormSheet({
  isOpen,
  onClose,
  onSave,
  category,
  mode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  category?: Category;
  mode: 'add' | 'edit';
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    icon: category?.icon || 'tag',
    color: category?.color || COLOR_OPTIONS[0],
    type: category?.type || CategoryType.EXPENSE,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    if (formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form when category changes
  useState(() => {
    if (category) {
      setFormData({
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
      });
    }
  });

  const IconComponent = CATEGORY_ICONS[formData.icon] || Tag;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{mode === 'add' ? 'Add Category' : 'Edit Category'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Preview */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <IconComponent className="w-10 h-10" style={{ color: formData.color }} />
              </div>
              <p className="font-medium text-gray-900">{formData.name || 'Category Name'}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label>Category Name</Label>
            <Input
              placeholder="e.g., Groceries, Utilities"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {/* Type (only for new categories) */}
          {mode === 'add' && (
            <div>
              <Label className="mb-3 block">Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, type: CategoryType.EXPENSE })}
                  className={`p-3 rounded-xl border-2 ${
                    formData.type === CategoryType.EXPENSE
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span className={formData.type === CategoryType.EXPENSE ? 'text-red-700 font-medium' : 'text-gray-600'}>
                    Expense
                  </span>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: CategoryType.INCOME })}
                  className={`p-3 rounded-xl border-2 ${
                    formData.type === CategoryType.INCOME
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200'
                  }`}
                >
                  <span className={formData.type === CategoryType.INCOME ? 'text-emerald-700 font-medium' : 'text-gray-600'}>
                    Income
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <Label className="mb-3 block">Color</Label>
            <div className="flex flex-wrap gap-3">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-full transition-all ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <Label className="mb-3 block">Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((icon) => {
                const Icon = CATEGORY_ICONS[icon];
                const isSelected = formData.icon === icon;

                return (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          >
            {isSaving ? 'Saving...' : mode === 'add' ? 'Create Category' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==================== MAIN COMPONENT ====================

export default function CategoriesPage() {
  const navigate = useNavigate();

  // Hooks
  const {
    categories,
    expenseCategories,
    incomeCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    archiveCategory,
  } = useCategories();

  // State
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const cats = activeTab === 'expense' ? expenseCategories : incomeCategories;

    if (!searchQuery.trim()) return cats;

    return cats.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, expenseCategories, incomeCategories, searchQuery]);

  // Handlers
  const handleAddCategory = async (data: CategoryFormData) => {
    await createCategory({
      name: data.name.trim(),
      type: data.type,
      icon: data.icon,
      color: data.color,
      isSystem: false,
      isArchived: false,
      sortOrder: filteredCategories.length,
      keywords: [],
      merchantPatterns: [],
    });
    setResult({ type: 'success', message: 'Category created!' });
  };

  const handleEditCategory = async (data: CategoryFormData) => {
    if (!editCategory) return;

    await updateCategory(editCategory.id, {
      name: data.name.trim(),
      icon: data.icon,
      color: data.color,
    });
    setResult({ type: 'success', message: 'Category updated!' });
  };

  const handleDeleteCategory = async () => {
    if (!deleteId) return;

    try {
      await deleteCategory(deleteId);
      setResult({ type: 'success', message: 'Category deleted!' });
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete',
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Auto-hide result
  if (result) {
    setTimeout(() => setResult(null), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500">
                {categories?.length || 0} categories
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                Expense ({expenseCategories.length})
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                Income ({incomeCategories.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        )}

        {/* Categories List */}
        <AnimatePresence mode="popLayout">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => setEditCategory(category)}
              onArchive={() => archiveCategory(category.id)}
              onDelete={() => setDeleteId(category.id)}
            />
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {!isLoading && filteredCategories.length === 0 && (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {searchQuery ? 'No categories found' : 'No categories yet'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsAddOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Add Sheet */}
      <CategoryFormSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddCategory}
        mode="add"
      />

      {/* Edit Sheet */}
      <CategoryFormSheet
        isOpen={!!editCategory}
        onClose={() => setEditCategory(null)}
        onSave={handleEditCategory}
        category={editCategory || undefined}
        mode="edit"
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. If you have transactions using this category, consider archiving it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Toast */}
      <AnimatePresence>
        {result && (
          <motion.div
            className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
              result.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            } text-white`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className="flex items-center gap-3">
              {result.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
              <p className="font-medium">{result.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
