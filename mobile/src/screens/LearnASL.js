import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Modal, Dimensions, Image } from 'react-native';
import { theme } from '../theme/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const ASL_ALPHABET = [
  { letter: 'A', desc: 'Fist with thumb resting against the side of index finger', tips: 'Keep fingers tightly curled, thumb upright and pressed against the side of the index finger.' },
  { letter: 'B', desc: 'Flat hand with fingers together and thumb folded across palm', tips: 'Keep fingers straight and vertical, fold thumb across palm towards pinky.' },
  { letter: 'C', desc: 'Cupped hand forming a curved letter C shape', tips: 'Curve all fingers and thumb to mimic a cup or half circle. Side view should clearly show the C shape.' },
  { letter: 'D', desc: 'Index finger pointing up, other fingers touching thumb', tips: 'Extend index finger straight up. Form a circle with thumb, middle, ring, and pinky fingers.' },
  { letter: 'E', desc: 'Fingers curled inward resting on top of folded thumb', tips: 'Curl fingers and thumb tightly against palm. Fingertips rest on thumb edge.' },
  { letter: 'F', desc: 'Index and thumb touching in circle, other fingers extended', tips: 'Touch tips of index finger and thumb. Keep middle, ring, and pinky fingers spread straight up.' },
  { letter: 'G', desc: 'Thumb and index finger pointing sideways, like pinching', tips: 'Point index finger straight out. Place thumb parallel to index finger, forming a horizontal pinch.' },
  { letter: 'H', desc: 'Index and middle fingers pointing horizontally together', tips: 'Extend index and middle fingers straight out side-by-side. Tuck thumb and other fingers.' },
  { letter: 'I', desc: 'Pinky pointing straight up, other fingers folded over thumb', tips: 'Extend pinky finger vertically. Curl all other fingers and cross thumb over them.' },
  { letter: 'J', desc: 'Draw a hook shape in the air with the pinky finger', tips: 'Extend pinky and trace a hook shape downward and up, like the letter J.' },
  { letter: 'K', desc: 'Index and middle pointing up (V shape) with thumb touching middle', tips: 'Point index straight up. Extend middle finger at a slight forward angle. Rest thumb against middle finger.' },
  { letter: 'L', desc: 'Index pointing up and thumb pointing sideways (L shape)', tips: 'Extend index finger vertically and thumb horizontally, forming a 90-degree angle.' },
  { letter: 'M', desc: 'Thumb tucked under index, middle, and ring fingers', tips: 'Fold thumb across palm, fold index, middle, and ring fingers down over thumb. Pinky remains curled.' },
  { letter: 'N', desc: 'Thumb tucked under index and middle fingers', tips: 'Fold thumb across palm, curl index and middle fingers down over thumb. Ring and pinky remain curled.' },
  { letter: 'O', desc: 'All fingers curved touching thumb to form an O shape', tips: 'Curve all fingers so their tips touch the thumb, forming a circle.' },
  { letter: 'P', desc: 'Sign for K pointing downward vertically', tips: 'Form the K shape but point index finger horizontally forward and middle finger straight down.' },
  { letter: 'Q', desc: 'Sign for G pointing downward vertically', tips: 'Form the G pinch but point both index finger and thumb straight down.' },
  { letter: 'R', desc: 'Index and middle fingers crossed, other fingers folded', tips: 'Cross middle finger behind index finger. Fold other fingers down, thumb resting on top.' },
  { letter: 'S', desc: 'Clenched fist with thumb folded across front of fingers', tips: 'Clench all fingers tightly into a fist and wrap thumb across the middle of index/middle fingers.' },
  { letter: 'T', desc: 'Thumb tucked between index and middle fingers of fist', tips: 'Make a fist and insert thumb between the index and middle fingers.' },
  { letter: 'U', desc: 'Index and middle fingers pointing straight up together', tips: 'Extend index and middle fingers vertically, touching side-by-side.' },
  { letter: 'V', desc: 'Index and middle fingers pointing up spread apart (V shape)', tips: 'Extend index and middle fingers vertically and spread them apart, forming a V.' },
  { letter: 'W', desc: 'Index, middle, and ring fingers extended spread apart', tips: 'Extend index, middle, and ring fingers vertically, spread apart in a W. Pinky and thumb touch.' },
  { letter: 'X', desc: 'Index finger hooked like a hook, other fingers folded', tips: 'Curl index finger into a hook shape. Fold all other fingers into a fist.' },
  { letter: 'Y', desc: 'Thumb and pinky extended, other fingers folded', tips: 'Extend thumb and pinky outwards while holding middle three fingers folded against palm.' },
];

