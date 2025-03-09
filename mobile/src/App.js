import React, { useState, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import screens
import HomeScreen from './screens/HomeScreen';
import DataScreen from './screens/DataScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import DeviceScreen from './screens/DeviceScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import DataDetailScreen from './screens/DataDetailScreen';
import WalletSetupScreen from './screens/WalletSetupScreen';
import DeviceSetupScreen from './screens/DeviceSetupScreen';
import SubmitDataScreen from './screens/SubmitDataScreen';
import MarketplaceDetailScreen from './screens/MarketplaceDetailScreen';

// Import contexts
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { DataProvider } from './contexts/DataContext';

// Disable specific warnings
LogBox.ignoreLogs([
  'ReactNativeFiberHostComponent: Calling getNode() on the ref of an Animated component',
  'Non-serializable values were found in the navigation state',
]);

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Authentication stack
const AuthStack = () => (
  <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="WalletSetup" component={WalletSetupScreen} />
  </Stack.Navigator>
);

// Main tab navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Data') {
          iconName = focused ? 'chart-box' : 'chart-box-outline';
        } else if (route.name === 'Marketplace') {
          iconName = focused ? 'store' : 'store-outline';
        } else if (route.name === 'Device') {
          iconName = focused ? 'watch' : 'watch-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'account' : 'account-outline';
        }

        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#14F195',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: '#1E1E1E',
        borderTopColor: '#333',
      },
      headerStyle: {
        backgroundColor: '#1E1E1E',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Data" component={DataScreen} />
    <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
    <Tab.Screen name="Device" component={DeviceScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Main app
const App = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setIsLoggedIn(!!token);
        
        const onboarded = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(!!onboarded);
        
        setIsAppReady(true);
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsAppReady(true);
      }
    };

    checkLoginStatus();
  }, []);

  // Monitor network connection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (!isAppReady) {
    return null; // Or a splash screen
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      <AuthProvider>
        <DeviceProvider>
          <DataProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!hasOnboarded ? (
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                ) : !isLoggedIn ? (
                  <Stack.Screen name="Auth" component={AuthStack} />
                ) : (
                  <>
                    <Stack.Screen name="Main" component={MainTabs} />
                    <Stack.Screen
                      name="DataDetail"
                      component={DataDetailScreen}
                      options={{ headerShown: true, title: '数据详情' }}
                    />
                    <Stack.Screen
                      name="DeviceSetup"
                      component={DeviceSetupScreen}
                      options={{ headerShown: true, title: '设备设置' }}
                    />
                    <Stack.Screen
                      name="SubmitData"
                      component={SubmitDataScreen}
                      options={{ headerShown: true, title: '提交数据' }}
                    />
                    <Stack.Screen
                      name="MarketplaceDetail"
                      component={MarketplaceDetailScreen}
                      options={{ headerShown: true, title: '市场详情' }}
                    />
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </DataProvider>
        </DeviceProvider>
      </AuthProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});

export default App; 