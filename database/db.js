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

  // 1️⃣ Cria tabelas se não existirem
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
      avatar TEXT,
      color TEXT,
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
    CREATE TABLE IF NOT EXISTS rotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crianca_id INTEGER,
      cep_origem TEXT,
      cep_destino TEXT,
      latitude_origem REAL,
      longitude_origem REAL,
      latitude_destino REAL,
      longitude_destino REAL,
      logradouro TEXT,
      bairro TEXT,
      cidade TEXT,
      estado TEXT,
      cep TEXT,
      endereco_completo TEXT,
      coordenadas TEXT,
      distancia_metros REAL,
      duracao_segundos REAL,
      data_criacao TEXT
    );
  `);

  // 2️⃣ MIGRAÇÃO: adiciona colunas que podem faltar em bancos antigos
  await migrarTabelaRotas();
  await migrarTabelaPerimetro();

  console.log('📱 SQLite inicializado com sucesso.');
};

// ============================================================
// MIGRAÇÃO: adiciona colunas em falta na tabela 'rotas'
// ============================================================
const migrarTabelaRotas = async () => {
  try {
    const colunas = await db.getAllAsync(`PRAGMA table_info(rotas)`);
    const nomesExistentes = colunas.map((c) => c.name);

    const colunasNecessarias = [
      { nome: 'cep_origem', tipo: 'TEXT' },
      { nome: 'cep_destino', tipo: 'TEXT' },
      { nome: 'latitude_origem', tipo: 'REAL' },
      { nome: 'longitude_origem', tipo: 'REAL' },
      { nome: 'latitude_destino', tipo: 'REAL' },
      { nome: 'longitude_destino', tipo: 'REAL' },
      { nome: 'logradouro', tipo: 'TEXT' },
      { nome: 'bairro', tipo: 'TEXT' },
      { nome: 'cidade', tipo: 'TEXT' },
      { nome: 'estado', tipo: 'TEXT' },
      { nome: 'cep', tipo: 'TEXT' },
      { nome: 'endereco_completo', tipo: 'TEXT' },
      { nome: 'coordenadas', tipo: 'TEXT' },
      { nome: 'distancia_metros', tipo: 'REAL' },
      { nome: 'duracao_segundos', tipo: 'REAL' },
      { nome: 'data_criacao', tipo: 'TEXT' },
    ];

    for (const col of colunasNecessarias) {
      if (!nomesExistentes.includes(col.nome)) {
        await db.execAsync(`ALTER TABLE rotas ADD COLUMN ${col.nome} ${col.tipo}`);
        console.log(`🔧 Coluna adicionada em 'rotas': ${col.nome} ${col.tipo}`);
      }
    }
  } catch (error) {
    console.error('Erro na migração da tabela rotas:', error);
  }
};

// ============================================================
// MIGRAÇÃO: adiciona colunas em falta na tabela 'perimetro'
// ============================================================
const migrarTabelaPerimetro = async () => {
  try {
    const colunas = await db.getAllAsync(`PRAGMA table_info(perimetro)`);
    const nomesExistentes = colunas.map((c) => c.name);

    const colunasNecessarias = [
      { nome: 'nome', tipo: 'TEXT' },
    ];

    for (const col of colunasNecessarias) {
      if (!nomesExistentes.includes(col.nome)) {
        await db.execAsync(`ALTER TABLE perimetro ADD COLUMN ${col.nome} ${col.tipo}`);
        console.log(`🔧 Coluna adicionada em 'perimetro': ${col.nome} ${col.tipo}`);
      }
    }
  } catch (error) {
    console.error('Erro na migração da tabela perimetro:', error);
  }
};

// ============================================================
// USUÁRIOS (CADASTRO E LOGIN)
// ============================================================
export const cadastrarUsuario = async (nome, email, telefone, dataNasc, senha) => {
  try {
    if (Platform.OS === 'web') {
      const lista = await AsyncStorage.getItem('@lista_usuarios');
      const usuarios = lista ? JSON.parse(lista) : [];

      const emailExiste = usuarios.some((u) => u.email === email);
      if (emailExiste) {
        return { success: false, message: 'Este e-mail já está cadastrado.' };
      }

      usuarios.push({ id: Date.now(), nome, email, telefone, dataNasc, senha });
      await AsyncStorage.setItem('@lista_usuarios', JSON.stringify(usuarios));
      return { success: true };
    }

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
  try {
    if (Platform.OS === 'web') {
      const lista = await AsyncStorage.getItem('@lista_criancas');
      const criancas = lista ? JSON.parse(lista) : [];
      crianca.id = Date.now();
      criancas.push(crianca);
      await AsyncStorage.setItem('@lista_criancas', JSON.stringify(criancas));
      return { success: true, id: crianca.id };
    }

    const result = await db.runAsync(
      'INSERT INTO criancas (nome, idade, dispositivo, avatar, color, status) VALUES (?, ?, ?, ?, ?, ?)',
      [
        crianca.nome,
        crianca.idade,
        crianca.dispositivo,
        crianca.avatar || '🧒',
        crianca.color || '#FEF3C7',
        crianca.status || 'Dispositivo conectado',
      ]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Erro ao salvar criança:', error);
    return { success: false, message: 'Erro ao salvar criança.' };
  }
};

export const cadastrarCrianca = async (nome, idade, dispositivo, avatar, color) => {
  return await salvarCrianca({
    nome,
    idade,
    dispositivo,
    avatar: avatar || '🧒',
    color: color || '#FEF3C7',
    status: 'Dispositivo conectado',
  });
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
// LIMPAR HISTÓRICO E ROTAS
// ============================================================
export const limparHistorico = async () => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem('@historico_localizacao');
      await AsyncStorage.removeItem('@rotas');
      await AsyncStorage.removeItem('@perimetros');
      console.log('🗑️ Histórico limpo (Web).');
      return { success: true };
    }

    await db.execAsync(`
      DELETE FROM localizacao;
      DELETE FROM rotas;
      DELETE FROM perimetro;
    `);
    console.log('🗑️ Histórico limpo (SQLite).');
    return { success: true };
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    return { success: false, message: 'Erro ao limpar.' };
  }
};

// ============================================================
// PERÍMETRO SEGURO (círculo)
// ============================================================
export const salvarPerimetro = async (perimetro) => {
  try {
    if (Platform.OS === 'web') {
      const lista = await AsyncStorage.getItem('@perimetros');
      const perimetros = lista ? JSON.parse(lista) : [];
      perimetro.id = Date.now();
      perimetros.push(perimetro);
      await AsyncStorage.setItem('@perimetros', JSON.stringify(perimetros));
      return { success: true, id: perimetro.id };
    }

    const result = await db.runAsync(
      'INSERT INTO perimetro (crianca_id, latitude, longitude, raio, nome) VALUES (?, ?, ?, ?, ?)',
      [
        perimetro.criancaId,
        perimetro.latitude,
        perimetro.longitude,
        perimetro.raio,
        perimetro.nome,
      ]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('Erro ao salvar perímetro:', error);
    return { success: false, message: 'Erro ao salvar perímetro.' };
  }
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

// ============================================================
// VERIFICAR PERÍMETRO SEGURO (círculo)
// ============================================================
export const verificarPerimetro = async (criancaId, latitude, longitude) => {
  try {
    const perimetros = await listarPerimetros(criancaId);

    if (!perimetros || perimetros.length === 0) {
      return { dentroDoPerimetro: true, mensagem: 'Nenhum perímetro definido.' };
    }

    for (const perimetro of perimetros) {
      const distancia = calcularDistancia(
        latitude,
        longitude,
        perimetro.latitude,
        perimetro.longitude
      );

      if (distancia <= perimetro.raio) {
        return { dentroDoPerimetro: true, perimetro: perimetro.nome };
      }
    }

    return {
      dentroDoPerimetro: false,
      mensagem: 'A criança saiu da área segura.',
    };
  } catch (error) {
    console.error('Erro ao verificar perímetro:', error);
    return { dentroDoPerimetro: true };
  }
};

// ============================================================
// ROTAS SEGURAS + PERÍMETRO SEGURO (SALVA NAS DUAS TABELAS)
// ============================================================
export const salvarRota = async (rota) => {
  try {
    if (Platform.OS === 'web') {
      // Salva em @rotas
      const lista = await AsyncStorage.getItem('@rotas');
      const rotas = lista ? JSON.parse(lista) : [];
      rota.id = Date.now();
      rotas.push(rota);
      await AsyncStorage.setItem('@rotas', JSON.stringify(rotas));

      // Salva TAMBÉM em @perimetros
      const listaP = await AsyncStorage.getItem('@perimetros');
      const perimetros = listaP ? JSON.parse(listaP) : [];
      perimetros.push({
        id: Date.now() + 1,
        criancaId: rota.criancaId,
        latitude: rota.latitudeDestino,
        longitude: rota.longitudeDestino,
        raio: rota.raio,
        nome: rota.nome,
        logradouro: rota.logradouro,
        bairro: rota.bairro,
        cidade: rota.cidade,
        estado: rota.estado,
        cep: rota.cep,
      });
      await AsyncStorage.setItem('@perimetros', JSON.stringify(perimetros));

      console.log('💾 Rota + Perímetro salvos (Web)');
      return { success: true, id: rota.id };
    }

    // SQLite: salva em rotas
    const result = await db.runAsync(
      `INSERT INTO rotas 
      (crianca_id, cep_origem, cep_destino, latitude_origem, longitude_origem, 
       latitude_destino, longitude_destino, logradouro, bairro, cidade, estado, 
       cep, endereco_completo, coordenadas, distancia_metros, 
       duracao_segundos, data_criacao) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rota.criancaId,
        rota.cepOrigem,
        rota.cepDestino,
        rota.latitudeOrigem,
        rota.longitudeOrigem,
        rota.latitudeDestino,
        rota.longitudeDestino,
        rota.logradouro || null,
        rota.bairro || null,
        rota.cidade || null,
        rota.estado || null,
        rota.cep || null,
        rota.enderecoCompleto || null,
        JSON.stringify(rota.coordenadas || []),
        rota.distanciaMetros,
        rota.duracaoSegundos,
        new Date().toISOString(),
      ]
    );

    console.log('✅ Rota salva. ID:', result.lastInsertRowId);

    // SQLite: salva TAMBÉM em perimetro
    const resultPerimetro = await db.runAsync(
      `INSERT INTO perimetro (crianca_id, latitude, longitude, raio, nome) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        rota.criancaId,
        rota.latitudeDestino,
        rota.longitudeDestino,
        rota.raio,
        rota.nome,
      ]
    );

    console.log('✅ Perímetro salvo. ID:', resultPerimetro.lastInsertRowId);

    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error('❌ Erro ao salvar rota/perímetro:', error);
    return { success: false, message: 'Erro ao salvar rota.' };
  }
};

export const listarRotas = async (criancaId) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@rotas');
    const rotas = lista ? JSON.parse(lista) : [];
    return rotas.filter((r) => r.criancaId === criancaId);
  }

  const rotas = await db.getAllAsync(
    'SELECT * FROM rotas WHERE crianca_id = ?',
    [criancaId]
  );

  return rotas.map((r) => ({
    ...r,
    coordenadas: r.coordenadas ? JSON.parse(r.coordenadas) : [],
  }));
};

export const deletarRota = async (rotaId) => {
  if (Platform.OS === 'web') {
    const lista = await AsyncStorage.getItem('@rotas');
    const rotas = lista ? JSON.parse(lista) : [];
    const novasRotas = rotas.filter((r) => r.id !== rotaId);
    await AsyncStorage.setItem('@rotas', JSON.stringify(novasRotas));
    return { success: true };
  }

  await db.runAsync('DELETE FROM rotas WHERE id = ?', [rotaId]);
  return { success: true };
};

// ============================================================
// CALCULAR DISTÂNCIA (Haversine)
// ============================================================
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};