// Bitnob API Client
// Handles all interactions with Bitnob API

import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

export interface BitnobConfig {
  secretKey: string;
  hmacKey: string;
  webhookSecret: string;
  apiUrl?: string;
}

export interface GenerateAddressRequest {
  cryptoType: 'BTC' | 'USDT' | 'USDC';
  chain?: 'tron' | 'ethereum' | 'polygon' | 'bsc' | 'btc';
  customerEmail: string;
}

export interface GenerateAddressResponse {
  success: boolean;
  address?: string;
  reference?: string;
  expiresAt?: string;
  error?: string;
}

export interface CreateBeneficiaryRequest {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export interface CreateBeneficiaryResponse {
  success: boolean;
  beneficiaryId?: string;
  error?: string;
}

export interface InitiatePayoutRequest {
  beneficiaryId: string;
  amount: number; // In cents (₦50,000 = 5,000,000 cents)
  reference: string;
}

export interface InitiatePayoutResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  error?: string;
}

export class BitnobClient {
  private secretKey: string;
  private hmacKey: string;
  private webhookSecret: string;
  private apiUrl: string;

  constructor(config: BitnobConfig) {
    this.secretKey = config.secretKey;
    this.hmacKey = config.hmacKey;
    this.webhookSecret = config.webhookSecret;
    this.apiUrl = config.apiUrl || 'https://api.bitnob.co';
  }

