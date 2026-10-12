// services/cameraService.js
import { File, Directory, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@historico_camera';
const CAMERA_DIR = new Directory(Paths.document, 'fotos');

// ============================================================
// GARANTIR QUE A PASTA EXISTE
// ============================================================
const garantirPasta = () => {
  if (!CAMERA_DIR.exists) {
    CAMERA_DIR.create({ intermediates: true });
  }
};

// ============================================================
// SALVAR FOTO CAPTURADA
// ============================================================
export const salvarFoto = async (photoUri, metadata = {}) => {
  try {
    garantirPasta();

    const id = `foto-${Date.now()}`;
    const arquivoTemp = new File(photoUri);
    const arquivoFinal = new File(CAMERA_DIR, `${id}.jpg`);

    arquivoTemp.move(arquivoFinal);

    const agora = new Date();
    const novaFoto = {
      id,
      data: agora.toLocaleDateString('pt-BR'),
      hora: `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`,
      uri: arquivoFinal.uri,
      tamanho: arquivoFinal.size || 0,
      tipo: 'foto',
      disponivel: true,
      conectado: true,
      ...metadata,
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    lista.unshift(novaFoto);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));

    console.log('📷 Foto salva:', novaFoto.uri);
    return { success: true, foto: novaFoto };
  } catch (error) {
    console.error('Erro ao salvar foto:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// LISTAR FOTOS
// ============================================================
export const listarFotos = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// ============================================================
// LIMPAR FOTOS HIPOTÉTICAS
// ============================================================
export const limparFotosHipoteticas = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { success: true, removidos: 0 };

    const lista = JSON.parse(raw);
    const validos = [];

    for (const foto of lista) {
      try {
        const arquivo = new File(foto.uri);
        if (arquivo.exists) {
          validos.push(foto);
        } else {
          console.log('🗑️ Removendo foto hipotética:', foto.uri);
        }
      } catch (e) {
        // descarta
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validos));

    const removidos = lista.length - validos.length;
    console.log(`🗑️ Removidas ${removidos} fotos hipotéticas`);
    return { success: true, removidos };
  } catch (error) {
    console.error('Erro ao limpar hipotéticas:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// DELETAR FOTO
// ============================================================
export const deletarFoto = async (fotoId, uri) => {
  try {
    if (uri) {
      const arquivo = new File(uri);
      if (arquivo.exists) {
        arquivo.delete();
      }
    }

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const lista = raw ? JSON.parse(raw) : [];
    const novaLista = lista.filter((f) => f.id !== fotoId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
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