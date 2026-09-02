import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LaunchSite } from './src/types';
import SiteListScreen from './src/screens/SiteListScreen';
import SiteDetailScreen from './src/screens/SiteDetailScreen';
import AddSiteScreen from './src/screens/AddSiteScreen';

export type RootStackParamList = {
  SiteList: undefined;
  SiteDetail: { site: LaunchSite };
  AddSite: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#1b2733' },
          headerTintColor: '#1b3a57',
        }}
      >
        <Stack.Screen name="SiteList" component={SiteListScreen} options={{ title: 'Termika – vzletišča' }} />
        <Stack.Screen name="SiteDetail" component={SiteDetailScreen} options={{ title: 'Vreme' }} />
        <Stack.Screen name="AddSite" component={AddSiteScreen} options={{ title: 'Dodaj lokacijo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
