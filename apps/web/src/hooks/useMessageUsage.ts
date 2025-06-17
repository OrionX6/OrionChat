import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';

interface MessageUsage {
  used: number;
  limit: number;
  resetDate: Date;
  isAtLimit: boolean;
  daysUntilReset: number;
}

const MONTHLY_MESSAGE_LIMIT = 1500;

export function useMessageUsage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<MessageUsage>({
    used: 0,
    limit: MONTHLY_MESSAGE_LIMIT,
    resetDate: new Date(),
    isAtLimit: false,
    daysUntilReset: 0
  });
  const [loading, setLoading] = useState(true);

  // Calculate the next reset date based on user signup date
  const calculateResetDate = (signupDate: Date): Date => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const signupDay = signupDate.getDate();
    
    // Create reset date for current month
    let resetDate = new Date(currentYear, currentMonth, signupDay);
    
    // If the reset date for this month has passed, move to next month
    if (resetDate <= now) {
      resetDate = new Date(currentYear, currentMonth + 1, signupDay);
    }
    
    return resetDate;
  };

  // Calculate days until reset
  const calculateDaysUntilReset = (resetDate: Date): number => {
    const now = new Date();
    const diffTime = resetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Fetch current message usage
  const fetchUsage = async () => {
    if (!user) return;

    try {
      const supabase = createClient();

      // Get user signup date from auth metadata
      const signupDate = new Date(user.created_at);
      const resetDate = calculateResetDate(signupDate);

      // Calculate the start of current billing period
      const currentPeriodStart = new Date(resetDate);
      currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);

      // First get user's conversation IDs
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }

      const conversationIds = conversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        // No conversations yet, so no messages
        setUsage({
          used: 0,
          limit: MONTHLY_MESSAGE_LIMIT,
          resetDate,
          isAtLimit: false,
          daysUntilReset: calculateDaysUntilReset(resetDate)
        });
        return;
      }

      // Count user messages in current billing period (only count user messages, not assistant responses)
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .in('conversation_id', conversationIds)
        .gte('created_at', currentPeriodStart.toISOString())
        .lt('created_at', resetDate.toISOString());

      if (error) {
        console.error('Error fetching message usage:', error);
        return;
      }

      const used = count || 0;
      const isAtLimit = used >= MONTHLY_MESSAGE_LIMIT;
      const daysUntilReset = calculateDaysUntilReset(resetDate);

      setUsage({
        used,
        limit: MONTHLY_MESSAGE_LIMIT,
        resetDate,
        isAtLimit,
        daysUntilReset
      });
    } catch (error) {
      console.error('Error calculating message usage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user can send a message
  const canSendMessage = (): boolean => {
    return !usage.isAtLimit;
  };

  // Increment message count (call this when a message is sent)
  const incrementUsage = () => {
    setUsage(prev => ({
      ...prev,
      used: prev.used + 1,
      isAtLimit: (prev.used + 1) >= MONTHLY_MESSAGE_LIMIT
    }));
  };

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  // Refresh usage every minute to update days until reset
  useEffect(() => {
    const interval = setInterval(() => {
      if (usage.resetDate) {
        const daysUntilReset = calculateDaysUntilReset(usage.resetDate);
        setUsage(prev => ({ ...prev, daysUntilReset }));
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [usage.resetDate]);

  return {
    usage,
    loading,
    canSendMessage,
    incrementUsage,
    refreshUsage: fetchUsage
  };
}
