export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;

if (!API_URL && typeof window !== 'undefined') {
  console.warn('⚠️ NEXT_PUBLIC_API_URL is not set. API calls will fail in production.');
}
