import { base44 } from '@/api/base44Client';

export async function generateComplianceReport(payload) {
  return base44.functions.invoke('generateComplianceReport', payload);
}