// Direct Ercas Pay API implementation (no SDK dependencies)

const ERCASPAY_BASE_URL = 'https://api.ercaspay.com/api/v1';
const ERCASPAY_SECRET_KEY = import.meta.env.VITE_ERCASPAY_SECRET_KEY;

export interface PaymentData {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber?: string;
  description?: string;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    paymentReference: string;
    transactionReference: string;
    checkoutUrl: string;
  };
  error?: string;
}

export interface TransactionVerification {
  success: boolean;
  status: string;
  amount: number;
  customerEmail: string;
  paidAt?: string;
  transactionReference: string;
  error?: string;
}

/**
 * Generate a unique payment reference
 */
export const generatePaymentReference = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `TALLY-${timestamp}-${random}`;
};

/**
 * Make HTTP request to Ercas Pay API
 */
const makeErcasPayRequest = async (endpoint: string, data?: any) => {
  const url = `${ERCASPAY_BASE_URL}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ERCASPAY_SECRET_KEY}`
  };

  const options: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers,
    ...(data && { body: JSON.stringify(data) })
  };

  console.log(`🌐 Making request to: ${url}`, { method: options.method, data });

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ HTTP Error ${response.status}:`, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
  
  const result = await response.json();

  console.log(`📥 Response from ${url}:`, result);

  return result;
};

/**
 * Initiate a payment transaction with Ercas Pay
 */
export const initiatePayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    console.log('🚀 Initiating payment with Ercas Pay...', paymentData);

    if (!ERCASPAY_SECRET_KEY) {
      throw new Error('Ercas Pay secret key not configured');
    }

    const transactionData = {
      amount: paymentData.amount, // Send amount in Naira (not kobo)
      paymentReference: generatePaymentReference(),
      paymentMethods: 'card,bank-transfer,ussd,qrcode',
      customerName: paymentData.customerName.replace(/[^a-zA-Z\s]/g, '').trim() || 'Customer', // Clean name - only letters and spaces
      customerEmail: paymentData.customerEmail,
      customerPhoneNumber: paymentData.customerPhoneNumber || '',
      redirectUrl: paymentData.redirectUrl || `${window.location.origin}/payment-success`,
      description: paymentData.description || 'Wallet Top-up',
      currency: 'NGN',
      feeBearer: 'customer',
      metadata: {
        source: 'tally-store-wallet-topup',
        user_id: paymentData.metadata?.user_id, // Include user_id for webhook processing
        ...paymentData.metadata
      }
    };

    console.log('📤 Sending transaction data:', transactionData);

    const response = await makeErcasPayRequest('/payment/initiate', transactionData);

    if (!response.requestSuccessful) {
      return {
        success: false,
        message: response.responseMessage || 'Failed to initiate payment',
        error: response.responseMessage
      };
    }

    return {
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentReference: response.responseBody.paymentReference,
        transactionReference: response.responseBody.transactionReference,
        checkoutUrl: response.responseBody.checkoutUrl
      }
    };

  } catch (error: any) {
    console.error('❌ Payment initiation error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to initiate payment',
      error: error.message
    };
  }
};

/**
 * Verify a payment transaction
 */
export const verifyPayment = async (transactionReference: string): Promise<TransactionVerification> => {
  try {
    console.log('🔍 Verifying transaction:', transactionReference);

    if (!ERCASPAY_SECRET_KEY) {
      throw new Error('Ercas Pay secret key not configured');
    }

    const response = await makeErcasPayRequest(`/payment/transaction/verify/${transactionReference}`);

    console.log('📥 Verification raw response:', response);

    if (!response.requestSuccessful) {
      console.log('❌ Verification failed:', response);
      return {
        success: false,
        status: 'failed',
        amount: 0,
        customerEmail: '',
        transactionReference,
        error: response.errorMessage || response.responseMessage || 'Transaction verification failed'
      };
    }

    const transaction = response.responseBody;

    return {
      success: true,
      status: transaction.status === 'SUCCESSFUL' ? 'success' : transaction.status.toLowerCase(),
      amount: transaction.amount, // Amount is already in Naira
      customerEmail: transaction.customer.email,
      paidAt: transaction.paid_at,
      transactionReference: transaction.ercs_reference
    };

  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    
    return {
      success: false,
      status: 'error',
      amount: 0,
      customerEmail: '',
      transactionReference,
      error: error.message || 'Verification failed'
    };
  }
};
