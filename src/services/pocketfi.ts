import { supabase } from '@/lib/supabase'

// PocketFi is the second wallet top-up gateway (alongside Ercas Pay). The client-side
// shape intentionally matches src/services/ercaspay.ts so TopUpWallet.tsx can treat both
// gateways interchangeably.

export interface PaymentData {
  amount: number
  customerName: string
  customerEmail: string
  customerPhoneNumber?: string
  description?: string
  redirectUrl?: string
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  success: boolean
  message: string
  data?: {
    paymentReference: string
    transactionReference: string
    checkoutUrl: string
  }
  error?: string
}

export const initiatePocketFiPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke<PaymentResponse>('create-pocketfi-topup', {
      body: paymentData,
    })

    if (error) {
      throw new Error(error.message || 'Failed to initiate payment')
    }

    if (!data) {
      throw new Error('Payment service returned an empty response')
    }

    return data
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to initiate payment',
      error: error.message,
    }
  }
}
