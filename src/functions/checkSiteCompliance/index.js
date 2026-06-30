import { base44 } from '@/api/base44Client';

export async function checkSiteCompliance(payload) {
  return base44.functions.invoke('checkSiteCompliance', payload);
}