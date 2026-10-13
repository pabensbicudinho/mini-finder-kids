// services/cameraService.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let File = null;
let Directory = null;
let Paths = null;

if (Platform.OS !== 'web') {
  const fs = require('expo-file-system');
  File = fs.File;
  Directory = fs.Directory;
  Paths = fs.Paths;
}

const STORAGE_KEY = '@historico_camera';

let CAMERA_DIR = null;
if (Platform.OS !== 'web' && Directory && Paths) {
  CAMERA_DIR = new Directory(Paths.document, 'midias');
}

const garantirPasta = () => {
  if (Platform.OS === 'web') return;
  if (CAMERA_DIR && !CAMERA_DIR.exists) {
    CAMERA_DIR.create({ intermediates: true });
  }
};

// ============================================================
// SALVAR FOTO
// ============================================================
export const salvarFoto = async (photoUri, metadata = {}) => {
  try {
    const id = `foto-${Date.now()}`;
    let uriFinal = photoUri;
    let tamanho = 0;

    if (Platform.OS === 'web') {
      // 🌐 WEB: base64 (garante prefixo data URL)
      if (!photoUri.startsWith('data:')) {
        uriFinal = `data:image/jpeg;base64,${photoUri}`;
      }
      tamanho = Math.round((photoUri.length * 3) / 4);
    } else {
      // 📱 MOBILE: move o arquivo para a pasta permanente
      garantirPasta();
      const arquivoTemp = new File(photoUri);
      const arquivoFinal = new File(CAMERA_DIR, `${id}.jpg`);
      arquivoTemp.move(arquivoFinal);
      uriFinal = arquivoFinal.uri;
      tamanho = arquivoFinal.size || 0;
    }

    const agora = new Date();
    const novaMidia = {
      id,
      data: agora.toLocaleDateString('pt-BR'),
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      uri: uriFinal,
      tamanho,
      tipo: 'foto',
      disponivel: true,
      conectado: true,
      isWeb: Platform.OS === 'web',
      ...metadata,
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift(novaMidia);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

    console.log('📷 Foto salva:', uriFinal.substring(0, 50));
    return { success: true, foto: novaMidia, midia: novaMidia };
  } catch (error) {
    console.error('Erro ao salvar foto:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// SALVAR VÍDEO
// ============================================================
export const salvarVideo = async (videoUri, metadata = {}) => {
  try {
    const id = `video-${Date.now()}`;
    let uriFinal = videoUri;
    let tamanho = 0;

    if (Platform.OS === 'web') {
      // 🌐 WEB: o uri é um blob: URL — mantém como está
      uriFinal = videoUri;
      tamanho = 0; // Web não expõe tamanho facilmente
    } else {
      // 📱 MOBILE: move o arquivo
      garantirPasta();
      const arquivoTemp = new File(videoUri);
      const arquivoFinal = new File(CAMERA_DIR, `${id}.mp4`);
      arquivoTemp.move(arquivoFinal);
      uriFinal = arquivoFinal.uri;
      tamanho = arquivoFinal.size || 0;
    }

    const agora = new Date();
    const novaMidia = {
      id,
      data: agora.toLocaleDateString('pt-BR'),
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      uri: uriFinal,
      tamanho,
      tipo: 'video',
      disponivel: true,
      conectado: true,
      isWeb: Platform.OS === 'web',
      ...metadata,
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift(novaMidia);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

    console.log('🎥 Vídeo salvo:', uriFinal.substring(0, 50));
    return { success: true, video: novaMidia, midia: novaMidia };
  } catch (error) {
    console.error('Erro ao salvar vídeo:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// LISTAR MÍDIAS (fotos + vídeos)
// ============================================================
export const listarMidias = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// Compatibilidade retroativa
export const listarFotos = listarMidias;

// ============================================================
// LIMPAR HIPOTÉTICAS
// ============================================================
export const limparMidiasHipoteticas = async () => {
  if (Platform.OS === 'web') {
    return { success: true, removidos: 0 };
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { success: true, removidos: 0 };

    const lista = JSON.parse(raw);
    const validos = [];

    for (const midia of lista) {
      try {
        const arquivo = new File(midia.uri);
        if (arquivo.exists) validos.push(midia);
      } catch (e) {
        // descarta
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validos));
    return { success: true, removidos: lista.length - validos.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Compatibilidade retroativa
export const limparFotosHipoteticas = limparMidiasHipoteticas;

// ============================================================
// DELETAR MÍDIA
// ============================================================
export const deletarMidia = async (midiaId, uri) => {
  try {
    if (Platform.OS !== 'web' && uri) {
      const arquivo = new File(uri);
      if (arquivo.exists) arquivo.delete();
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    const novaLista = lista.filter((m) => m.id !== midiaId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar mídia:', error);
    return { success: false, message: error.message };
  }
};

// Compatibilidade retroativa
export const deletarFoto = deletarMidia;

// ============================================================
// FORMATAR TAMANHO
// ============================================================
export const formatarTamanho = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ============================================================
// FORMATAR DURAÇÃO (segundos → mm:ss)
// ============================================================
export const formatarDuracao = (segundos) => {
  if (!segundos) return '00:00';
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(Math.round(segundos % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
};