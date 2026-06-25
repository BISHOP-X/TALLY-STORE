import { supabase } from '@/lib/supabase'

// PocketFi uses a PERMANENT VIRTUAL ACCOUNT model, not a hosted checkout like Ercas Pay.
// There is no "amount in, checkoutUrl out" call — instead we ask once for a dedicated bank
// account number tied to the user, and they manually bank-transfer into it (any amount,
// any time). The edge function returns that account's details, not a redirect URL.

export interface GetOrCreateAccountInput {
  customerName?: string
  customerPhoneNumber?: string
}

export interface PocketFiAccount {
  accountNumber: string
  accountName: string
  bankName: string
}

export interface PocketFiAccountResponse {
  success: boolean
  message: string
  data?: PocketFiAccount
  error?: string
}

export const getOrCreatePocketFiAccount = async (
  input: GetOrCreateAccountInput = {}
): Promise<PocketFiAccountResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke<PocketFiAccountResponse>(
      'create-pocketfi-topup',
      { body: input }
    )

    if (error) {
      throw new Error(error.message || 'Failed to set up bank transfer account')
    }

    if (!data) {
      throw new Error('Payment service returned an empty response')
    }

    return data
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to set up bank transfer account',
      error: error.message,
    }
  }
}
