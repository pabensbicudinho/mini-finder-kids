import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// CARREGA SQLITE APENAS NO CELULAR
// ============================================================
let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

let db = null;

// ============================================================
// INICIALIZAÇÃO
// ============================================================
export const initDatabase = async () => {
  if (Platform.OS === 'web') {
    console.log('🌐 Modo Web: usando AsyncStorage como banco de dados.');
    return;
  }

  db = await SQLite.openDatabaseAsync('minifinderkids.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      telefone TEXT,
      dataNasc TEXT,
      senha TEXT
    );
    CREATE TABLE IF NOT EXISTS criancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      idade TEXT,
      dispositivo TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS localizacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crianca_id INTEGER,
      latitude REAL,
      longitude REAL,
      data_hora TEXT
    );
    CREATE TABLE IF NOT EXISTS perimetro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crianca_id INTEGER,
      latitude REAL,
      longitude REAL,
      raio REAL,
      nome TEXT
    );
  `);
  console.log('📱 SQLite inicializado com sucesso.');
};

// ============================================================
// USUÁRIOS (CADASTRO E LOGIN)
// ============================================================
export const cadastrarUsuario = async (nome, email, telefone, dataNasc, senha) => {
  try {
    if (Platform.OS === 'web') {
      // WEB: usa AsyncStorage
      const lista = await AsyncStorage.getItem('@lista_usuarios');
      const usuarios = lista ? JSON.parse(lista) : [];

      // Verifica se o e-mail já existe
      const emailExiste = usuarios.some((u) => u.email === email);
      if (emailExiste) {
        return { success: false, message: 'Este e-mail já está cadastrado.' };
      }

      usuarios.push({ id: Date.now(), nome, email, telefone, dataNasc, senha });
      await AsyncStorage.setItem('@lista_usuarios', JSON.stringify(usuarios));
      return { success: true };
    }

    // CELULAR: usa SQLite
    const existente = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    if (existente) {
      return { success: false, message: 'Este e-mail já está cadastrado.' };
    }

    await db.runAsync(
      'INSERT INTO usuarios (nome, email, telefone, dataNasc, senha) VALUES (?, ?, ?, ?, ?)',
      [nome, email, telefone, dataNasc, senha]
    );
    return { success: true };
  } catch (error) {
    console.error('Erro no cadastro:', error);
    return { success: false, message: 'Erro ao cadastrar usuário.' };
  }
};

export const loginUsuario = async (email, senha) => {
  try {
    if (Platform.OS === 'web') {
      const lista = await AsyncStorage.getItem('@lista_usuarios');
      const usuarios = lista ? JSON.parse(lista) : [];
      const user = usuarios.find((u) => u.email === email && u.senha === senha);
      if (user) {
        return { success: true, user };
      }
      return { success: false, message: 'E-mail ou senha incorretos.' };
    }

    const user = await db.getFirstAsync(
      'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
      [email, senha]
    );
    if (user) {
      return { success: true, user };
    }
    return { success: false, message: 'E-mail ou senha incorretos.' };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, message: 'Erro ao fazer login.' };
  }
};

// ============================================================
// CRIANÇAS
// ============================================================
export const salvarCrianca = async (crianca) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@lista_criancas');
    const criancas = lista ? JSON.parse(lista) : [];
    crianca.id = Date.now();
    criancas.push(crianca);
    await AsyncStorage.setItem('@lista_criancas', JSON.stringify(criancas));
    return { success: true };
  }
  await db.runAsync(
    'INSERT INTO criancas (nome, idade, dispositivo, status) VALUES (?, ?, ?, ?)',
    [crianca.nome, crianca.idade, crianca.dispositivo, crianca.status]
  );
  return { success: true };
};

export const listarCriancas = async () => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@lista_criancas');
    return lista ? JSON.parse(lista) : [];
  }
  return await db.getAllAsync('SELECT * FROM criancas');
};

// ============================================================
// LOCALIZAÇÃO
// ============================================================
export const salvarLocalizacao = async (criancaId, lat, lng) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@historico_localizacao');
    const historico = lista ? JSON.parse(lista) : [];
    historico.push({
      criancaId,
      latitude: lat,
      longitude: lng,
      data_hora: new Date().toISOString(),
    });
    await AsyncStorage.setItem('@historico_localizacao', JSON.stringify(historico));
    return;
  }
  await db.runAsync(
    'INSERT INTO localizacao (crianca_id, latitude, longitude, data_hora) VALUES (?, ?, ?, ?)',
    [criancaId, lat, lng, new Date().toISOString()]
  );
};

export const listarLocalizacoes = async (criancaId) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@historico_localizacao');
    const historico = lista ? JSON.parse(lista) : [];
    return historico.filter((h) => h.criancaId === criancaId);
  }
  return await db.getAllAsync(
    'SELECT * FROM localizacao WHERE crianca_id = ? ORDER BY data_hora DESC',
    [criancaId]
  );
};

// ============================================================
// PERÍMETRO SEGURO
// ============================================================
export const salvarPerimetro = async (perimetro) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@perimetros');
    const perimetros = lista ? JSON.parse(lista) : [];
    perimetros.push(perimetro);
    await AsyncStorage.setItem('@perimetros', JSON.stringify(perimetros));
    return;
  }
  await db.runAsync(
    'INSERT INTO perimetro (crianca_id, latitude, longitude, raio, nome) VALUES (?, ?, ?, ?, ?)',
    [perimetro.criancaId, perimetro.latitude, perimetro.longitude, perimetro.raio, perimetro.nome]
  );
};

export const listarPerimetros = async (criancaId) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@perimetros');
    const perimetros = lista ? JSON.parse(lista) : [];
    return perimetros.filter((p) => p.criancaId === criancaId);
  }
  return await db.getAllAsync(
    'SELECT * FROM perimetro WHERE crianca_id = ?',
    [criancaId]
  );
};