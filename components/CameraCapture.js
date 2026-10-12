// components/CameraCapture.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { salvarFoto } from '../services/cameraService';

export default function CameraCapture({ userData, onNavigate }) {
  const [permissao, requestPermissao] = useCameraPermissions();
  const [facing, setFacing] = useState('back'); // 'back' ou 'front'
  const [capturando, setCapturando] = useState(false);

  const cameraRef = useRef(null);

  // ============================================================
  // PERMISSÃO
  // ============================================================
  useEffect(() => {
    if (!permissao) return;

    if (!permissao.granted) {
      requestPermissao();
    }
  }, [permissao]);

  // ============================================================
  // TIRAR FOTO
  // ============================================================
  const handleCapturar = async () => {
    if (!cameraRef.current || capturando) return;

    try {
      setCapturando(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Foto não foi capturada corretamente');
      }

      console.log('📷 Foto capturada:', photo.uri);

      // Salva no FileSystem permanente
      const resultado = await salvarFoto(photo.uri, {
        criancaId: userData?.id,
        motivo: 'Captura manual',
      });

      if (resultado.success) {
        Alert.alert(
          '✅ Foto salva!',
          'A foto foi adicionada ao histórico.',
          [
            {
              text: 'Ver histórico',
              onPress: () => onNavigate('historicoCamera', userData),
            },
            {
              text: 'Tirar outra',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a foto.');
      }
    } catch (error) {
      console.error('Erro ao capturar:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    } finally {
      setCapturando(false);
    }
  };

  // ============================================================
  // VIRAR CÂMERA
  // ============================================================
  const handleVirar = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  // ============================================================
  // SEM PERMISSÃO
  // ============================================================
  if (!permissao) {
    return (
      <SafeAreaView style={styles.container}>
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
        <View style={styles.centered}>
          <Text style={styles.infoText}>Carregando permissão...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permissao.granted) {
    return (
      <SafeAreaView style={styles.container}>
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
  // COM PERMISSÃO — PREVIEW AO VIVO
  // ============================================================
  return (
    <SafeAreaView style={styles.container}>
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

      {/* PREVIEW DA CÂMERA */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        />
      </View>

      {/* CONTROLES */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.sideButton} onPress={handleVirar}>
          <Ionicons name="camera-reverse-outline" size={28} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, capturando && styles.captureButtonDisabled]}
          onPress={handleCapturar}
          disabled={capturando}
          activeOpacity={0.8}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <View style={styles.sideButton} />
      </View>
    </SafeAreaView>
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

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: { flex: 1 },

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
});