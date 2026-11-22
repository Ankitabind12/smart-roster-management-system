// Deno/Supabase Edge Function — Send Email via Resend
// Deploy to Supabase: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'RosterFlow <noreply@rosterflow.demo>';
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

interface EmailPayload {
  to: string;
  toName: string;
  type: string;
  subject: string;
  templateData: Record<string, unknown>;
  relatedId?: string;
  relatedType?: string;
}

function buildEmailHtml(payload: EmailPayload): string {
  const { type, templateData, toName } = payload;
  const appUrl = APP_URL;

  const header = `
    <div style="background:#4f46e5;padding:24px 32px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700">⚡ RosterFlow</h1>
      <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px">Smart Workforce Management</p>
    </div>
  `;

  const footer = `
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px">
      <p style="color:#94a3b8;font-size:12px;margin:0">
        You received this email because you are registered on RosterFlow.<br/>
        <a href="${appUrl}" style="color:#4f46e5">Go to RosterFlow</a>
      </p>
    </div>
  `;

  let body = '';

  switch (type) {
    case 'task_assigned':
      body = `
        <div style="padding:32px">
          <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px">New Task Assigned</h2>
          <p style="color:#64748b;margin:0 0 20px">Hi ${toName}, you have been assigned a new task.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:20px">
            <h3 style="color:#1e293b;margin:0 0 12px;font-size:16px">${templateData.taskTitle}</h3>
            ${templateData.description ? `<p style="color:#64748b;margin:0 0 12px">${templateData.description}</p>` : ''}
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px;width:100px">Priority</td>
                  <td style="padding:4px 0;font-weight:600;color:#1e293b;font-size:13px;text-transform:capitalize">${templateData.priority}</td></tr>
              ${templateData.dueDate ? `<tr><td style="padding:4px 0;color:#94a3b8;font-size:13px">Due Date</td>
                  <td style="padding:4px 0;font-weight:600;color:#1e293b;font-size:13px">${templateData.dueDate}</td></tr>` : ''}
              ${templateData.brand ? `<tr><td style="padding:4px 0;color:#94a3b8;font-size:13px">Brand</td>
                  <td style="padding:4px 0;color:#1e293b;font-size:13px">${templateData.brand}</td></tr>` : ''}
              <tr><td style="padding:4px 0;color:#94a3b8;font-size:13px">Assigned By</td>
                  <td style="padding:4px 0;color:#1e293b;font-size:13px">${templateData.assignedBy}</td></tr>
            </table>
          </div>
          <a href="${appUrl}/tasks" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">View Task →</a>
        </div>
      `;
      break;

    case 'leave_approved':
      body = `
        <div style="padding:32px">
          <h2 style="color:#16a34a;font-size:18px;margin:0 0 8px">✅ Leave Approved</h2>
          <p style="color:#64748b;margin:0 0 20px">Hi ${toName}, your leave request has been approved.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#166534;font-size:13px;width:120px">Leave Type</td>
                  <td style="padding:4px 0;font-weight:600;color:#14532d;font-size:13px;text-transform:capitalize">${templateData.leaveType}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:13px">From</td>
                  <td style="padding:4px 0;font-weight:600;color:#14532d;font-size:13px">${templateData.startDate}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:13px">To</td>
                  <td style="padding:4px 0;font-weight:600;color:#14532d;font-size:13px">${templateData.endDate}</td></tr>
              <tr><td style="padding:4px 0;color:#166534;font-size:13px">Duration</td>
                  <td style="padding:4px 0;font-weight:600;color:#14532d;font-size:13px">${templateData.days} day(s)</td></tr>
            </table>
            ${templateData.notes ? `<p style="color:#166534;margin:12px 0 0;font-size:13px"><strong>Note:</strong> ${templateData.notes}</p>` : ''}
          </div>
          <a href="${appUrl}/leave" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">View Leave Details →</a>
        </div>
      `;
      break;

    case 'leave_rejected':
      body = `
        <div style="padding:32px">
          <h2 style="color:#dc2626;font-size:18px;margin:0 0 8px">❌ Leave Request Rejected</h2>
          <p style="color:#64748b;margin:0 0 20px">Hi ${toName}, your leave request was not approved.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:4px 0;color:#991b1b;font-size:13px;width:120px">Leave Type</td>
                  <td style="padding:4px 0;color:#7f1d1d;font-size:13px;text-transform:capitalize">${templateData.leaveType}</td></tr>
              <tr><td style="padding:4px 0;color:#991b1b;font-size:13px">Dates</td>
                  <td style="padding:4px 0;color:#7f1d1d;font-size:13px">${templateData.startDate} — ${templateData.endDate}</td></tr>
            </table>
            ${templateData.notes ? `<p style="color:#991b1b;margin:12px 0 0;font-size:13px"><strong>Reason:</strong> ${templateData.notes}</p>` : ''}
          </div>
          <a href="${appUrl}/leave" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">View Request →</a>
        </div>
      `;
      break;

    case 'roster_published':
      body = `
        <div style="padding:32px">
          <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px">📅 Your Roster is Ready</h2>
          <p style="color:#64748b;margin:0 0 20px">Hi ${toName}, your roster for <strong>${templateData.month} ${templateData.year}</strong> has been published.</p>
          <a href="${appUrl}/roster" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">View Your Roster →</a>
        </div>
      `;
      break;

    default:
      body = `
        <div style="padding:32px">
          <h2 style="color:#1e293b;font-size:18px;margin:0 0 8px">Notification from RosterFlow</h2>
          <p style="color:#64748b">Hi ${toName}, you have a new notification on RosterFlow.</p>
          <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px">Go to App →</a>
        </div>
      `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${payload.subject}</title></head>
    <body style="margin:0;padding:20px;background:#f1f5f9;font-family:Inter,-apple-system,sans-serif">
      <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        ${header}
        ${body}
        ${footer}
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set — email sending skipped (dev mode)');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY not configured' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: EmailPayload = await req.json();

    // Guard: never send to fake demo addresses
    if (payload.to.includes('.demo') || payload.to.includes('example.com')) {
      console.log(`Skipping email to demo address: ${payload.to}`);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Demo email address — not sent' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const html = buildEmailHtml(payload);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [payload.to],
        subject: payload.subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message ?? 'Resend API error');
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('send-email error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
