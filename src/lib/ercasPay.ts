// Ercas Pay Integration for Wallet Top-up
// Documentation: https://api.ercaspay.com/docs

interface ErcasPayConfig {
  secretKey: string
  baseUrl: string
  mode: 'test' | 'live'
}

interface PaymentData {
  amount: number
  currency: string
  customerEmail: string
  customerName: string
  customerPhoneNumber?: string
  paymentReference: string
  redirectUrl: string
  description: string
  paymentMethods?: string
  feeBearer?: 'customer' | 'merchant'
  metadata?: Record<string, any>
}

interface PaymentResponse {
  success: boolean
  data?: {
    paymentReference: string
    transactionReference: string
    checkoutUrl: string
  }
  message?: string
  error?: string
}

interface VerifyResponse {
  success: boolean
  data?: {
    amount: number
    transaction_reference: string
    payment_reference: string
    type: string
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING'
    currency: string
    channel: string
    fee: number
    settlement_amount: number
    customer_account_name?: string
    metadata?: Record<string, any>
  }
  error?: string
}

class ErcasPayService {
  private config: ErcasPayConfig

  constructor() {
    // Initialize with environment variables or defaults
    this.config = {
      secretKey: import.meta.env.VITE_ERCAS_SECRET_KEY || 'ECRS-TEST-SKLVbpD1J7DG9fwwdyddcAkEysTKsYD564S1NDSUBS',
      baseUrl: import.meta.env.VITE_ERCAS_BASE_URL || 'https://api-staging.ercaspay.com/api/v1',
      mode: (import.meta.env.VITE_ERCAS_MODE as 'test' | 'live') || 'test'
    }
  }

  /**
   * Generate a unique payment reference
   */
  generateReference(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `TOP_${timestamp}_${random}`.toUpperCase()
  }

  /**
   * Initialize payment with Ercas Pay
   */
  async initializePayment(paymentData: PaymentData): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/third-party/payment/initiate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.secretKey}`
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          paymentReference: paymentData.paymentReference,
          paymentMethods: paymentData.paymentMethods || 'card,bank-transfer,ussd,qrcode',
          customerName: paymentData.customerName,
          currency: paymentData.currency,
          customerEmail: paymentData.customerEmail,
          customerPhoneNumber: paymentData.customerPhoneNumber,
          redirectUrl: paymentData.redirectUrl,
          description: paymentData.description,
          feeBearer: paymentData.feeBearer || 'merchant',
          metadata: {
            ...paymentData.metadata,
            platform: 'tally-store',
            payment_type: 'wallet_topup'
          }
        })
      })

      const result = await response.json()

      if (response.ok && result.requestSuccessful) {
        return {
          success: true,
          data: {
            paymentReference: result.responseBody.paymentReference,
            transactionReference: result.responseBody.transactionReference,
            checkoutUrl: result.responseBody.checkoutUrl
          }
        }
      } else {
        return {
          success: false,
          error: result.responseMessage || 'Payment initialization failed'
        }
      }
    } catch (error) {
      console.error('Ercas Pay initialization error:', error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionReference: string): Promise<VerifyResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/third-party/payment/verify/${transactionReference}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.secretKey}`
        }
      })

      const result = await response.json()

      if (response.ok && result.requestSuccessful) {
        return {
          success: true,
          data: result.responseBody
        }
      } else {
        return {
          success: false,
          error: result.responseMessage || 'Payment verification failed'
        }
      }
    } catch (error) {
      console.error('Ercas Pay verification error:', error)
      return {
        success: false,
        error: 'Unable to verify payment status'
      }
    }
  }

  /**
   * Create payment popup (for inline integration)
   */
  openPaymentModal(paymentData: PaymentData, onSuccess: (data: any) => void, onClose: () => void) {
    // This would typically load the Ercas Pay JavaScript SDK
    // For now, we'll use the redirect method
    this.initializePayment(paymentData).then((response) => {
      if (response.success && response.data) {
        // Open payment URL in new window or redirect
        window.open(response.data.checkoutUrl, '_blank', 'width=500,height=600')
      } else {
        alert(response.error || 'Payment initialization failed')
        onClose()
      }
    })
  }

  /**
   * Handle payment callback/webhook
   */
  async handleCallback(transactionReference: string): Promise<boolean> {
    const verification = await this.verifyPayment(transactionReference)
    return verification.success && verification.data?.status === 'SUCCESSFUL'
  }
}

// Export singleton instance
export const ercasPayService = new ErcasPayService()

// Export types for use in components
export type { PaymentData, PaymentResponse, VerifyResponse }

// Utility function for components
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Environment configuration helper
export const isErcasPayConfigured = (): boolean => {
  const secretKey = import.meta.env.VITE_ERCAS_SECRET_KEY
  
  return !!(secretKey && 
    secretKey !== 'ECRS-TEST-SKLVbpD1J7DG9fwwdyddcAkEysTKsYD564S1NDSUBS' &&
    secretKey.includes('ECRS'))
}
