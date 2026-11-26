import { Stack } from 'expo-router';
import { Providers } from '@/components/Providers';

export default function RootLayout() {
  return (
    <Providers>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      />
    </Providers>
  );
}