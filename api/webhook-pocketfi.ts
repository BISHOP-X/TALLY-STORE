// api/webhook-pocketfi.ts
// Vercel serverless function for handling PocketFi webhooks.
// Mirrors api/webhook-ercas.ts: credits the user's wallet directly when PocketFi
// reports a successful transaction. This is the primary crediting path for PocketFi
// (there's no separate "verify" edge function the client polls — usePaymentStatusChecker
// just polls the transactions table to detect that this webhook already ran).
//
// NOTE: Confirm the exact webhook payload field names against PocketFi's docs once
// available — this handles the common shapes (event/status/reference) defensively.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    const reference = payload.reference || payload.transaction_reference || payload.data?.reference;
    const amount = Number(payload.amount || payload.data?.amount || 0);
    const status = String(payload.status || payload.data?.status || payload.event || '').toLowerCase();
    const metadata = payload.metadata || payload.data?.metadata || {};

    console.log('🔔 PocketFi webhook received:', { reference, amount, status, user_id: metadata?.user_id });

    if (!reference || !amount) {
      return res.status(400).json({ error: 'Invalid payload: missing required fields' });
    }

    // Only process successful transactions
    const isSuccess = status.includes('success') || status === 'completed' || status === 'paid';
    if (!isSuccess) {
      console.log('⏭️ Ignoring non-successful PocketFi transaction:', status);
      return res.status(200).json({ message: 'Transaction ignored' });
    }

    const userId = metadata?.user_id || metadata?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'No user ID found in payload metadata' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Idempotency check
    const { data: existingTransaction } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .eq('user_id', userId)
      .single();

    if (existingTransaction) {
      console.log('✅ PocketFi transaction already processed:', reference);
      return res.status(200).json({ message: 'Transaction already processed' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newBalance = profile.wallet_balance + amount;

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (balanceError) {
      throw new Error(`Failed to update wallet: ${balanceError.message}`);
    }

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        type: 'topup',
        amount,
        status: 'completed',
        balance_after: newBalance,
        description: 'Wallet top-up via PocketFi (Webhook)',
        reference,
        ercas_reference: payload.payment_reference || payload.data?.payment_reference || null
      }]);

    if (transactionError) {
      throw new Error(`Failed to record transaction: ${transactionError.message}`);
    }

    console.log('✅ PocketFi webhook payment processed successfully for user:', userId);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        user_id: userId,
        amount,
        new_balance: newBalance,
        reference
      }
    });

  } catch (error) {
    console.error('❌ PocketFi webhook processing error:', error);

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
