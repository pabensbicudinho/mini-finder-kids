// components/CameraCapture.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { salvarFoto, salvarVideo } from '../services/cameraService';

const DURACAO_MAXIMA_VIDEO = 15; // segundos

export default function CameraCapture({ userData, onNavigate }) {
  const [permissao, requestPermissao] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [modo, setModo] = useState('foto'); // 'foto' | 'video'
  const [capturando, setCapturando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);

  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  // ============================================================
  // PERMISSÃO
  // ============================================================
  useEffect(() => {
    if (!permissao) return;
    if (!permissao.granted) requestPermissao();
  }, [permissao]);

  // ============================================================
  // TIMER DE GRAVAÇÃO
  // ============================================================
  useEffect(() => {
    if (gravando) {
      setTempoGravacao(0);
      timerRef.current = setInterval(() => {
        setTempoGravacao((t) => {
          if (t + 1 >= DURACAO_MAXIMA_VIDEO) {
            if (cameraRef.current) cameraRef.current.stopRecording();
            return DURACAO_MAXIMA_VIDEO;
          }
          return t + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gravando]);

  // ============================================================
  // TIRAR FOTO
  // ============================================================
  const handleCapturarFoto = async () => {
    if (!cameraRef.current || capturando) return;

    try {
      setCapturando(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: Platform.OS === 'web',
        skipProcessing: false,
      });

      const imagemUri = Platform.OS === 'web' ? photo.base64 : photo.uri;
      if (!imagemUri) throw new Error('Foto não capturada');

      const resultado = await salvarFoto(imagemUri, {
        criancaId: userData?.id,
        motivo: 'Captura manual',
      });

      if (resultado.success) {
        Alert.alert('✅ Foto salva!', 'Adicionada ao histórico.', [
          { text: 'Ver histórico', onPress: () => onNavigate('historicoCamera', userData) },
          { text: 'Tirar outra', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível salvar.');
      }
    } catch (error) {
      console.error('Erro ao capturar:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    } finally {
      setCapturando(false);
    }
  };

  // ============================================================
  // GRAVAR VÍDEO
  // ============================================================
  const iniciarGravacao = async () => {
    if (!cameraRef.current || gravando) return;

    try {
      setGravando(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: DURACAO_MAXIMA_VIDEO,
      });

      // Quando termina (por tempo ou parar manualmente)
      if (video?.uri) {
        const resultado = await salvarVideo(video.uri, {
          criancaId: userData?.id,
          motivo: 'Gravação manual',
          duracaoSegundos: tempoGravacao,
        });

        if (resultado.success) {
          Alert.alert('✅ Vídeo salvo!', 'Adicionado ao histórico.', [
            { text: 'Ver histórico', onPress: () => onNavigate('historicoCamera', userData) },
            { text: 'Gravar outro', style: 'cancel' },
          ]);
        } else {
          Alert.alert('Erro', 'Não foi possível salvar o vídeo.');
        }
      }
    } catch (error) {
      console.error('Erro na gravação:', error);
      Alert.alert('Erro', 'Não foi possível gravar o vídeo.');
    } finally {
      setGravando(false);
      setTempoGravacao(0);
    }
  };

  const pararGravacao = () => {
    if (cameraRef.current && gravando) {
      cameraRef.current.stopRecording();
    }
  };

  // ============================================================
  // BOTÃO PRINCIPAL
  // ============================================================
  const handleBotaoPrincipal = () => {
    if (modo === 'foto') {
      handleCapturarFoto();
    } else {
      if (gravando) pararGravacao();
      else iniciarGravacao();
    }
  };

  // ============================================================
  // VIRAR CÂMERA
  // ============================================================
  const handleVirar = () => {
    if (gravando) return;
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // ============================================================
  // SEM PERMISSÃO
  // ============================================================
  if (!permissao) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onNavigate={onNavigate} userData={userData} />
        <View style={styles.centered}>
          <Text style={styles.infoText}>Carregando permissão...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permissao.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onNavigate={onNavigate} userData={userData} />
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={60} color="#9CA3AF" />
          <Text style={styles.infoText}>
            Precisamos da sua permissão para usar a câmera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermissao}>
            <Text style={styles.permissionButtonText}>Conceder permissão</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // PREVIEW
  // ============================================================
  const formatarTempo = (s) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header onNavigate={onNavigate} userData={userData} />

      {/* SELETOR DE MODO */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, modo === 'foto' && styles.modeButtonActive]}
          onPress={() => !gravando && setModo('foto')}
          disabled={gravando}
        >
          <Ionicons name="camera" size={18} color={modo === 'foto' ? '#FFF' : '#9CA3AF'} />
          <Text style={[styles.modeText, modo === 'foto' && styles.modeTextActive]}>
            Foto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, modo === 'video' && styles.modeButtonActive]}
          onPress={() => !gravando && setModo('video')}
          disabled={gravando}
        >
          <Ionicons name="videocam" size={18} color={modo === 'video' ? '#FFF' : '#9CA3AF'} />
          <Text style={[styles.modeText, modo === 'video' && styles.modeTextActive]}>
            Vídeo
          </Text>
        </TouchableOpacity>
      </View>

      {/* PREVIEW */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode={modo === 'video' ? 'video' : 'picture'}
        />

        {/* TIMER DURANTE GRAVAÇÃO */}
        {gravando && (
          <View style={styles.recordingBadge}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {formatarTempo(tempoGravacao)} / {formatarTempo(DURACAO_MAXIMA_VIDEO)}
            </Text>
          </View>
        )}
      </View>

      {/* CONTROLES */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sideButton}
          onPress={handleVirar}
          disabled={gravando}
        >
          <Ionicons
            name="camera-reverse-outline"
            size={28}
            color={gravando ? '#555' : '#FFF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.captureButton,
            (capturando || gravando) && styles.captureButtonDisabled,
          ]}
          onPress={handleBotaoPrincipal}
          disabled={capturando}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.captureInner,
              modo === 'video' && styles.captureInnerVideo,
              gravando && styles.captureInnerRecording,
            ]}
          />
        </TouchableOpacity>

        <View style={styles.sideButton} />
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// HEADER
// ============================================================
function Header({ onNavigate, userData }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => onNavigate('historicoCamera', userData)}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={28} color="#1A237E" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Câmera</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30,
    backgroundColor: '#FAFAFA',
  },
  infoText: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 15,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#1E3A8A', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFF', fontWeight: '700', fontSize: 15,
  },

  // Seletor de modo
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#000',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    gap: 6,
  },
  modeButtonActive: { backgroundColor: '#1E3A8A' },
  modeText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: '#FFF' },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: { flex: 1 },

  // Badge de gravação
  recordingBadge: {
    position: 'absolute',
    top: 15,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#DC2626', marginRight: 8,
  },
  recordingText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 25,
    backgroundColor: '#000',
  },
  sideButton: {
    width: 50, height: 50, justifyContent: 'center', alignItems: 'center',
  },
  captureButton: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, borderColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  captureButtonDisabled: { opacity: 0.5 },
  captureInner: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF',
  },
  captureInnerVideo: {
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  captureInnerRecording: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: '#DC2626',
  },
});