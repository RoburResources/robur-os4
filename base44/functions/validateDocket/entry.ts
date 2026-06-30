import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, docket_id } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Extract structured data from the docket image using the platform's built-in extraction
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          docket_no: { type: 'string' },
          date: { type: 'string' },
          time_in: { type: 'string' },
          time_out: { type: 'string' },
          vehicle: { type: 'string' },
          driver: { type: 'string' },
          material: { type: 'string' },
          gross_weight: { type: 'number' },
          tare_weight: { type: 'number' },
          net_weight: { type: 'number' },
          site: { type: 'string' },
        },
      },
    });

    if (result.status !== 'success' || !result.output) {
      return Response.json({ error: 'Extraction failed', details: result.details }, { status: 422 });
    }

    const extracted = Array.isArray(result.output) ? result.output[0] : result.output;

    // If a docket_id was provided, update the existing Docket record
    if (docket_id && extracted.docket_no) {
      const updated = await base44.entities.Docket.update(docket_id, {
        ...extracted,
        status: 'validated',
      });
      return Response.json({ status: 'validated', docket: updated, extracted });
    }

    // Otherwise create a new validated Docket record
    const docket = await base44.entities.Docket.create({
      ...extracted,
      source: 'ocr',
      status: 'validated',
    });

    return Response.json({ status: 'created', docket, extracted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});