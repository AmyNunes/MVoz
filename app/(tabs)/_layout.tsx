import { Tabs } from 'expo-router/js-tabs';

import { MeterButton } from '@/components/navigation/MeterButton';
import { TabBar } from '@/components/navigation/TabBar';
import { strings } from '@/i18n/strings';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} center={<MeterButton />} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.today }} />
      <Tabs.Screen name="exercises" options={{ title: strings.tabs.exercises }} />
      <Tabs.Screen name="plan" options={{ title: strings.tabs.plan }} />
      <Tabs.Screen name="progress" options={{ title: strings.tabs.progress }} />
    </Tabs>
  );
}
