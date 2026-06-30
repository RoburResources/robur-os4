import { base44 } from '@/api/base44Client';

export async function detectClientChurn(payload) {
  return base44.functions.invoke('detectClientChurn', payload);
}