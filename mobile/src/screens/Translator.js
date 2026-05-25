import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, ActivityIndicator, Image } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { theme } from '../theme/theme';
import { predictImage, getSuggestions, translateText, getSpeechAudio, checkBackendHealth } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function TranslatorScreen({ navigation }) {
  // Camera Permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // App States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [currentLetter, setCurrentLetter] = useState('-');
  const [confidence, setConfidence] = useState(0);
  const [detectedWord, setDetectedWord] = useState('');
  const [translatedSentence, setTranslatedSentence] = useState('');
  
  const [suggestions, setSuggestions] = useState(["HELLO", "I", "THE", "PLEASE", "CAN"]);
  const [selectedLang, setSelectedLang] = useState('hi'); // Default: Hindi
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Audio Playback Ref
  const soundRef = useRef(null);
  const cameraRef = useRef(null);
  const processingRef = useRef(false);
  const frameIntervalRef = useRef(null);

  const languages = [
    { label: 'Hindi (हिन्दी)', code: 'hi' },
    { label: 'Spanish (Español)', code: 'es' },
    { label: 'Tamil (தமிழ்)', code: 'ta' },
    { label: 'Telugu (తెలుగు)', code: 'te' },
    { label: 'Marathi (मराठी)', code: 'mr' }
  ];

  useEffect(() => {
    // Check backend on load
    checkServer();
    loadSuggestions('');

    return () => {
      stopInferenceLoop();
      unloadSound();
    };
  }, []);

  // Check backend server status
  const checkServer = async () => {
    const status = await checkBackendHealth();
    setIsServerOnline(status.online);
  };

  const unloadSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("Error unloading sound:", e);
      }
      soundRef.current = null;
    }
  };

  // NLTK word suggestions loader
  const loadSuggestions = async (word) => {
    const list = await getSuggestions(word);
    setSuggestions(list);
  };

  // Start / Stop Camera Actions
  const handleToggleCamera = async () => {
    if (isCameraActive) {
      stopInferenceLoop();
      setIsCameraActive(false);
    } else {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) return;
      }
      setIsCameraActive(true);
      setIsPaused(false);
      startInferenceLoop();
    }
  };

  // Inference looping (capturing frames periodically)
  const startInferenceLoop = () => {
    stopInferenceLoop();
    
    // Process a frame every 1.5 seconds if server is online
    frameIntervalRef.current = setInterval(async () => {
      if (!isCameraActive || isPaused || processingRef.current || !isServerOnline) return;
      if (!cameraRef.current) return;
      
      processingRef.current = true;
      try {
        // Take a snapshot
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true
        });
        
        if (photo && photo.base64) {
          const result = await predictImage(photo.base64);
          if (result.detected) {
            setCurrentLetter(result.letter);
            setConfidence(Math.round(result.confidence * 100));
            
            // Replicate letter buffer aggregation (10 frame hold count simplified for snapshots)
            // If confidence > 80%, auto append letter
            if (result.confidence > 0.8) {
              handleAppendLetter(result.letter);
            }
          } else {
            setCurrentLetter('-');
            setConfidence(0);
          }
        }
      } catch (e) {
        console.warn("Frame capture error:", e);
      } finally {
        processingRef.current = false;
      }
    }, 1500);
  };

  const stopInferenceLoop = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  };

  // Add character to word buffer
  const handleAppendLetter = (letter) => {
    if (!letter || letter === '-') return;
    const newWord = detectedWord + letter;
    setDetectedWord(newWord);
    loadSuggestions(newWord.split(' ').pop());
  };

  // Space Button (Finish current word)
  const handleAddSpace = () => {
    const newWord = detectedWord + ' ';
    setDetectedWord(newWord);
    loadSuggestions('');
  };

  // Backspace Button
  const handleBackspace = () => {
    if (detectedWord.length > 0) {
      const newWord = detectedWord.slice(0, -1);
      setDetectedWord(newWord);
      loadSuggestions(newWord.split(' ').pop());
    }
  };

  // Clear Text Button
  const handleClearText = () => {
    setDetectedWord('');
    setTranslatedSentence('');
    setCurrentLetter('-');
    setConfidence(0);
    loadSuggestions('');
  };

  // Suggestion selector
  const handleUseSuggestion = (suggestion) => {
    const words = detectedWord.trim().split(' ');
    if (words.length > 0 && detectedWord.slice(-1) !== ' ') {
      words[words.length - 1] = suggestion;
    } else {
      words.push(suggestion);
    }
    const newSentence = words.join(' ') + ' ';
    setDetectedWord(newSentence);
    loadSuggestions('');
  };

  // Translate sentence
  const handleTranslate = async () => {
    const sentence = detectedWord.trim();
    if (!sentence) return;
    
    setLoading(true);
    const trans = await translateText(sentence, selectedLang);
    setTranslatedSentence(trans);
    setLoading(false);
  };

  // Speak synthesized voice output
  const handleSpeakOutput = async () => {
    const textToSpeak = translatedSentence || detectedWord.trim();
    if (!textToSpeak) return;

    setAudioLoading(true);
    await unloadSound();
    
    // Request TTS base64 from backend or fallback to Expo Speech
    const audioData = await getSpeechAudio(textToSpeak, translatedSentence ? selectedLang : 'en');
    
    if (audioData) {
      try {
        // Play local audio using expo-av
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioData },
          { shouldPlay: true }
        );
        soundRef.current = sound;
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    } else {
      // Offline fallback: Alert
      alert(`Playing speech locally (Offline): "${textToSpeak}"`);
    }
    setAudioLoading(false);
  };

  // Simulation mode triggers
  const triggerSimulatedSign = (letter) => {
    setCurrentLetter(letter);
    setConfidence(98);
    handleAppendLetter(letter);
  };

  // Style helper based on confidence percentage
  const getConfidenceColor = () => {
    if (confidence > 80) return theme.colors.success;
    if (confidence > 50) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interpreter</Text>
        <View style={styles.headerRight}>
          <View style={[styles.serverDot, { backgroundColor: isServerOnline ? theme.colors.success : theme.colors.error }]} />
          <Text style={styles.serverText}>{isServerOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Camera Container */}
        <View style={styles.cameraContainer}>
          {isCameraActive ? (
            permission.granted ? (
              <CameraView 
                style={styles.camera} 
                facing="front"
                ref={cameraRef}
              >
                {/* Visual Camera Reticle Overlays */}
                <View style={styles.reticleContainer}>
                  <View style={styles.reticleCornerTopLeft} />
                  <View style={styles.reticleCornerTopRight} />
                  <View style={styles.reticleCornerBottomLeft} />
                  <View style={styles.reticleCornerBottomRight} />
                </View>
                
                {/* Bottom Overlay: Letter and Confidence */}
                <View style={styles.cameraOverlayBottom}>
                  <View style={styles.predictionRow}>
                    <Text style={styles.overlayLetterLabel}>Sign: </Text>
                    <Text style={styles.overlayLetter}>{currentLetter}</Text>
                  </View>
                  <View style={styles.confidenceRow}>
                    <Text style={styles.overlayConfidenceLabel}>Accuracy: </Text>
                    <Text style={[styles.overlayConfidence, { color: getConfidenceColor() }]}>
                      {confidence}%
                    </Text>
                  </View>
                </View>
              </CameraView>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.placeholderText}>Camera permission required</Text>
              </View>
            )
          ) : (
            <View style={styles.cameraPlaceholder}>
              <MaterialCommunityIcons name="camera-off" size={48} color={theme.colors.textMuted} />
              <Text style={styles.placeholderText}>Camera is paused</Text>
              <Text style={styles.placeholderSubtext}>Tap 'Start Camera' below to turn on feed</Text>
            </View>
          )}
        </View>

        {/* Live Simulator Keyboard (Shows when server is offline or camera is inactive for testing convenience) */}
        {!isCameraActive && (
          <View style={styles.simulatorContainer}>
            <Text style={styles.simulatorTitle}>ASL Sign Keyboard Simulator</Text>
            <View style={styles.simulatorGrid}>
              {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((letter) => (
                <TouchableOpacity 
                  key={letter} 
                  style={styles.simKey}
                  onPress={() => triggerSimulatedSign(letter)}
                >
                  <Text style={styles.simKeyText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Word suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionLabel}>Suggestions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
            {suggestions.map((sugg, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.suggestionBadge}
                onPress={() => handleUseSuggestion(sugg)}
              >
                <Text style={styles.suggestionText}>{sugg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sentence Buffer Display Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>ASL Text Stream</Text>
            <View style={styles.cardHeaderActions}>
              <TouchableOpacity onPress={handleBackspace} style={styles.cardActionBtn}>
                <MaterialCommunityIcons name="backspace-outline" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddSpace} style={styles.cardActionBtn}>
                <MaterialCommunityIcons name="keyboard-space" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.textOutputBox}>
            <Text style={detectedWord ? styles.outputText : styles.outputPlaceholder}>
              {detectedWord || 'Sign a letter to construct sentences...'}
            </Text>
          </View>
        </View>

        {/* Translation Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Translated Output</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langSelectorRow}>
              {languages.map((lang) => (
                <TouchableOpacity 
                  key={lang.code}
                  style={[styles.langBadge, selectedLang === lang.code && styles.langBadgeActive]}
                  onPress={() => setSelectedLang(lang.code)}
                >
                  <Text style={[styles.langText, selectedLang === lang.code && styles.langTextActive]}>
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.textOutputBox}>
            {loading ? (
              <ActivityIndicator color={theme.colors.accent} size="small" />
            ) : (
              <Text style={translatedSentence ? styles.outputText : styles.outputPlaceholder}>
                {translatedSentence || 'Select language and tap Translate...'}
              </Text>
            )}
          </View>
        </View>

        {/* Control Action Buttons */}
        <View style={styles.controlsRow}>
          <TouchableOpacity 
            style={[styles.controlBtn, isCameraActive ? styles.controlBtnActive : styles.controlBtnInactive]}
            onPress={handleToggleCamera}
          >
            <MaterialCommunityIcons name={isCameraActive ? "video-off" : "video"} size={20} color={isCameraActive ? theme.colors.background : theme.colors.text} />
            <Text style={[styles.controlBtnText, { color: isCameraActive ? theme.colors.background : theme.colors.text }]}>
              {isCameraActive ? 'Stop Camera' : 'Start Camera'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionMainBtn} onPress={handleTranslate}>
            <MaterialCommunityIcons name="translate" size={20} color={theme.colors.primaryInverse} />
            <Text style={styles.actionMainBtnText}>Translate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlSecondaryBtn} onPress={handleClearText}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.controlSecondaryBtnText, { color: theme.colors.error }]}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.speakBtn} 
            onPress={handleSpeakOutput}
            disabled={audioLoading}
          >
            {audioLoading ? (
              <ActivityIndicator color={theme.colors.background} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="volume-high" size={20} color={theme.colors.background} />
                <Text style={styles.speakBtnText}>Speak Output</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.roundness.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: theme.roundness.full,
    marginRight: 6,
  },
  serverText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.roundness.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },

  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: theme.spacing.md,
  },
  placeholderSubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  reticleContainer: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '15%',
  },
  reticleCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(250, 250, 250, 0.4)',
  },
  reticleCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(250, 250, 250, 0.4)',
  },
  reticleCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(250, 250, 250, 0.4)',
  },
  reticleCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(250, 250, 250, 0.4)',
  },
  cameraOverlayBottom: {
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(250, 250, 250, 0.1)',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayLetterLabel: {
    color: 'rgba(250, 250, 250, 0.6)',
    fontSize: 13,
  },
  overlayLetter: {
    color: '#00ff88',
    fontSize: 22,
    fontWeight: '800',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayConfidenceLabel: {
    color: 'rgba(250, 250, 250, 0.6)',
    fontSize: 13,
  },
  overlayConfidence: {
    fontSize: 15,
    fontWeight: '700',
  },
  simulatorContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  simulatorTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  simulatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  simKey: {
    width: 32,
    height: 32,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.sm,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
  },
  simKeyText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsContainer: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 4,
  },
  suggestionsRow: {
    paddingVertical: 2,
  },
  suggestionBadge: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  suggestionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  cardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardHeaderActions: {
    flexDirection: 'row',
  },
  cardActionBtn: {
    marginLeft: theme.spacing.md,
    padding: 2,
  },
  langSelectorRow: {
    flexDirection: 'row',
  },
  langBadge: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.roundness.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  langBadgeActive: {
    backgroundColor: theme.colors.accent,
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  langTextActive: {
    color: theme.colors.background,
  },
  textOutputBox: {
    minHeight: 52,
    justifyContent: 'center',
  },
  outputText: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  outputPlaceholder: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.roundness.md,
    height: 46,
    width: '48%',
    borderWidth: 1,
  },
  controlBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  controlBtnInactive: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  controlBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  actionMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.roundness.md,
    height: 46,
    width: '48%',
  },
  actionMainBtnText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: theme.spacing.sm,
  },
  controlSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: theme.roundness.md,
    height: 46,
    width: '48%',
  },
  controlSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  speakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.md,
    height: 46,
    width: '48%',
  },
  speakBtnText: {
    color: theme.colors.primaryInverse,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: theme.spacing.sm,
  }
});
