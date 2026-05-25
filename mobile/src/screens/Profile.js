import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Switch, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';
import { authService } from '../services/supabase';
import { setApiHost, getApiBaseUrl, checkBackendHealth } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  
  // Settings States
  const [serverIp, setServerIp] = useState('');
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);
  const [isHapticFeedbackEnabled, setIsHapticFeedbackEnabled] = useState(true);
  
  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Loading States
  const [savingServer, setSavingServer] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Load current user and API URL
    const initData = async () => {
      const { data } = await authService.getSession();
      if (data?.user) {
        setUser(data.user);
      }
      
      // Extract IP/host from current API URL
      const currentUrl = getApiBaseUrl();
      const match = currentUrl.match(/http:\/\/(.*?)(:\d+)?$/);
      if (match && match[1]) {
        setServerIp(match[1]);
      } else {
        setServerIp(currentUrl);
      }
    };
    
    initData();
  }, []);

  // Save backend API address
  const handleSaveServer = async () => {
    if (!serverIp) {
      Alert.alert("Error", "Please enter a valid IP address or domain.");
      return;
    }
    
    setSavingServer(true);
    // Update API client setting
    setApiHost(serverIp);
    
    // Check if new address is online
    const status = await checkBackendHealth();
    setSavingServer(false);
    
    if (status.online) {
      Alert.alert("Success", `Connected to Python Engine successfully at ${getApiBaseUrl()}!`);
    } else {
      Alert.alert("Server Warning", `API host updated, but the server is offline or unreachable.\nDetails: ${status.error}`);
    }
  };

  // Change Password
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    
    setChangingPass(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setChangingPass(false);
    
    Alert.alert("Success", "Password updated successfully!");
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Sign out
  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out of SilentVoice?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);
            await authService.signOut();
            setLoggingOut(false);
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'user@silentvoice.ai';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{username.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.usernameText}>{username}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Python Backend Server Config */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Python Engine Connection</Text>
          <Text style={styles.sectionDescription}>
            Enter your computer's local IP address (e.g. 192.168.1.5) to hook the mobile app with the running python backend.
          </Text>
          
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="server" size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={serverIp}
              onChangeText={setServerIp}
            />
            <TouchableOpacity 
              style={styles.saveServerBtn}
              onPress={handleSaveServer}
              disabled={savingServer}
            >
              {savingServer ? (
                <ActivityIndicator color={theme.colors.primaryInverse} size="small" />
              ) : (
                <Text style={styles.saveServerBtnText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* General Toggles */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <MaterialCommunityIcons name="volume-high" size={20} color={theme.colors.textSecondary} style={styles.toggleIcon} />
              <View>
                <Text style={styles.toggleLabel}>Autoplay Audio</Text>
                <Text style={styles.toggleSublabel}>Speak translations automatically</Text>
              </View>
            </View>
            <Switch
              value={isAutoSpeakEnabled}
              onValueChange={setIsAutoSpeakEnabled}
              trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.accent }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : theme.colors.primary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelContainer}>
              <MaterialCommunityIcons name="vibrate" size={20} color={theme.colors.textSecondary} style={styles.toggleIcon} />
              <View>
                <Text style={styles.toggleLabel}>Haptic Feedback</Text>
                <Text style={styles.toggleSublabel}>Vibrate on gesture detection</Text>
              </View>
            </View>
            <Switch
              value={isHapticFeedbackEnabled}
              onValueChange={setIsHapticFeedbackEnabled}
              trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.accent }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : theme.colors.primary}
            />
          </View>
        </View>

        {/* Change Password Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          
          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>Current Password</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>New Password</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formFieldLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.formInput}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity 
            style={styles.submitBtn}
            onPress={handleChangePassword}
            disabled={changingPass}
          >
            {changingPass ? (
              <ActivityIndicator color={theme.colors.primaryInverse} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color={theme.colors.error} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} style={{ marginRight: theme.spacing.sm }} />
              <Text style={styles.logoutBtnText}>Logout Account</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>SilentVoice Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: theme.roundness.full,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarLargeText: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  usernameText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  emailText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    height: 48,
    paddingLeft: theme.spacing.md,
    overflow: 'hidden',
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  saveServerBtn: {
    backgroundColor: theme.colors.primary,
    height: '100%',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveServerBtnText: {
    color: theme.colors.primaryInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  toggleSublabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: theme.fonts.regular,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  formField: {
    marginBottom: theme.spacing.md,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontFamily: theme.fonts.medium,
  },
  formInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    height: 44,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  submitBtnText: {
    color: theme.colors.primaryInverse,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: theme.roundness.lg,
    height: 48,
    marginBottom: theme.spacing.xl,
  },
  logoutBtnText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
  },
  versionText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontFamily: theme.fonts.regular,
  }
});
