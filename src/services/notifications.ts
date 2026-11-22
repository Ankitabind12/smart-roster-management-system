import { supabase } from '../lib/supabase';
import type { NotificationType } from '../types/database';

// ---------------------------------------------------------------------------
// In-app notifications
// ---------------------------------------------------------------------------

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    recipient_id: recipientId,
    notification_type: type,
    title,
    message,
    related_id: relatedId,
    related_type: relatedType,
  });
  if (error) console.error('Failed to create notification:', error);
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return !error;
}

export async function markAllRead(recipientId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
  return !error;
}

// ---------------------------------------------------------------------------
// Email notifications (via Supabase Edge Function)
// ---------------------------------------------------------------------------

export async function sendEmailNotification(payload: {
  to: string;
  toName: string;
  type: string;
  subject: string;
  templateData: Record<string, unknown>;
  relatedId?: string;
  relatedType?: string;
}): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: payload,
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Email send failed:', err);
    // Log the failure to the email_logs table
    await supabase.from('email_logs').insert({
      recipient_email: payload.to,
      recipient_name: payload.toName,
      email_type: payload.type,
      subject: payload.subject,
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    });
    return { success: false, error: err };
  }
}

// ---------------------------------------------------------------------------
// Activity logging
// ---------------------------------------------------------------------------

export async function logActivity(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('activity_logs').insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata,
  });
}
