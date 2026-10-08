import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listarCriancas } from '../database/db';

export default function Inicio({ userData, onNavigate }) {
  const [criancas, setCriancas] = useState([]);
  const insets = useSafeAreaInsets();

  // Carrega as crianças quando a tela é montada
  useEffect(() => {
    const carregar = async () => {
      try {
        const lista = await listarCriancas();
        setCriancas(lista);
      } catch (error) {
        console.error('Erro ao carregar crianças:', error);
      }
    };
    carregar();
  }, [userData]); // Re-executa quando userData muda (após voltar de NovaCrianca)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minhas crianças</Text>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => onNavigate('perfil')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={34} color="#1a237e" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {criancas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma criança cadastrada ainda.</Text>
        ) : (
          criancas.map((crianca) => (
            <TouchableOpacity
              key={crianca.id}
              style={styles.childCard}
              onPress={() => onNavigate('mapa', crianca)}
              activeOpacity={0.7}
            >
              <View style={[styles.childAvatar, { backgroundColor: crianca.color || '#E0E7FF' }]}>
                <Ionicons name="person" size={26} color="#1E3A8A" />
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{crianca.nome}</Text>
                <Text style={styles.childAge}>{crianca.idade}</Text>
                <Text style={styles.childStatus}>● {crianca.status}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onNavigate('novaCriancas')}
          activeOpacity={0.7}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={26} color="#FFF" />
          </View>
          <View style={styles.addTextContainer}>
            <Text style={styles.addButtonText}>Adicione uma nova criança</Text>
            <Text style={styles.addButtonSubtext}>Vincule um novo dispositivo</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('inicio')}>
          <Ionicons name="home" size={22} color="#1E3A8A" />
          <Text style={styles.navTextActive}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('perfil')}>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FAFAFA',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a237e' },
  profileButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 40, marginBottom: 20 },
  childCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1,
    borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  childAvatar: {
    width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center',
    alignItems: 'center', marginRight: 15,
  },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  childAge: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  childStatus: { fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: '500' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
    paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E5E7EB', backgroundColor: '#FFF', marginTop: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  addIconCircle: {
    width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1E3A8A',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  addTextContainer: { flex: 1 },
  addButtonText: { color: '#1E3A8A', fontSize: 14, fontWeight: '700' },
  addButtonSubtext: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
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