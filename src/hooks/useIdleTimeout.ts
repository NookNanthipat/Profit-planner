import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

/**
 * Automatically signs out the user after a period of inactivity.
 * Default is 15 minutes (900,000 ms).
 */
export function useIdleTimeout(timeoutMs: number = 15 * 60 * 1000) {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (user) {
      timerRef.current = setTimeout(() => {
        handleLogout();
      }, timeoutMs);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity for security.",
    });
  };

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const listener = () => resetTimer();

    if (user) {
      // Initialize timer
      resetTimer();
      
      // Add listeners
      events.forEach((event) => {
        window.addEventListener(event, listener);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, listener);
      });
    };
  }, [user, timeoutMs]);

  return null;
}
