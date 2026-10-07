import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Alerta({ userData, onNavigate }) {
  const insets = useSafeAreaInsets();
  const nomeCrianca = userData?.nome || 'Criança';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com seta que volta para o Mapa */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('mapa', userData)}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Alerta</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de Alerta */}
        <View style={styles.alertIconContainer}>
          <View style={styles.alertIconCircle}>
            <Ionicons name="warning" size={50} color="#F97316" />
          </View>
        </View>

        {/* Título e Descrição */}
        <Text style={styles.alertTitle}>
          {nomeCrianca} saiu da área segura
        </Text>
        <Text style={styles.alertDescription}>
          A criança saiu da área definida{'\n'}
          (Escola da {nomeCrianca})
        </Text>

        {/* Imagem de fuga de rota */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/rota-fuga.png')}
            style={styles.routeImage}
            resizeMode="contain"
          />
        </View>

        {/* Ícone de localização (sem texto) */}
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={26} color="#1E3A8A" />
        </View>

        {/* Botão "Ver no mapa" */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => onNavigate('mapaCriancaAlerta', userData)}
          activeOpacity={0.8}
        >
          <Text style={styles.mapButtonText}>Ver no mapa</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Menu Inferior */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('alerta')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications" size={22} color="#1E3A8A" />
          <Text style={styles.navTextActive}>Alertas</Text>
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
  scrollContent: { padding: 20, paddingBottom: 120, alignItems: 'center' },

  // Ícone de alerta
  alertIconContainer: { marginTop: 20, marginBottom: 20 },
  alertIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center', alignItems: 'center',
  },

  // Texto do alerta
  alertTitle: {
    fontSize: 20, fontWeight: '700', color: '#DC2626',
    textAlign: 'center', marginBottom: 10,
  },
  alertDescription: {
    fontSize: 15, color: '#1E3A8A',
    textAlign: 'center', lineHeight: 22,
    fontWeight: '600', marginBottom: 25,
  },

  // Imagem da rota
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeImage: { width: '100%', height: '100%' },

  // Ícone de localização
  locationContainer: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 25,
  },

  // Botão "Ver no mapa"
  mapButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mapButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Menu inferior
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  navTextActive: { fontSize: 10, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },
});