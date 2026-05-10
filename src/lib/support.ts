export const SUPPORT_TELEGRAM_NUMBER = '+234 70 7251 7332';
export const SUPPORT_TELEGRAM_URL = 'https://t.me/+2347072517332';
export const SUPPORT_UPDATE_ANNOUNCEMENT_VERSION = '2026-05-10';

export const openSupportTelegram = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(SUPPORT_TELEGRAM_URL, '_blank', 'noopener,noreferrer');
};