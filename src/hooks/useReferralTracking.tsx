import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Tracks affiliate referral clicks from URL parameters.
 * Looks for ?ref=AFFILIATE_CODE in the URL and increments the click count.
 * Uses sessionStorage to avoid counting duplicate clicks in the same session.
 */
export const useReferralTracking = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode) return;

    // Persist referrer for signup attribution (used by pix-webhook commission flow)
    try {
      localStorage.setItem('referrer_affiliate_code', refCode);
    } catch {}

    const storageKey = `ref_tracked_${refCode}`;

    // Avoid counting the same referral twice in the same session
    if (sessionStorage.getItem(storageKey)) return;

    const trackClick = async () => {
      try {
        const { data } = await supabase.rpc('track_affiliate_click', {
          affiliate_code_param: refCode,
        });

        if (data) {
          sessionStorage.setItem(storageKey, '1');
        }
      } catch (error) {
        console.error('Error tracking referral click:', error);
      }
    };

    trackClick();
  }, [searchParams]);
};
