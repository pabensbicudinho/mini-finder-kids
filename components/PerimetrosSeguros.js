// components/PerimetrosSeguros.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listarPerimetros, listarRotas, deletarRota } from '../database/db';
import { formatarTamanho } from '../services/cameraService';

const TELA_VOLTAR_FALLBACK = 'perfilCrianca';

export default function PerimetrosSeguros({ userData, onNavigate, previousScreen }) {
  const insets = useSafeAreaInsets();

  const [perimetros, setPerimetros] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // ============================================================
  // VOLTAR PARA A TELA ANTERIOR
  // ============================================================
  const handleVoltar = () => {
    const telaVolta = previousScreen || TELA_VOLTAR_FALLBACK;
    console.log('🔙 Voltando para:', telaVolta);
    onNavigate(telaVolta, userData);
  };

  // ============================================================
  // CARREGAR PERÍMETROS
  // ============================================================
  const carregarPerimetros = useCallback(async () => {
    try {
      setCarregando(true);

      if (!userData?.id) {
        setPerimetros([]);
        return;
      }

      const lista = await listarPerimetros(userData.id);
      console.log('📍 Perímetros carregados:', lista.length);
      setPerimetros(lista || []);
    } catch (error) {
      console.error('Erro ao carregar perímetros:', error);
    } finally {
      setCarregando(false);
    }
  }, [userData]);

  useEffect(() => {
    carregarPerimetros();
  }, [carregarPerimetros]);

  // ============================================================
  // CRIAR NOVO
  // ============================================================
  const handleCriarNovo = () => {
    onNavigate('novaRota', userData, 'perimetrosSeguros');
  };

  // ============================================================
  // ABRIR DETALHES
  // ============================================================
  const handleAbrirDetalhes = (item) => {
    console.log('📂 Abrindo detalhes do perímetro:', item.nome);
    onNavigate('rotaDetalhes', userData, 'perimetrosSeguros');
  };

  // ============================================================
  // DELETAR
  // ============================================================
  const handleDeletar = (item) => {
    Alert.alert(
      'Excluir área segura',
      `Excluir "${item.nome || 'Sem nome'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.id) await deletarRota(item.id);
              setPerimetros((prev) => prev.filter((p) => p.id !== item.id));
              console.log('🗑️ Perímetro excluído:', item.nome);
            } catch (error) {
              console.error('Erro ao deletar:', error);
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // RENDER CARD
  // ============================================================
  const renderCard = (item) => {
    const nome = item.nome || 'Sem nome';
    const raio = item.raio || 500;
    const endereco = [item.logradouro, item.bairro, item.cidade]
      .filter(Boolean)
      .join(', ');

    return (
      <View key={item.id} style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => handleAbrirDetalhes(item)}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={24} color="#1E3A8A" />
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {nome}
            </Text>

            <Text style={styles.cardSubtitle} numberOfLines={1}>
              Raio: {raio} metros
            </Text>

            {endereco ? (
              <Text style={styles.cardEndereco} numberOfLines={2}>
                {endereco}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Ativo</Text>
          </View>

          <TouchableOpacity
            onPress={() => handleDeletar(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============================================================
  // ESTADO: CARREGANDO
  // ============================================================
  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleVoltar} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#1A237E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perímetros seguros</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleVoltar}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Perímetros seguros</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Botão criar novo */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCriarNovo}
          activeOpacity={0.8}
        >
          <View style={styles.addIconCircle}>
            <Ionicons name="add" size={24} color="#FFF" />
          </View>
          <View style={styles.addTextContainer}>
            <Text style={styles.addTitle}>Criar nova área segura</Text>
            <Text style={styles.addSubtitle}>
              Defina um perímetro para monitoramento
            </Text>
          </View>
        </TouchableOpacity>

        {/* Lista de perímetros */}
        {perimetros.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Nenhum perímetro</Text>
            <Text style={styles.emptySubtitle}>
              Toque em "Criar nova área segura" para começar.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {perimetros.length}{' '}
              {perimetros.length === 1 ? 'perímetro' : 'perímetros'} cadastrados
            </Text>
            {perimetros.map((item) => renderCard(item))}
          </>
        )}
      </ScrollView>

      {/* Menu inferior */}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  headerSpacer: { width: 40 },
  backButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },

  scrollContent: { padding: 20, paddingBottom: 120 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Botão de adicionar
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  addIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  addTextContainer: { flex: 1 },
  addTitle: {
    fontSize: 15, fontWeight: '700', color: '#FFF',
  },
  addSubtitle: {
    fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2,
  },

  // Seção
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: '#1E3A8A',
  },
  cardSubtitle: {
    fontSize: 13, color: '#6B7280', marginTop: 2,
  },
  cardEndereco: {
    fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 14,
  },

  cardDivider: {
    height: 1, backgroundColor: '#F3F4F6',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#10B981', marginRight: 6,
  },
  statusText: {
    fontSize: 12, color: '#10B981', fontWeight: '600',
  },

  // Estado vazio
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13, color: '#6B7280', textAlign: 'center',
    marginTop: 6, paddingHorizontal: 20,
  },

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
});