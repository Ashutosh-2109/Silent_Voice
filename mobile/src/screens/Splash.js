import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme/theme';
import { authService } from '../services/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Intro animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the loader
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Session check and transition
    const checkSession = async () => {
      // Simulate splash display duration
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const { data: session } = await authService.getSession();
      
      if (session) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="hands-pray" size={72} color={theme.colors.accent} />
        </View>
        <Text style={styles.title}>SilentVoice</Text>
        <Text style={styles.subtitle}>The Symphony of Aphonics</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderContainer, { opacity: pulseAnim }]}>
        <View style={styles.loaderLine} />
        <Text style={styles.loadingText}>Initializing engine...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: theme.roundness.xl,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 1.5,
    fontFamily: theme.fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    letterSpacing: 0.5,
    fontFamily: theme.fonts.regular,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderLine: {
    width: 40,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.roundness.full,
    marginBottom: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.regular,
    letterSpacing: 0.5,
  }
});
