export const SUPPORT_WHATSAPP_NUMBER = '+234 902 459 5121';
export const SUPPORT_WHATSAPP_URL =
  'https://wa.me/2349024595121?text=Hello%20TallyStore%20support%2C%20I%20need%20help%20with%20my%20account%2C%20wallet%2C%20or%20order.';

// TODO: replace with your real Telegram support handle/link, e.g. 'https://t.me/YourSupportUsername'.
// The chatbot widget surfaces this link when it can't resolve a question, so fill
// this in before relying on it.
export const SUPPORT_TELEGRAM_URL = 'https://t.me/REPLACE_WITH_YOUR_TELEGRAM_SUPPORT_HANDLE';

export const SUPPORT_UPDATE_ANNOUNCEMENT_VERSION = '2026-06-11-whatsapp-support';

export const openSupportWhatsApp = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
};
