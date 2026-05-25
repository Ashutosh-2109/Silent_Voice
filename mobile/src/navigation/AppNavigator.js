import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text, StyleSheet, Linking } from 'react-native';
import { authService } from '../services/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoginScreen from '../screens/Login';
import SignupScreen from '../screens/Signup';
import DashboardScreen from '../screens/Dashboard';
import TranslatorScreen from '../screens/Translator';
import LearnASLScreen from '../screens/LearnASL';
import ProfileScreen from '../screens/Profile';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Helper to process raw OAuth redirect deep link and complete sign-in
    const handleDeepLink = async (url) => {
      if (!url) return;
      console.log("Captured deep link URL:", url);
      
      // Extract tokens from url. E.g. silentvoice://google-auth#access_token=xxx&refresh_token=yyy
      const hash = url.split('#')[1];
      if (!hash) return;
      
      const params = {};
      hash.split('&').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
      
      if (params.access_token && params.refresh_token) {
        console.log("Setting Supabase session from deep link OAuth tokens...");
        const { error } = await authService.setSession(params.access_token, params.refresh_token);
        if (error) {
          console.error("Error setting session from deep link:", error.message);
        }
      }
    };

    // Check if app was opened by a deep link
    Linking.getInitialURL().then(url => {
      if (mounted && url) {
        handleDeepLink(url);
      }
    });

    // Listen for incoming deep links while app is running
    const linkSubscription = Linking.addEventListener('url', (event) => {
      if (mounted && event.url) {
        handleDeepLink(event.url);
      }
    });

    // Fetch initial session on mount to avoid being logged out on app refresh
    const fetchInitialSession = async () => {
      try {
        const { data, error } = await authService.getSession();
        if (mounted) {
          setSession(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to retrieve initial session:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialSession();

    // Listen for auth state changes (login, logout, token refresh, social logins)
    const { data: { subscription } } = authService.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      if (linkSubscription) {
        linkSubscription.remove();
      }
    };
  }, []);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="hands-pray" size={48} color="#10b981" />
        </View>
        <Text style={styles.title}>SilentVoice</Text>
        <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#09090b' },
        gestureEnabled: true,
        animationEnabled: true,
      }}
    >
      {session ? (
        // Protected App Stack
        <>
          <Stack.Screen name="Main" component={DashboardScreen} />
          <Stack.Screen name="Translator" component={TranslatorScreen} />
          <Stack.Screen name="LearnASL" component={LearnASLScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        // Auth Onboarding Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fafafa',
    letterSpacing: 1.5,
  }
});
