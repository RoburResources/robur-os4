import { base44 } from '@/api/base44Client';

export async function autoCreateJobFromBooking(payload) {
  return base44.functions.invoke('autoCreateJobFromBooking', payload);
}