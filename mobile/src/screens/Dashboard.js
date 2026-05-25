import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { authService } from '../services/supabase';
import { checkBackendHealth, getApiBaseUrl } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null); // 'checking' | 'online' | 'offline'
  const [recentTranslations, setRecentTranslations] = useState([
    { id: '1', text: 'HELLO PLEASE', translated: 'नमस्ते कृपया', lang: 'Hindi', time: '10 mins ago' },
    { id: '2', text: 'THANK YOU', translated: 'Gracias', lang: 'Spanish', time: '1 hour ago' },
    { id: '3', text: 'I NEED HELP', translated: 'எனக்கு உதவி தேவை', lang: 'Tamil', time: 'Yesterday' }
  ]);

  useEffect(() => {
    // Get user metadata
    const getUserInfo = async () => {
      const { data } = await authService.getSession();
      if (data?.user) {
        setUser(data.user);
      }
    };
    
    getUserInfo();
    checkBackend();

    // Check backend health periodically (every 10 seconds)
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    setBackendOnline('checking');
    const status = await checkBackendHealth();
    if (status.online) {
      setBackendOnline('online');
    } else {
      setBackendOnline('offline');
    }
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{username} 👋</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Backend health status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIndicatorWrapper}>
              <View style={[
                styles.statusDot, 
                backendOnline === 'online' ? styles.statusOnline : 
                backendOnline === 'checking' ? styles.statusChecking : styles.statusOffline
              ]} />
              <Text style={styles.statusText}>
                {backendOnline === 'online' ? 'Python ML Core Connected' : 
                 backendOnline === 'checking' ? 'Syncing with Python Engine...' : 'Python Engine Offline'}
              </Text>
            </View>
            <TouchableOpacity onPress={checkBackend} style={styles.syncBtn}>
              <MaterialCommunityIcons name="sync" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.statusSubtext}>
            Endpoint: {getApiBaseUrl()}
          </Text>
          {backendOnline === 'offline' && (
            <Text style={styles.statusWarningText}>
              Note: Camera prediction will run in simulation mode. Configure host IP in Profile screen.
            </Text>
          )}
        </View>

        {/* Translation Banner Card (Hero Action) */}
        <TouchableOpacity 
          style={styles.heroCard}
          onPress={() => navigation.navigate('Translator')}
          activeOpacity={0.9}
        >
          <View style={styles.heroLeft}>
            <View style={styles.heroIconContainer}>
              <MaterialCommunityIcons name="gesture-double-tap" size={28} color={theme.colors.background} />
            </View>
            <Text style={styles.heroTitle}>Start Translation</Text>
            <Text style={styles.heroDescription}>Translate hand gestures to speech in real time</Text>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.actionArrow}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={theme.colors.text} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Grid cards */}
        <View style={styles.gridContainer}>
          {/* Learn ASL Card */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('LearnASL')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconWrapper, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
              <MaterialCommunityIcons name="school-outline" size={24} color="#3498db" />
            </View>
            <Text style={styles.gridCardTitle}>Learn ASL</Text>
            <Text style={styles.gridCardDesc}>Browse alphabets and hand shape guide cards</Text>
          </TouchableOpacity>

          {/* Profile Card */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconWrapper, { backgroundColor: 'rgba(155, 89, 182, 0.15)' }]}>
              <MaterialCommunityIcons name="cog-outline" size={24} color="#9b59b6" />
            </View>
            <Text style={styles.gridCardTitle}>Settings</Text>
            <Text style={styles.gridCardDesc}>Configure backend URLs & change passwords</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Translation Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Translations</Text>
          <MaterialCommunityIcons name="history" size={20} color={theme.colors.textMuted} />
        </View>

        {recentTranslations.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyIconWrapper}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.historyDetails}>
              <Text style={styles.historyInputText} numberOfLines={1}>{item.text}</Text>
              <Text style={styles.historyTranslationText} numberOfLines={1}>
                {item.translated} <Text style={styles.historyLangText}>({item.lang})</Text>
              </Text>
            </View>
            <Text style={styles.historyTime}>{item.time}</Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  profileBtn: {
    padding: 2,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: theme.roundness.full,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: theme.fonts.bold,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: theme.roundness.full,
    marginRight: theme.spacing.sm,
  },
  statusOnline: {
    backgroundColor: theme.colors.success,
  },
  statusChecking: {
    backgroundColor: theme.colors.warning,
  },
  statusOffline: {
    backgroundColor: theme.colors.error,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  syncBtn: {
    padding: theme.spacing.xs,
  },
  statusSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontFamily: theme.fonts.regular,
  },
  statusWarningText: {
    fontSize: 10,
    color: '#fbbf24',
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.regular,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  heroLeft: {
    flex: 1,
  },
  heroIconContainer: {
    width: 42,
    height: 42,
    borderRadius: theme.roundness.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primaryInverse,
    fontFamily: theme.fonts.bold,
  },
  heroDescription: {
    fontSize: 13,
    color: 'rgba(9, 9, 11, 0.7)', // faded background color
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  heroRight: {
    marginLeft: theme.spacing.md,
  },
  actionArrow: {
    width: 38,
    height: 38,
    borderRadius: theme.roundness.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    width: '48%',
    ...theme.shadows.sm,
  },
  gridIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: theme.roundness.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.bold,
  },
  gridCardDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    lineHeight: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: theme.roundness.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  historyDetails: {
    flex: 1,
  },
  historyInputText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  historyTranslationText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  historyLangText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  historyTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.regular,
  }
});
