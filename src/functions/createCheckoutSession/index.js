import { base44 } from '@/api/base44Client';

export async function createCheckoutSession(payload) {
  return base44.functions.invoke('createCheckoutSession', payload);
}