// components/HistoricoCamera.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, Modal, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  listarMidias,
  deletarMidia,
  formatarTamanho,
  limparMidiasHipoteticas,
  formatarDuracao,
} from '../services/cameraService';

// 🔑 Import condicional do expo-video
let VideoView = null;
let useVideoPlayer = null;

try {
  const video = require('expo-video');
  VideoView = video.VideoView;
  useVideoPlayer = video.useVideoPlayer;
} catch (e) {
  // expo-video não instalado
}

const TELA_VOLTAR = 'mapa';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function HistoricoCamera({ userData, onNavigate, previousScreen }) {
  const insets = useSafeAreaInsets();

  const [midias, setMidias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [midiaAberta, setMidiaAberta] = useState(null);

  // ============================================================
  // CARREGAR HISTÓRICO
  // ============================================================
  const carregarHistorico = useCallback(async () => {
    try {
      setCarregando(true);
      await limparMidiasHipoteticas();

      const lista = await listarMidias();
      const filtradas = userData?.id
        ? lista.filter((m) => !m.criancaId || m.criancaId === userData.id)
        : lista;

      setMidias(filtradas);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setCarregando(false);
    }
  }, [userData]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  // ============================================================
  // VOLTAR SEMPRE PARA O MAPA
  // ============================================================
  const handleVoltar = () => {
    onNavigate(TELA_VOLTAR, userData);
  };

  // ============================================================
  // ABRIR MÍDIA
  // ============================================================
  const handleAbrirMidia = (item) => {
    setMidiaAberta(item);
  };

  // ============================================================
  // DELETAR
  // ============================================================
  const handleDeletar = (item) => {
    const tipoLabel = item.tipo === 'video' ? 'vídeo' : 'foto';
    Alert.alert(
      `Excluir ${tipoLabel}`,
      `Excluir o ${tipoLabel} de ${item.data} às ${item.hora}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const resultado = await deletarMidia(item.id, item.uri);
            if (resultado.success) {
              setMidias((prev) => prev.filter((m) => m.id !== item.id));
              if (midiaAberta?.id === item.id) setMidiaAberta(null);
            } else {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // ABRIR CÂMERA
  // ============================================================
  const handleAbrirCamera = () => {
    onNavigate('cameraCapture', userData);
  };

  // ============================================================
  // CARD
  // ============================================================
  const renderCard = (item) => {
    const isVideo = item.tipo === 'video';

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>Dia {item.data}</Text>
          <TouchableOpacity
            onPress={() => handleDeletar(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.thumbWrapper}
          onPress={() => handleAbrirMidia(item)}
          activeOpacity={0.8}
        >
          {isVideo ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="play-circle" size={60} color="#FFF" />
              <Text style={styles.videoLabel}>Vídeo</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.uri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}

          <View style={styles.thumbOverlay}>
            <Ionicons name={isVideo ? 'videocam' : 'expand'} size={18} color="#FFF" />
            <Text style={styles.thumbOverlayText}>
              {isVideo ? 'Toque para reproduzir' : 'Toque para ampliar'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardStatusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.conectado ? '#10B981' : '#DC2626' },
            ]}
          />
          <Text style={styles.cardStatus}>
            {item.hora} • {formatarTamanho(item.tamanho)}
            {isVideo && item.duracaoSegundos
              ? ` • ${formatarDuracao(item.duracaoSegundos)}`
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // HEADER
  // ============================================================
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleVoltar} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color="#1A237E" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Câmera histórico</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ============================================================
  // MODAL DE VISUALIZAÇÃO
  // ============================================================
  const renderModal = () => {
    if (!midiaAberta) return null;

    const isVideo = midiaAberta.tipo === 'video';

    return (
      <Modal
        visible={!!midiaAberta}
        transparent
        animationType="fade"
        onRequestClose={() => setMidiaAberta(null)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => setMidiaAberta(null)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {midiaAberta.data} às {midiaAberta.hora}
            </Text>

            <TouchableOpacity
              onPress={() => handleDeletar(midiaAberta)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="trash-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {isVideo ? (
            <VideoPlayer uri={midiaAberta.uri} />
          ) : (
            <Image
              source={{ uri: midiaAberta.uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 15 }]}>
            <Text style={styles.modalFooterText}>
              {formatarTamanho(midiaAberta.tamanho)}
              {isVideo && midiaAberta.duracaoSegundos
                ? ` • ${formatarDuracao(midiaAberta.duracaoSegundos)}`
                : ''}
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleAbrirCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={20} color="#FFF" />
          <Text style={styles.captureButtonText}>Tirar foto ou gravar vídeo</Text>
        </TouchableOpacity>

        {midias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="camera-off-outline" size={50} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Nenhuma mídia</Text>
            <Text style={styles.emptySubtitle}>
              Toque em "Tirar foto ou gravar vídeo" para começar.
            </Text>
          </View>
        ) : (
          midias.map((item) => renderCard(item))
        )}
      </ScrollView>

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
          <Ionicons name="home" size={22} color="#1E3A8A" />
          <Text style={styles.navTextActive}>Início</Text>
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

      {renderModal()}
    </SafeAreaView>
  );
}

// ============================================================
// PLAYER DE VÍDEO
// ============================================================
function VideoPlayer({ uri }) {
  if (!VideoView || !useVideoPlayer) {
    return (
      <View style={styles.videoFallback}>
        <Ionicons name="videocam-off-outline" size={60} color="#9CA3AF" />
        <Text style={styles.videoFallbackText}>
          Player de vídeo não instalado.{'\n'}
          Rode: npx expo install expo-video
        </Text>
      </View>
    );
  }

  try {
    const player = useVideoPlayer(uri, (p) => {
      p.loop = false;
      p.play();
    });

    return (
      <View style={styles.videoWrapper}>
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      </View>
    );
  } catch (e) {
    return (
      <View style={styles.videoFallback}>
        <Text style={styles.videoFallbackText}>Erro ao carregar vídeo.</Text>
      </View>
    );
  }
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

  // BOTÃO CAPTURAR
  captureButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E3A8A', paddingVertical: 14, borderRadius: 12,
    marginBottom: 20,
  },
  captureButtonText: {
    color: '#FFF', fontWeight: '700', marginLeft: 8, fontSize: 14,
  },

  // CARD
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 15, fontWeight: '700', color: '#1E3A8A',
  },

  // MINIATURA
  thumbWrapper: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 10,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 6,
  },
  thumbOverlayText: {
    color: '#FFF', fontSize: 11, fontWeight: '600', marginLeft: 6,
  },

  cardStatusRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, marginRight: 6,
  },
  cardStatus: {
    fontSize: 12, color: '#6B7280', fontWeight: '500',
  },

  // ESTADO VAZIO
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6,
  },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalCloseButton: {
    width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
  },

  // PLAYER DE VÍDEO
  videoWrapper: {
    width: SCREEN_W,
    height: SCREEN_H * 0.6,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    width: SCREEN_W,
    height: SCREEN_H * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  videoFallbackText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },

  modalFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalFooterText: {
    color: '#9CA3AF',
    fontSize: 12,
  },

  // MENU INFERIOR
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  navTextActive: { fontSize: 11, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },
});