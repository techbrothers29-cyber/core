import { supabase } from "@/integrations/supabase/client";

// Enhanced security utilities for client-side protection

export class SecurityAudit {
  static async logSensitiveDataAccess(
    entityType: string,
    entityId: string,
    action: string,
    description: string,
    metadata?: Record<string, any>
  ) {
    try {
      await supabase.rpc('log_sensitive_access_enhanced', {
        table_name: entityType,
        record_id: entityId,
        access_type: action,
        sensitive_fields: metadata?.fields || []
      });
    } catch (error) {
      console.error('Failed to log security audit:', error);
    }
  }

  static async logFailedAccess(
    entityType: string,
    action: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          entity_type: entityType,
          action: `failed_${action}`,
          description: `Access denied: ${reason}`,
          level: 'warning',
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            url: window.location.href
          }
        });
    } catch (error) {
      console.error('Failed to log failed access:', error);
    }
  }
}

// Input sanitization for client-side
export const sanitizeForDisplay = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Rate limiting for client-side actions
export class ClientRateLimit {
  private static limits = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(key: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (limit.count >= maxRequests) {
      return false;
    }

    limit.count++;
    return true;
  }
}

// Enhanced input validation using server-side validation
export const validateInput = async (inputType: string, inputValue: string): Promise<boolean> => {
  try {
    const { data } = await supabase.rpc('validate_sensitive_input', {
      input_type: inputType,
      input_value: inputValue
    });
    return data;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
};

// Enhanced data validation helpers
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateEmail = async (email: string): Promise<boolean> => {
  if (!email || email.length > 254) return false;
  return await validateInput('email', email);
};

export const validateCPF = async (cpf: string): Promise<boolean> => {
  if (!cpf) return false;
  return await validateInput('cpf', cpf);
};

export const validatePhone = async (phone: string): Promise<boolean> => {
  if (!phone) return false;
  return await validateInput('phone', phone);
};

// Session security utilities
export class SessionSecurity {
  static async trackSession() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      // Only insert one session record per browser session per access token to
      // avoid hammering user_sessions on every page load / auth refresh event,
      // which was the slowest query on the platform.
      const tokenFingerprint = session.session.access_token.substring(0, 10);
      const flagKey = `session_tracked_${tokenFingerprint}`;
      try {
        if (sessionStorage.getItem(flagKey)) return;
        sessionStorage.setItem(flagKey, '1');
      } catch {
        // sessionStorage might be unavailable (private mode); fall through.
      }

      await supabase.from('user_sessions').insert({
        user_id: session.session.user.id,
        session_token: tokenFingerprint + '...',
        ip_address: null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to track session:', error);
    }
  }

  static async getClientIP(): Promise<string> {
    return 'unknown';
  }

  static async checkAccountLockout(email: string): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('check_account_lockout_enhanced', email as any);
      return data;
    } catch (error) {
      console.error('Failed to check account lockout:', error);
      return false;
    }
  }
}

// Secure data fetching with automatic audit logging
export const secureDataFetch = async <T>(
  query: any,
  entityType: string,
  action: string = 'read'
): Promise<T | null> => {
  try {
    const { data, error } = await query;

    if (error) {
      await SecurityAudit.logFailedAccess(entityType, action, error.message);
      throw error;
    }

    // Log successful access to sensitive data
    if (data && (entityType === 'companies' || entityType === 'user_vouchers' || entityType === 'transactions')) {
      await SecurityAudit.logSensitiveDataAccess(
        entityType,
        Array.isArray(data) ? 'multiple' : data.id || 'unknown',
        action,
        `Accessed ${entityType} data`,
        { record_count: Array.isArray(data) ? data.length : 1 }
      );
    }

    return data;
  } catch (error) {
    console.error(`Secure fetch failed for ${entityType}:`, error);
    return null;
  }
};