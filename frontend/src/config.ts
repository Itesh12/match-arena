const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
// Sanitize URL: Remove trailing slash and ensure protocol
export const API_URL = rawApiUrl.replace(/\/$/, '');
export const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || API_URL).replace(/\/$/, '');

if (typeof window !== 'undefined') {
  if (!API_URL) {
    console.warn('⚠️ NEXT_PUBLIC_API_URL is NOT set. Create an environment variable in your hosting dashboard!');
  } else if (!API_URL.startsWith('https') && !API_URL.includes('localhost') && !API_URL.includes('127.0.0.1')) {
    console.warn(`⚠️ API_URL (${API_URL}) is NOT using HTTPS. Modern browsers may block these requests.`);
  } else {
    console.log(`✅ API_URL configured: ${API_URL}`);
  }
}
