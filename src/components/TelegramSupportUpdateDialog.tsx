import { useEffect, useState } from 'react';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SUPPORT_TELEGRAM_NUMBER,
  SUPPORT_UPDATE_ANNOUNCEMENT_VERSION,
  openSupportTelegram,
} from '@/lib/support';

const STORAGE_KEY = `telegram-support-update:${SUPPORT_UPDATE_ANNOUNCEMENT_VERSION}`;

export default function TelegramSupportUpdateDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.localStorage.getItem(STORAGE_KEY) === 'seen') {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 350);

    return () => window.clearTimeout(timer);
  }, []);

  const markAsSeen = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'seen');
    }
  };

  const handleDismiss = () => {
    markAsSeen();
    setOpen(false);
  };

  const handleContactSupport = () => {
    markAsSeen();
    setOpen(false);
    openSupportTelegram();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleDismiss();
      return;
    }

    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-sky-200 p-0 sm:max-w-md">
        <div className="bg-gradient-to-r from-sky-600 via-cyan-500 to-blue-600 px-6 py-5 text-white">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <MessageCircle className="h-6 w-6" />
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-semibold text-white">
              Telegram support update
            </DialogTitle>
            <DialogDescription className="text-sm text-sky-50">
              Our Telegram support number has changed. Sorry for any inconvenience.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              New Telegram support number
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {SUPPORT_TELEGRAM_NUMBER}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Please use the updated Telegram link below if you have any issue with your account,
              wallet, or orders.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-start sm:space-x-0">
            <Button className="w-full sm:flex-1" onClick={handleContactSupport}>
              Contact support on Telegram
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={handleDismiss}>
              Cancel
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}