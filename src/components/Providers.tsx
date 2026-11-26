'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings } = useAppStore();

  // Initialize theme from store on first load
  React.useEffect(() => {
    // Theme is handled by useTheme hook
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}