const ALPHABET_IMAGES = {
  A: require('../../assets/alphabet/A.png'),
  B: require('../../assets/alphabet/B.png'),
  C: require('../../assets/alphabet/C.png'),
  D: require('../../assets/alphabet/D.png'),
  E: require('../../assets/alphabet/E.png'),
  F: require('../../assets/alphabet/F.png'),
  G: require('../../assets/alphabet/G.png'),
  H: require('../../assets/alphabet/H.png'),
  I: require('../../assets/alphabet/I.png'),
  J: require('../../assets/alphabet/J.png'),
  K: require('../../assets/alphabet/K.png'),
  L: require('../../assets/alphabet/L.png'),
  M: require('../../assets/alphabet/M.png'),
  N: require('../../assets/alphabet/N.png'),
  O: require('../../assets/alphabet/O.png'),
  P: require('../../assets/alphabet/P.png'),
  Q: require('../../assets/alphabet/Q.png'),
  R: require('../../assets/alphabet/R.png'),
  S: require('../../assets/alphabet/S.png'),
  T: require('../../assets/alphabet/T.png'),
  U: require('../../assets/alphabet/U.png'),
  V: require('../../assets/alphabet/V.png'),
  W: require('../../assets/alphabet/W.png'),
  X: require('../../assets/alphabet/X.png'),
  Y: require('../../assets/alphabet/Y.png'),
  Z: require('../../assets/alphabet/Z.png'),
};

export default function LearnASLScreen({ navigation }) {
  const [selectedCard, setSelectedCard] = useState(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn ASL</Text>
        <View style={{ width: 28 }} /> {/* empty view for spacing alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introBox}>
          <Text style={styles.introTitle}>American Sign Language Alphabet</Text>
          <Text style={styles.introSubtitle}>
            Tap on any letter card below to view detailed tips and instructions on how to form the hand sign correctly.
          </Text>
        </View>

        <View style={styles.grid}>
          {ASL_ALPHABET.map((item) => (
            <TouchableOpacity 
              key={item.letter}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setSelectedCard(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardLetter}>{item.letter}</Text>
                <MaterialCommunityIcons name="gesture-tap-button" size={20} color={theme.colors.textMuted} />
              </View>
              
              {/* Hand representation image */}
              <View style={styles.handImageContainer}>
                <Image 
                  source={ALPHABET_IMAGES[item.letter]} 
                  style={styles.handImage} 
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={selectedCard !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedCard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => setSelectedCard(null)}
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>

            {selectedCard && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalLetter}>{selectedCard.letter}</Text>
                
                <View style={styles.modalHandContainer}>
                  <Image 
                    source={ALPHABET_IMAGES[selectedCard.letter]} 
                    style={styles.modalHandImage} 
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.modalTitle}>Gesture Details</Text>
                <Text style={styles.modalDesc}>{selectedCard.desc}</Text>

                <View style={styles.tipsBox}>
                  <View style={styles.tipsHeader}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#f1c40f" />
                    <Text style={styles.tipsTitle}>Quick Tips</Text>
                  </View>
                  <Text style={styles.tipsText}>{selectedCard.tips}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  introBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  introSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
    fontFamily: theme.fonts.regular,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  handImageContainer: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.sm,
    backgroundColor: '#ffffff',
    borderRadius: theme.roundness.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 6,
  },
  handImage: {
    width: '100%',
    height: '100%',
  },
  cardDesc: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalDetails: {
    alignItems: 'center',
  },
  modalLetter: {
    fontSize: 54,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: -10,
    fontFamily: theme.fonts.bold,
  },
  modalHandContainer: {
    width: 160,
    height: 160,
    borderRadius: theme.roundness.md,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
    padding: 10,
  },
  modalHandImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.bold,
  },
  modalDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
    fontFamily: theme.fonts.regular,
  },
  tipsBox: {
    width: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipsTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    fontFamily: theme.fonts.bold,
  },
  tipsText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.fonts.regular,
  }
});
