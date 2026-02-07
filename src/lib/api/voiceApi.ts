/**
 * Voice API - Server-side Voice Transcription
 * Tier-One Standards: Complete API integration with fallback support
 */

import { apiClient, networkStatus } from './client';

// =============================================================================
// Types
// =============================================================================

export interface TranscriptionRequest {
  audioBlob: Blob;
  mimeType: string;
  language?: string;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language: string;
  duration: number;
}

export interface ParsedTransactionRequest {
  transcript: string;
  language?: string;
}

export interface ParsedTransactionResponse {
  amount: number | null;
  type: 'income' | 'expense' | 'transfer';
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  payee: string | null;
  date: string;
  confidence: number;
  suggestions: string[];
}

export interface VoiceSettingsResponse {
  provider: 'whisper' | 'google' | 'browser';
  language: string;
  isServerAvailable: boolean;
  monthlyUsage: number;
  monthlyLimit: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Transcribe audio using server-side Whisper API
 */
export async function transcribeAudio(
  request: TranscriptionRequest
): Promise<TranscriptionResponse> {
  // Create form data with audio blob
  const formData = new FormData();
  formData.append('audio', request.audioBlob, 'recording.webm');
  formData.append('mimeType', request.mimeType);
  if (request.language) {
    formData.append('language', request.language);
  }

  const response = await apiClient.post<TranscriptionResponse>(
    '/api/v1/voice/transcribe',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for audio processing
    }
  );

  return response.data;
}

/**
 * Parse transcript into transaction data using server-side NLP
 */
export async function parseTranscript(
  request: ParsedTransactionRequest
): Promise<ParsedTransactionResponse> {
  const response = await apiClient.post<ParsedTransactionResponse>(
    '/api/v1/voice/parse',
    request
  );

  return response.data;
}

/**
 * Get voice service settings and usage
 */
export async function getVoiceSettings(): Promise<VoiceSettingsResponse> {
  const response = await apiClient.get<VoiceSettingsResponse>(
    '/api/v1/voice/settings'
  );

  return response.data;
}

/**
 * Update voice provider preference
 */
export async function updateVoiceProvider(
  provider: 'whisper' | 'google' | 'browser'
): Promise<void> {
  await apiClient.put('/api/v1/voice/settings', { provider });
}

/**
 * Check if server-side voice transcription is available
 */
export async function checkVoiceAvailability(): Promise<boolean> {
  if (!networkStatus.isOnline()) {
    return false;
  }

  try {
    const settings = await getVoiceSettings();
    return settings.isServerAvailable;
  } catch {
    return false;
  }
}

// =============================================================================
// Export
// =============================================================================

export const voiceApi = {
  transcribeAudio,
  parseTranscript,
  getVoiceSettings,
  updateVoiceProvider,
  checkVoiceAvailability,
};

export default voiceApi;
