// services/audioService.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔑 Import condicional — só carrega no mobile
let FileSystem = null;
let File = null;
let Directory = null;
let Paths = null;
let AudioModule = null;
let setAudioModeAsync = null;
let createAudioPlayer = null;
let RecordingPresets = null;

if (Platform.OS !== 'web') {
  const fs = require('expo-file-system');
  FileSystem = fs;
  File = fs.File;
  Directory = fs.Directory;
  Paths = fs.Paths;

  const audio = require('expo-audio');
  AudioModule = audio.AudioModule;
  setAudioModeAsync = audio.setAudioModeAsync;
  createAudioPlayer = audio.createAudioPlayer;
  RecordingPresets = audio.RecordingPresets;
}

const STORAGE_KEY = '@historico_microfone';

// 🔑 Diretório só no mobile
let AUDIO_DIR = null;
if (Platform.OS !== 'web' && Directory && Paths) {
  AUDIO_DIR = new Directory(Paths.document, 'audios');
}

// ============================================================
// GARANTIR PASTA (só no mobile)
// ============================================================
const garantirPasta = () => {
  if (Platform.OS === 'web') return;
  if (AUDIO_DIR && !AUDIO_DIR.exists) {
    AUDIO_DIR.create({ intermediates: true });
  }
};

// ============================================================
// PERMISSÃO
// ============================================================
export const pedirPermissaoMicrofone = async () => {
  if (Platform.OS === 'web') {
    try {
      // Web usa API do navegador
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (error) {
      console.error('Erro ao pedir permissão (web):', error);
      return false;
    }
  }

  try {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    return status.granted;
  } catch (error) {
    console.error('Erro ao pedir permissão:', error);
    return false;
  }
};

// ============================================================
// INICIAR GRAVAÇÃO
// ============================================================
let recorderInstance = null;

export const iniciarGravacao = async () => {
  if (Platform.OS === 'web') {
    // Na web, usamos MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder._chunks = chunks;
      mediaRecorder._stream = stream;
      mediaRecorder.start();

      recorderInstance = mediaRecorder;
      console.log('🎙️ Gravação iniciada (web)');
      return { success: true, recording: mediaRecorder };
    } catch (error) {
      console.error('Erro ao iniciar gravação (web):', error);
      return { success: false, message: error.message };
    }
  }

  // Mobile
  try {
    garantirPasta();

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const { AudioRecorder } = AudioModule;
    if (!AudioRecorder) {
      throw new Error('AudioRecorder não disponível');
    }

    const recorder = new AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();

    recorderInstance = recorder;
    console.log('🎙️ Gravação iniciada');
    return { success: true, recording: recorder };
  } catch (error) {
    console.error('Erro ao iniciar gravação:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// PARAR GRAVAÇÃO E SALVAR
// ============================================================
export const pararGravacao = async (recorder, metadata = {}) => {
  // Web
  if (Platform.OS === 'web') {
    try {
      const rec = recorder || recorderInstance;
      if (!rec) throw new Error('Nenhuma gravação ativa');

      return new Promise((resolve) => {
        rec.onstop = async () => {
          const blob = new Blob(rec._chunks, { type: 'audio/webm' });
          const uri = URL.createObjectURL(blob);

          if (rec._stream) {
            rec._stream.getTracks().forEach((t) => t.stop());
          }

          const agora = new Date();
          const novoAudio = {
            id: `audio-${Date.now()}`,
            data: agora.toLocaleDateString('pt-BR'),
            hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
            duracao: '00:05',
            uri,
            tamanho: blob.size || 0,
            disponivel: true,
            conectado: true,
            isWeb: true,
            ...metadata,
          };

          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const lista = raw ? JSON.parse(raw) : [];
          lista.unshift(novoAudio);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

          recorderInstance = null;
          resolve({ success: true, audio: novoAudio });
        };

        rec.stop();
      });
    } catch (error) {
      console.error('Erro ao parar gravação (web):', error);
      return { success: false, message: error.message };
    }
  }

  // Mobile
  try {
    const rec = recorder || recorderInstance;
    if (!rec) throw new Error('Nenhuma gravação ativa');

    await rec.stop();

    const uriTemp = rec.uri;
    if (!uriTemp) throw new Error('URI de gravação não encontrada');

    const id = `audio-${Date.now()}`;
    const arquivoTemp = new File(uriTemp);
    const arquivoFinal = new File(AUDIO_DIR, `${id}.m4a`);

    arquivoTemp.move(arquivoFinal);

    const duracaoSegundos = Math.round(rec.currentTime || 0);
    const mm = String(Math.floor(duracaoSegundos / 60)).padStart(2, '0');
    const ss = String(duracaoSegundos % 60).padStart(2, '0');

    const agora = new Date();
    const novoAudio = {
      id,
      data: agora.toLocaleDateString('pt-BR'),
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      duracao: `${mm}:${ss}`,
      uri: arquivoFinal.uri,
      tamanho: arquivoFinal.size || 0,
      disponivel: true,
      conectado: true,
      ...metadata,
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift(novoAudio);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

    recorderInstance = null;
    console.log('🎙️ Áudio salvo:', novoAudio.uri);
    return { success: true, audio: novoAudio };
  } catch (error) {
    console.error('Erro ao parar gravação:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// LISTAR
// ============================================================
export const listarGravacoes = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// ============================================================
// LIMPAR HIPOTÉTICOS
// ============================================================
export const limparAudiosHipoteticos = async () => {
  // Na web, não temos FileSystem — mantém tudo
  if (Platform.OS === 'web') {
    return { success: true, removidos: 0 };
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { success: true, removidos: 0 };

    const lista = JSON.parse(raw);
    const validos = [];

    for (const audio of lista) {
      try {
        const arquivo = new File(audio.uri);
        if (arquivo.exists) {
          validos.push(audio);
        }
      } catch (e) {
        // descarta
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validos));
    return { success: true, removidos: lista.length - validos.length };
  } catch (error) {
    console.error('Erro ao limpar hipotéticos:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// REPRODUZIR
// ============================================================
let currentPlayer = null;

export const reproduzirAudio = async (uri) => {
  if (Platform.OS === 'web') {
    try {
      const audio = new Audio(uri);
      audio.play();
      currentPlayer = audio;
      return { success: true, player: audio };
    } catch (error) {
      console.error('Erro ao reproduzir (web):', error);
      return { success: false, message: error.message };
    }
  }

  try {
    if (!uri) return { success: false, message: 'URI inválida' };

    const arquivo = new File(uri);
    if (!arquivo.exists) {
      return { success: false, message: 'Arquivo não encontrado' };
    }

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    const player = createAudioPlayer(uri);
    player.play();
    currentPlayer = player;

    return { success: true, player };
  } catch (error) {
    console.error('Erro ao reproduzir:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// PARAR REPRODUÇÃO
// ============================================================
export const pararReproducao = async () => {
  try {
    if (currentPlayer) {
      if (Platform.OS === 'web') {
        currentPlayer.pause();
      } else {
        currentPlayer.pause();
        if (currentPlayer.remove) currentPlayer.remove();
      }
      currentPlayer = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// ============================================================
// DELETAR
// ============================================================
export const deletarAudio = async (audioId, uri) => {
  try {
    if (Platform.OS !== 'web' && uri) {
      const arquivo = new File(uri);
      if (arquivo.exists) arquivo.delete();
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    const novaLista = lista.filter((a) => a.id !== audioId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar áudio:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// FORMATAR TAMANHO
// ============================================================
export const formatarTamanho = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};