  /**
   * Generate a crypto deposit address
   * 
   * DOCUMENTATION SOURCES:
   * - Bitcoin: docs/BITNOB_API_RESEARCH.md Part 6 (Bitcoin - Receiving)
   *   - Generates Bech32 addresses (bc1...) for lowest fees
   *   - Lightning endpoint: /api/v1/wallets/ln/generateaddress
   *   - Onchain endpoint: NOT explicitly documented (assuming similar pattern)
   * 
   * - Stablecoins: docs/BITNOB_API_RESEARCH.md Part 7-8 (Stablecoins + Webhooks)
   *   - Part 8 CONFIRMS TRON support via webhook examples ("chain": "tron")
   *   - Endpoint: /api/v1/addresses/generate (inferred from authentication examples)
   *   - ⚠️ NOTE: Exact stablecoin endpoint NOT explicitly documented in research
   *   - Will be verified during sandbox testing
   * 
   * SUPPORTED CHAINS:
   * - BTC: 'btc' (onchain) or 'lightning' (Lightning Network)
   * - USDT: 'tron' (TRC20 - CONFIRMED), 'ethereum', 'polygon', 'bsc'
   * - USDC: 'ethereum', 'polygon', 'bsc' (TRC20 unclear - test in sandbox)
   */
  async generateAddress(request: GenerateAddressRequest): Promise<GenerateAddressResponse> {
    try {
      // Determine the correct endpoint based on crypto type
      let endpoint = '';
      let payload: any = {};

      if (request.cryptoType === 'BTC') {
        // Bitcoin: Use Lightning or Onchain
        // Lightning documented: /api/v1/wallets/ln/generateaddress
        endpoint = '/api/v1/wallets/ln/generateaddress'; // Lightning (lower fees)
        payload = {
          customerEmail: request.customerEmail,
          label: `TallyStore-${Date.now()}`,
        };
      } else {
        // Stablecoins: USDT or USDC
        // Endpoint inferred from docs/BITNOB_API_RESEARCH.md Authentication section
        // Example shows: fetch('https://api.bitnob.co/api/v1/addresses/generate'...)
        // ⚠️ TO VERIFY: Test in sandbox to confirm this endpoint works for stablecoins
        endpoint = '/api/v1/addresses/generate';
        payload = {
          chain: request.chain || 'tron', // Default to TRON (lowest fees, confirmed via webhooks)
          currency: request.cryptoType,
          customerEmail: request.customerEmail,
        };
      }

      const response = await this.makeRequest('POST', endpoint, payload);

      if (!response.success) {
        console.error('Bitnob generateAddress failed:', {
          cryptoType: request.cryptoType,
          chain: request.chain,
          endpoint,
          payload,
          response,
        });
        return { success: false, error: response.message || 'Failed to generate address' };
      }

      const generatedAddress = response.data?.address || response.data?.lightning_address;
      
      // VALIDATION: Check if address matches expected network (only for stablecoins)
      if (request.cryptoType !== 'BTC' && request.chain === 'tron') {
        // For USDT/USDC on TRON, address MUST start with 'T'
        if (!generatedAddress?.startsWith('T')) {
          console.error('CRITICAL: Bitnob returned wrong address type for stablecoin!', {
            expected: 'TRON address (starts with T)',
            received: generatedAddress,
            cryptoType: request.cryptoType,
            chain: request.chain,
            fullResponse: response,
          });
          return { 
            success: false, 
            error: `Stablecoin address validation failed: Expected TRON address but got ${generatedAddress?.slice(0, 10)}... Please contact support.` 
          };
        }
      }

      console.log('Bitnob address generated successfully:', {
        cryptoType: request.cryptoType,
        chain: request.chain,
        addressPrefix: generatedAddress?.slice(0, 10),
      });

      return {
        success: true,
        address: generatedAddress,
        reference: response.data?.reference || response.data?.id,
        expiresAt: response.data?.expiresAt,
      };
    } catch (error) {
      console.error('Error generating address:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a beneficiary (bank account) for payouts
   */
  async createBeneficiary(request: CreateBeneficiaryRequest): Promise<CreateBeneficiaryResponse> {
    try {
      const endpoint = '/api/v1/beneficiaries';
      const payload = {
        accountNumber: request.accountNumber,
        accountName: request.accountName,
        bankCode: request.bankCode,
        bankName: request.bankName,
      };

      const response = await this.makeRequest('POST', endpoint, payload);

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to create beneficiary' };
      }

      return {
        success: true,
        beneficiaryId: response.data?.id || response.data?.beneficiaryId,
      };
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Initiate a payout to a bank account
   * Based on: docs/BITNOB_API_RESEARCH.md - Part 12 (Payouts API)
   */
  async initiatePayout(request: InitiatePayoutRequest): Promise<InitiatePayoutResponse> {
    try {
      // Step 1: Initialize transfer
      // Endpoint from research: POST /api/v1/payouts/initiate
      const initEndpoint = '/api/v1/payouts/initiate';
      const initPayload = {
        beneficiaryId: request.beneficiaryId,
        amount: request.amount, // In cents (₦50,000 = 5,000,000 cents)
        sourceWalletCurrency: 'NGN',
        reference: request.reference,
        description: 'TallyStore withdrawal',
      };

      const initResponse = await this.makeRequest('POST', initEndpoint, initPayload);

      if (!initResponse.success) {
        return { success: false, error: initResponse.message || 'Failed to initialize payout' };
      }

      const transactionId = initResponse.data?.transactionId || initResponse.data?.id;

      // Step 2: Finalize transfer
      // Endpoint from research: POST /api/v1/payouts/finalize
      const finalizeEndpoint = '/api/v1/payouts/finalize';
      const finalizePayload = {
        transactionId: transactionId,
      };
      
      const finalizeResponse = await this.makeRequest('POST', finalizeEndpoint, finalizePayload);

      if (!finalizeResponse.success) {
        return { 
          success: false, 
          error: finalizeResponse.message || 'Failed to finalize payout',
          transactionId, // Return for debugging
        };
      }

      return {
        success: true,
        transactionId,
        reference: request.reference,
      };
    } catch (error) {
      console.error('Error initiating payout:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Verify webhook signature using HMAC SHA512
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hmac = createHmac('sha512', this.webhookSecret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Make an authenticated API request to Bitnob
   */
  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      // Log API call (you can store this in bitnob_api_logs table)
      console.log('Bitnob API Call:', {
        method,
        endpoint,
        statusCode: response.status,
        duration,
        success: response.ok,
      });

      if (!response.ok) {
        return {
          success: false,
          message: data.message || data.error || 'API request failed',
          statusCode: response.status,
          data,
        };
      }

      return {
        success: true,
        data: data.data || data,
        statusCode: response.status,
      };
    } catch (error) {
      console.error('Bitnob API request error:', error);
      return {
        success: false,
        message: (error as Error).message,
        error,
      };
    }
  }
}
