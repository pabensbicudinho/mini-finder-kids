import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Perfil({ userData, onNavigate, previousScreen }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate(previousScreen || 'inicio')}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Perfil</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar do usuário */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={80} color="#1E3A8A" />
          </View>
        </View>

        {/* Informações do usuário logado */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{userData?.nome || 'Não informado'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Data de nascimento</Text>
            <Text style={styles.infoValue}>{userData?.dataNasc || 'Não informado'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Telefone</Text>
            <Text style={styles.infoValue}>{userData?.telefone || 'Não informado'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{userData?.email || 'Não informado'}</Text>
          </View>
        </View>

        {/* Botão de Sair */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => onNavigate('login')}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>Sair da conta</Text>
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
          onPress={() => onNavigate('perfil', userData)}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={22} color="#1E3A8A" />
          <Text style={styles.navTextActive}>Perfil</Text>
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
  scrollContent: { paddingBottom: 120 },
  avatarContainer: { alignItems: 'center', marginTop: 30, marginBottom: 20 },
  avatarCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#1E3A8A',
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  infoContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 5,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  infoBlock: { paddingVertical: 15 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#1E3A8A', marginBottom: 6 },
  infoValue: { fontSize: 15, color: '#333', fontWeight: '400' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 40,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFF',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
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