import { base44 } from '@/api/base44Client';

export async function autoBookMaintenance(payload) {
  return base44.functions.invoke('autoBookMaintenance', payload);
}