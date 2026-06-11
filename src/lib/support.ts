export const SUPPORT_WHATSAPP_NUMBER = '+234 902 459 5121';
export const SUPPORT_WHATSAPP_URL =
  'https://wa.me/2349024595121?text=Hello%20TallyStore%20support%2C%20I%20need%20help%20with%20my%20account%2C%20wallet%2C%20or%20order.';
export const SUPPORT_UPDATE_ANNOUNCEMENT_VERSION = '2026-06-11-whatsapp-support';

export const openSupportWhatsApp = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
};
