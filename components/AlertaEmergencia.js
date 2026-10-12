// components/AlertaEmergencia.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { coordenadasParaEndereco } from '../services/cepService';

export default function AlertaEmergencia({ userData, onNavigate }) {
  const insets = useSafeAreaInsets();
  const nomeCrianca = userData?.nome || 'Criança';

  const [location, setLocation] = useState(null);
  const [endereco, setEndereco] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [horaAtual, setHoraAtual] = useState('');

  // ============================================================
  // OBTER LOCALIZAÇÃO + ENDEREÇO
  // ============================================================
  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        // Hora atual (HH:MM)
        const agora = new Date();
        const hh = String(agora.getHours()).padStart(2, '0');
        const mm = String(agora.getMinutes()).padStart(2, '0');
        setHoraAtual(`${hh}:${mm}`);

        // Pede permissão
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (ativo) {
            setEndereco({
              enderecoCompleto: 'Localização indisponível (permissão negada)',
            });
            setCarregando(false);
          }
          return;
        }

        // Pega posição
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!ativo) return;

        setLocation(pos.coords);

        // Busca endereço
        const resultado = await coordenadasParaEndereco(
          pos.coords.latitude,
          pos.coords.longitude
        );

        if (!ativo) return;

        if (resultado.success) {
          setEndereco(resultado.endereco);
        } else {
          setEndereco({
            enderecoCompleto: `Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar localização do alerta:', error);
        if (ativo) {
          setEndereco({
            enderecoCompleto: 'Não foi possível obter a localização.',
          });
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, []);

  // ============================================================
  // MONTAR TEXTO DO ENDEREÇO PARA O CARD
  // ============================================================
  const getTextoEndereco = () => {
    if (!endereco) return 'Buscando localização...';

    // Se tem logradouro estruturado
    if (endereco.logradouro) {
      const partes = [];

      // Rua + número
      const rua = endereco.numero
        ? `${endereco.logradouro}, ${endereco.numero}`
        : endereco.logradouro;
      partes.push(rua);

      // Bairro
      if (endereco.bairro) partes.push(endereco.bairro);

      // Cidade - estado
      if (endereco.cidade && endereco.estado) {
        partes.push(`${endereco.cidade} - ${endereco.estado}`);
      } else if (endereco.cidade) {
        partes.push(endereco.cidade);
      }

      return partes.join(' - ');
    }

    // Fallback
    return endereco.enderecoCompleto || 'Localização indisponível';
  };

  // ============================================================
  // AÇÃO: LIGAR PARA EMERGÊNCIA (190)
  // ============================================================
  const handleEmergencia = () => {
    Alert.alert(
      'Chamar emergência',
      'Deseja ligar para o número 190 (Polícia)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ligar',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:190').catch(() => {
              Alert.alert('Erro', 'Não foi possível abrir o discador.');
            });
          },
        },
      ]
    );
  };

  // ============================================================
  // AÇÃO: VER NO MAPA
  // ============================================================
  const handleVerNoMapa = () => {
    onNavigate('mapaCriancaAlerta', userData);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('mapa', userData)}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Alerta de emergência</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ÍCONE DE SIRENE */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={50} color="#EF4444" />
          </View>
        </View>

        {/* TÍTULO */}
        <Text style={styles.title}>
          {nomeCrianca} acionou o botão de emergência!
        </Text>

        {/* DESCRIÇÃO */}
        <Text style={styles.description}>
          A criança pode estar em uma situação de risco.
          Verifique a localização e entre em contato imediatamente.
        </Text>

        {/* CARD DE LOCALIZAÇÃO */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconCircle}>
            <Ionicons name="location" size={22} color="#1E3A8A" />
          </View>

          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Localização atual</Text>

            {carregando ? (
              <View style={styles.locationLoadingRow}>
                <ActivityIndicator size="small" color="#1E3A8A" />
                <Text style={styles.locationLoadingText}>Buscando endereço...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.locationValue} numberOfLines={3}>
                  {getTextoEndereco()}
                </Text>
                <Text style={styles.locationTime}>{horaAtual}</Text>
              </>
            )}
          </View>
        </View>

        {/* BOTÃO EMERGÊNCIA */}
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencia}
          activeOpacity={0.85}
        >
          <Ionicons name="call" size={22} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={styles.emergencyButtonText}>Emergência</Text>
        </TouchableOpacity>

        {/* BOTÃO VER NO MAPA */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={handleVerNoMapa}
          activeOpacity={0.85}
        >
          <Text style={styles.mapButtonText}>Ver no mapa</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MENU INFERIOR */}
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

  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    alignItems: 'center',
  },

  // Ícone de sirene
  iconContainer: { marginTop: 20, marginBottom: 20 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center',
  },

  // Título
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 28,
  },

  // Descrição
  description: {
    fontSize: 14,
    color: '#1E3A8A',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 25,
    paddingHorizontal: 10,
  },

  // Card de localização
  locationCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  locationIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: { flex: 1 },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 20,
  },
  locationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  locationLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
  },

  // Botão emergência
  emergencyButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emergencyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Botão ver no mapa
  mapButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '700',
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