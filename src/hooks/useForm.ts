/**
 * Generic Form Hook with Validation
 */

import { useState, useCallback, useMemo } from 'react';
import type { ValidationResult, ValidationError } from '@/lib/validators';

export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => ValidationResult;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: ValidationError[];
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  handleChange: <K extends keyof T>(field: K, value: T[K]) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: (field: string, message: string) => void;
  getFieldError: (field: keyof T) => string | undefined;
  hasFieldError: (field: keyof T) => boolean;
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, validate, onSubmit } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  const isValid = useMemo(() => {
    if (!validate) return true;
    return validate(values).isValid;
  }, [values, validate]);

  const handleChange = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    setErrors((prev) => prev.filter((e) => e.field !== String(field)));
  }, []);

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    handleChange(field, value);
  }, [handleChange]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate on blur if validate function exists
    if (validate) {
      const result = validate(values);
      const fieldErrors = result.errors.filter((e) => e.field === String(field));

      setErrors((prev) => {
        const otherErrors = prev.filter((e) => e.field !== String(field));
        return [...otherErrors, ...fieldErrors];
      });
    }
  }, [values, validate]);

  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    setTouched(allTouched);

    // Validate all fields
    if (validate) {
      const result = validate(values);
      setErrors(result.errors);

      if (!result.isValid) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors([]);
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.field !== field);
      return [...filtered, { field, message, code: 'CUSTOM' }];
    });
  }, []);

  const getFieldError = useCallback((field: keyof T): string | undefined => {
    if (!touched[field]) return undefined;
    return errors.find((e) => e.field === String(field))?.message;
  }, [errors, touched]);

  const hasFieldError = useCallback((field: keyof T): boolean => {
    if (!touched[field]) return false;
    return errors.some((e) => e.field === String(field));
  }, [errors, touched]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    getFieldError,
    hasFieldError,
  };
}

export default useForm;
