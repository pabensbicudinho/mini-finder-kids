import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilCrianca({ userData, onNavigate }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('mapa', userData)}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Perfil da criança</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Nome + Idade */}
        <View style={styles.card}>
          <View style={styles.childHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={50} color="#1E3A8A" />
            </View>
            <View style={styles.childHeaderInfo}>
              <Text style={styles.childName}>{userData?.nome || 'Nome da criança'}</Text>
              <Text style={styles.childAge}>{userData?.idade || 'Idade'}</Text>
            </View>
          </View>
        </View>

        {/* Dispositivo */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="watch-outline" size={22} color="#1E3A8A" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Dispositivo</Text>
              <Text style={styles.infoSubtitle}>MiniFinderKids</Text>
            </View>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Conectado</Text>
            </View>
          </View>
        </View>

        {/* Bateria */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="battery-half-outline" size={22} color="#1E3A8A" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Bateria</Text>
            </View>
            <Ionicons name="battery-full" size={26} color="#10B981" />
          </View>
        </View>

        {/* Área segura */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="location-outline" size={22} color="#1E3A8A" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Área segura</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Rotina habitual */}
        <TouchableOpacity style={styles.card} activeOpacity={0.7}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="home-outline" size={22} color="#1E3A8A" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Rotina habitual</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Menu Inferior */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('alerta')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Alertas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('inicio')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('perfil')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  headerSpacer: { width: 40 },
  backButton: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'flex-start',
  },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // Card genérico
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  // Cabeçalho da criança (avatar + nome)
  childHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  childHeaderInfo: { flex: 1 },
  childName: { fontSize: 22, fontWeight: '700', color: '#1E3A8A' },
  childAge: { fontSize: 15, color: '#6B7280', marginTop: 4 },

  // Linhas de informação
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  infoSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Status "Conectado"
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: { fontSize: 12, color: '#10B981', fontWeight: '600' },

  // Menu Inferior
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
});