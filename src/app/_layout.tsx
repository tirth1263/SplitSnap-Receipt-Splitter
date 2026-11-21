import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Head>
        <title>SplitSnap – Snap a receipt, split it fairly</title>
        <meta name="description" content="Snap a receipt, tap what you ate, and SplitSnap splits tax and tip fairly, down to the cent." />
      </Head>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaProvider>
  );
}
