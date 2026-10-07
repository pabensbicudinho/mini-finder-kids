import * as SQLite from 'expo-sqlite';

// Abre (ou cria) o banco de dados
const db = SQLite.openDatabaseSync('minifinderkids.db');

// Cria todas as tabelas necessárias
export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT,
      dataNasc TEXT,
      senha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS criancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      idade TEXT,
      dispositivo TEXT,
      status TEXT DEFAULT 'Dispositivo conectado',
      avatar TEXT,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS localizacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crianca_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      data_hora TEXT NOT NULL,
      FOREIGN KEY (crianca_id) REFERENCES criancas(id)
    );

    CREATE TABLE IF NOT EXISTS perimetro_seguro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crianca_id INTEGER,
      nome_local TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      raio INTEGER DEFAULT 500,
      FOREIGN KEY (crianca_id) REFERENCES criancas(id)
    );
  `);
  console.log('Banco de dados inicializado com sucesso!');
};

// ==================== USUÁRIOS ====================
export const cadastrarUsuario = (nome, email, telefone, dataNasc, senha) => {
  try {
    const result = db.runSync(
      'INSERT INTO usuarios (nome, email, telefone, dataNasc, senha) VALUES (?, ?, ?, ?, ?)',
      [nome, email, telefone, dataNasc, senha]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const loginUsuario = (email, senha) => {
  const result = db.getFirstSync(
    'SELECT * FROM usuarios WHERE email = ? AND senha = ?',
    [email, senha]
  );
  return result || null;
};

// ==================== CRIANÇAS ====================
export const cadastrarCrianca = (nome, idade, dispositivo, avatar, color) => {
  try {
    const result = db.runSync(
      'INSERT INTO criancas (nome, idade, dispositivo, avatar, color) VALUES (?, ?, ?, ?, ?)',
      [nome, idade, dispositivo, avatar, color]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const listarCriancas = () => {
  return db.getAllSync('SELECT * FROM criancas ORDER BY id DESC');
};

// ==================== LOCALIZAÇÕES ====================
export const salvarLocalizacao = (criancaId, latitude, longitude) => {
  try {
    const dataHora = new Date().toISOString();
    db.runSync(
      'INSERT INTO localizacoes (crianca_id, latitude, longitude, data_hora) VALUES (?, ?, ?, ?)',
      [criancaId, latitude, longitude, dataHora]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const listarLocalizacoes = (criancaId) => {
  return db.getAllSync(
    'SELECT * FROM localizacoes WHERE crianca_id = ? ORDER BY data_hora DESC',
    [criancaId]
  );
};

// ==================== PERÍMETRO SEGURO ====================
export const cadastrarPerimetro = (criancaId, nomeLocal, latitude, longitude, raio) => {
  try {
    db.runSync(
      'INSERT INTO perimetro_seguro (crianca_id, nome_local, latitude, longitude, raio) VALUES (?, ?, ?, ?, ?)',
      [criancaId, nomeLocal, latitude, longitude, raio || 500]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const listarPerimetros = (criancaId) => {
  return db.getAllSync(
    'SELECT * FROM perimetro_seguro WHERE crianca_id = ?',
    [criancaId]
  );
};

// ==================== VERIFICAÇÃO DE PERÍMETRO ====================
// Calcula a distância entre dois pontos (Fórmula de Haversine)
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Verifica se a criança saiu do perímetro seguro
export const verificarPerimetro = (criancaId, latitudeAtual, longitudeAtual) => {
  const perimetros = listarPerimetros(criancaId);
  for (const perimetro of perimetros) {
    const distancia = calcularDistancia(
      latitudeAtual, longitudeAtual,
      perimetro.latitude, perimetro.longitude
    );
    if (distancia > perimetro.raio) {
      return {
        saiu: true,
        local: perimetro.nome_local,
        distancia: Math.round(distancia),
      };
    }
  }
  return { saiu: false };
};

export default db;