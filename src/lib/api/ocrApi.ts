/**
 * OCR API - Server-side Receipt Scanning
 * Tier-One Standards: Complete API integration with fallback support
 */

import { apiClient, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface ScanReceiptRequest {
  imageBlob: Blob;
  mimeType: string;
}

export interface ReceiptItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

export interface ScanReceiptResponse {
  success: boolean;
  data: {
    merchantName: string | null;
    merchantAddress: string | null;
    date: string | null;
    time: string | null;
    items: ReceiptItem[];
    subtotal: number | null;
    tax: number | null;
    total: number | null;
    paymentMethod: string | null;
    gstNumber: string | null;
    invoiceNumber: string | null;
    currency: string;
  };
  rawText: string;
  confidence: number;
  processingTime: number;
}

export interface OCRSettingsResponse {
  provider: 'google-vision' | 'aws-textract' | 'tesseract' | 'browser';
  isServerAvailable: boolean;
  monthlyUsage: number;
  monthlyLimit: number;
  supportedFormats: string[];
}

export interface ReceiptStorageResponse {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Scan receipt using server-side OCR
 */
export async function scanReceipt(
  request: ScanReceiptRequest
): Promise<ScanReceiptResponse> {
  // Create form data with image blob
  const formData = new FormData();
  formData.append('image', request.imageBlob, 'receipt.jpg');
  formData.append('mimeType', request.mimeType);

  const response = await apiClient.post<ScanReceiptResponse>(
    '/api/v1/receipts/scan',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds for image processing
    }
  );

  return response.data;
}

/**
 * Upload receipt image to cloud storage
 */
export async function uploadReceipt(
  imageBlob: Blob,
  mimeType: string
): Promise<ReceiptStorageResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'receipt.jpg');
  formData.append('mimeType', mimeType);

  const response = await apiClient.post<ReceiptStorageResponse>(
    '/api/v1/receipts/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/**
 * Get OCR settings and usage
 */
export async function getOCRSettings(): Promise<OCRSettingsResponse> {
  const response = await apiClient.get<OCRSettingsResponse>(
    '/api/v1/receipts/settings'
  );

  return response.data;
}

/**
 * Update OCR provider preference
 */
export async function updateOCRProvider(
  provider: 'google-vision' | 'aws-textract' | 'tesseract' | 'browser'
): Promise<void> {
  await apiClient.put('/api/v1/receipts/settings', { provider });
}

/**
 * Get user's stored receipts
 */
export async function getStoredReceipts(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<{
  receipts: ReceiptStorageResponse[];
  total: number;
  page: number;
  pages: number;
}> {
  const response = await apiClient.get('/api/v1/receipts', { params });
  return response.data;
}

/**
 * Delete a stored receipt
 */
export async function deleteReceipt(receiptId: string): Promise<void> {
  await apiClient.delete(`/api/v1/receipts/${receiptId}`);
}

/**
 * Check if server-side OCR is available
 */
export async function checkOCRAvailability(): Promise<boolean> {
  if (!networkStatus.isOnline()) {
    return false;
  }

  try {
    const settings = await getOCRSettings();
    return settings.isServerAvailable;
  } catch {
    return false;
  }
}

// =============================================================================
// Export
// =============================================================================

export const ocrApi = {
  scanReceipt,
  uploadReceipt,
  getOCRSettings,
  updateOCRProvider,
  getStoredReceipts,
  deleteReceipt,
  checkOCRAvailability,
};

export default ocrApi;
