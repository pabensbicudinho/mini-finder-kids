// services/audioService.js
import {
  AudioModule,
  setAudioModeAsync,
  createAudioPlayer,
  RecordingPresets,
} from 'expo-audio';
import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@historico_microfone';
const AUDIO_DIR = new Directory(Paths.document, 'audios');

// ============================================================
// GARANTIR PASTA
// ============================================================
const garantirPasta = () => {
  if (!AUDIO_DIR.exists) {
    AUDIO_DIR.create({ intermediates: true });
  }
};

// ============================================================
// PERMISSÃO
// ============================================================
export const pedirPermissaoMicrofone = async () => {
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
// Cria instância do recorder via AudioModule (API imperativa)
// ============================================================
let recorderInstance = null;

export const iniciarGravacao = async () => {
  try {
    garantirPasta();

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    // 🔑 API correta: AudioModule.AudioRecorder ou createAudioRecorder
    // No expo-audio SDK 57, o construtor é acessível via AudioModule
    const { AudioRecorder } = AudioModule;

    if (!AudioRecorder) {
      throw new Error('AudioRecorder não disponível no módulo');
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
  try {
    const rec = recorder || recorderInstance;
    if (!rec) throw new Error('Nenhuma gravação ativa');

    await rec.stop();

    const uriTemp = rec.uri;
    if (!uriTemp) throw new Error('URI de gravação não encontrada');

    const id = `audio-${Date.now()}`;
    const arquivoTemp = new File(uriTemp);
    const arquivoFinal = new File(AUDIO_DIR, `${id}.m4a`);

    // Move para pasta permanente
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
// 🚨 LIMPAR ÁUDIOS MOCK (dados hipotéticos antigos)
// ============================================================
export const limparAudiosHipoteticos = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { success: true, removidos: 0 };

    const lista = JSON.parse(raw);

    // Filtra: só mantém o que tiver arquivo físico existente
    const validos = [];
    for (const audio of lista) {
      try {
        const arquivo = new File(audio.uri);
        if (arquivo.exists) {
          validos.push(audio);
        } else {
          console.log('🗑️ Removendo mock:', audio.uri);
        }
      } catch (e) {
        // Se não conseguiu checar, descarta
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validos));

    const removidos = lista.length - validos.length;
    console.log(`🗑️ Removidos ${removidos} áudios hipotéticos`);

    return { success: true, removidos };
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
  try {
    if (!uri) {
      return { success: false, message: 'URI inválida' };
    }

    const arquivo = new File(uri);
    if (!arquivo.exists) {
      return { success: false, message: 'Arquivo de áudio não encontrado' };
    }

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    // 🔑 API correta: createAudioPlayer recebe a URI diretamente
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
      currentPlayer.pause();
      if (currentPlayer.remove) currentPlayer.remove();
      currentPlayer = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao parar reprodução:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// DELETAR
// ============================================================
export const deletarAudio = async (audioId, uri) => {
  try {
    if (uri) {
      const arquivo = new File(uri);
      if (arquivo.exists) {
        arquivo.delete();
      }
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