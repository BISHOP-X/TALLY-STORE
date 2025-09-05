import { useEffect, useRef } from 'react';
import { verifyPayment } from '@/services/ercaspay';
import { updateUserWalletBalance, recordTopUpTransaction } from '@/lib/supabase';
import { useAuth } from '@/contexts/SimpleAuth';
import { useToast } from '@/hooks/use-toast';

export function usePaymentStatusChecker() {
  const { user, refreshWalletBalance } = useAuth();
  const { toast } = useToast();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stricter lock using useRef instead of global variables
  const isCheckingRef = useRef(false);
  const processingTransactionsRef = useRef(new Set<string>());

  useEffect(() => {
    const checkPendingPayments = async () => {
      // Stricter lock to prevent multiple simultaneous checks
      if (isCheckingRef.current) {
        console.log('🚫 Another transaction is being processed, skipping check');
        return;
      }

      const pendingTopup = localStorage.getItem('pending_topup');
      
      if (!pendingTopup || !user?.id) return;

      try {
        const transaction = JSON.parse(pendingTopup);
        const timeSinceInitiation = Date.now() - transaction.timestamp;
        const transactionRef = transaction.transactionReference;
        
        // Stop checking after 30 minutes
        if (timeSinceInitiation > 30 * 60 * 1000) {
          localStorage.removeItem('pending_topup');
          return;
        }

        console.log('🔍 Checking payment status:', transactionRef);
        
        // Check if already processing this transaction
        if (processingTransactionsRef.current.has(transactionRef)) {
          console.log('⏳ Transaction already being processed, skipping:', transactionRef);
          return;
        }
        
        // Check if this transaction was already processed
        const processedTransactions = JSON.parse(localStorage.getItem('processed_transactions') || '[]');
        if (processedTransactions.includes(transactionRef)) {
          console.log('✅ Transaction already processed, cleaning up:', transactionRef);
          localStorage.removeItem('pending_topup');
          return;
        }
        
        // Mark as processing
        processingTransactionsRef.current.add(transactionRef);
        isCheckingRef.current = true;
        
        const verification = await verifyPayment(transactionRef);
        console.log('📊 Verification result:', verification);
        
        if (verification.success && verification.status === 'success') {
          // Payment successful - check transaction history first to prevent duplicates
          console.log('💰 Payment verified successful, checking for duplicates...');
          
          // Get recent transactions to check for duplicates
          const { getUserTransactions } = await import('@/lib/supabase');
          const recentTransactions = await getUserTransactions(user.id);
          
          // Check for duplicate transaction in last 10 minutes
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const duplicateTransaction = recentTransactions.find(tx => 
            tx.reference === transactionRef ||
            tx.ercas_reference === verification.transactionReference ||
            (Math.abs(tx.amount - verification.amount) < 0.01 && 
             new Date(tx.created_at) > tenMinutesAgo)
          );
          
          if (duplicateTransaction) {
            console.log('🚫 Duplicate transaction detected, skipping processing:', duplicateTransaction);
            
            // Mark as processed to stop further checking
            const processedTransactions = JSON.parse(localStorage.getItem('processed_transactions') || '[]');
            if (!processedTransactions.includes(transactionRef)) {
              processedTransactions.push(transactionRef);
              localStorage.setItem('processed_transactions', JSON.stringify(processedTransactions));
            }
            localStorage.removeItem('pending_topup');
            
            toast({
              title: "Payment Already Processed! ✅",
              description: `₦${verification.amount.toLocaleString()} was already added to your wallet.`,
            });
            
            // Clear interval
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            
            return; // Exit without processing again
          }
          
          console.log('✅ No duplicate found, processing payment...');
          console.log('💰 Adding amount to wallet:', verification.amount);
          console.log('📝 Recording transaction for user:', user.id);
          
          await updateUserWalletBalance(user.id, verification.amount);
          
          const transactionRecorded = await recordTopUpTransaction(
            user.id, 
            verification.amount, 
            transactionRef, 
            verification.transactionReference
          );
          
          console.log('📝 Transaction recorded:', transactionRecorded);
          
          await refreshWalletBalance();
          
          // Mark transaction as processed
          processedTransactions.push(transactionRef);
          localStorage.setItem('processed_transactions', JSON.stringify(processedTransactions));
          
          localStorage.removeItem('pending_topup');
          
          toast({
            title: "Payment Successful! 🎉",
            description: `₦${verification.amount.toLocaleString()} has been added to your wallet.`,
          });
          
          // Notify UI to reload transactions
          window.dispatchEvent(new CustomEvent('transactionAdded'));
          
          // Stop checking
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        } else if (verification.status === 'failed') {
          // Payment failed - clean up
          localStorage.removeItem('pending_topup');
          
          toast({
            title: "Payment Failed",
            description: "Your payment was not successful. Please try again.",
            variant: "destructive",
          });
          
          // Stop checking
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
        // If status is 'pending', continue checking
        
      } catch (error) {
        console.error('Error checking payment status:', error);
      } finally {
        // Remove from processing set if we have the reference
        const pendingTopupData = localStorage.getItem('pending_topup');
        if (pendingTopupData) {
          try {
            const transaction = JSON.parse(pendingTopupData);
            processingTransactionsRef.current.delete(transaction.transactionReference);
          } catch (e) {
            // Ignore parsing errors in finally block
          }
        }
        // Release lock
        isCheckingRef.current = false;
      }
    };

    // Check immediately on mount
    checkPendingPayments();

    // Set up interval to check every 10 seconds
    checkIntervalRef.current = setInterval(checkPendingPayments, 10000);

    // Cleanup interval on unmount
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, refreshWalletBalance, toast]);

  // Also check when window gets focus (user returns from payment tab)
  useEffect(() => {
    const handleFocus = () => {
      const pendingTopup = localStorage.getItem('pending_topup');
      if (pendingTopup && user?.id) {
        // Check immediately when user returns
        setTimeout(async () => {
          // Check lock first
          if (isCheckingRef.current) {
            console.log('🚫 Another transaction is being processed, skipping focus check');
            return;
          }

          try {
            const transaction = JSON.parse(pendingTopup);
            const transactionRef = transaction.transactionReference;
            
            console.log('🔎 Checking payment on window focus:', transactionRef);
            
            // Check if already processing this transaction
            if (processingTransactionsRef.current.has(transactionRef)) {
              console.log('⏳ Transaction already being processed on focus, skipping:', transactionRef);
              return;
            }
            
            // Check if this transaction was already processed
            const processedTransactions = JSON.parse(localStorage.getItem('processed_transactions') || '[]');
            if (processedTransactions.includes(transactionRef)) {
              console.log('✅ Transaction already processed on focus, cleaning up:', transactionRef);
              localStorage.removeItem('pending_topup');
              return;
            }
            
            // Mark as processing
            processingTransactionsRef.current.add(transactionRef);
            isCheckingRef.current = true;
            
            const verification = await verifyPayment(transactionRef);
            console.log('📋 Focus verification result:', verification);
            
            if (verification.success && verification.status === 'success') {
              // Payment successful - check transaction history first to prevent duplicates
              console.log('💰 Focus check: Payment verified successful, checking for duplicates...');
              
              // Get recent transactions to check for duplicates
              const { getUserTransactions } = await import('@/lib/supabase');
              const recentTransactions = await getUserTransactions(user.id);
              
              // Check for duplicate transaction in last 10 minutes
              const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
              const duplicateTransaction = recentTransactions.find(tx => 
                tx.reference === transactionRef ||
                tx.ercas_reference === verification.transactionReference ||
                (Math.abs(tx.amount - verification.amount) < 0.01 && 
                 new Date(tx.created_at) > tenMinutesAgo)
              );
              
              if (duplicateTransaction) {
                console.log('🚫 Focus check: Duplicate transaction detected, skipping processing:', duplicateTransaction);
                
                // Mark as processed to stop further checking
                const processedTransactions = JSON.parse(localStorage.getItem('processed_transactions') || '[]');
                if (!processedTransactions.includes(transactionRef)) {
                  processedTransactions.push(transactionRef);
                  localStorage.setItem('processed_transactions', JSON.stringify(processedTransactions));
                }
                localStorage.removeItem('pending_topup');
                
                toast({
                  title: "Payment Already Processed! ✅",
                  description: `₦${verification.amount.toLocaleString()} was already added to your wallet.`,
                });
                
                return; // Exit without processing again
              }
              
              console.log('✅ Focus check: No duplicate found, processing payment...');
              console.log('💰 Adding amount to wallet on focus:', verification.amount);
              console.log('📝 Recording transaction on focus for user:', user.id);
              
              await updateUserWalletBalance(user.id, verification.amount);
              
              const transactionRecorded = await recordTopUpTransaction(
                user.id, 
                verification.amount, 
                transactionRef, 
                verification.transactionReference
              );
              
              console.log('📝 Transaction recorded on focus:', transactionRecorded);
              
              await refreshWalletBalance();
              
              // Mark transaction as processed
              processedTransactions.push(transactionRef);
              localStorage.setItem('processed_transactions', JSON.stringify(processedTransactions));
              
              localStorage.removeItem('pending_topup');
              
              toast({
                title: "Payment Successful! 🎉",
                description: `₦${verification.amount.toLocaleString()} has been added to your wallet.`,
              });
              
              // Notify UI to reload transactions
              window.dispatchEvent(new CustomEvent('transactionAdded'));
            }
            
            // Remove from processing set
            processingTransactionsRef.current.delete(transactionRef);
            isCheckingRef.current = false;
          } catch (error) {
            console.error('Error checking payment on focus:', error);
            // Release lock on error
            isCheckingRef.current = false;
          }
        }, 1000);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, refreshWalletBalance, toast]);
}
