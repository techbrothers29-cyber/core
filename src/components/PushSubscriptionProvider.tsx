import React from 'react';
import { usePushSubscription } from '@/hooks/usePushSubscription';

export function PushSubscriptionProvider({ children }: { children: React.ReactNode }) {
  usePushSubscription();
  return <>{children}</>;
}
