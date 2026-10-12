import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  listarCriancas, listarPerimetros,
} from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Debug({ onNavigate }) {
  const [usuarios, setUsuarios] = useState([]);
  const [criancas, setCriancas] = useState([]);
  const [perimetros, setPerimetros] = useState([]);

  const carregarDados = async () => {
    try {
      // Usuários
      if (Platform.OS === 'web') {
        const lista = await AsyncStorage.getItem('@lista_usuarios');
        setUsuarios(lista ? JSON.parse(lista) : []);
      } else {
        const SQLite = require('expo-sqlite');
        const db = await SQLite.openDatabaseAsync('minifinderkids.db');
        const lista = await db.getAllAsync('SELECT * FROM usuarios');
        setUsuarios(lista || []);
      }

      // Crianças
      const listaCriancas = await listarCriancas();
      setCriancas(listaCriancas || []);

      // Perímetros
      if (listaCriancas && listaCriancas.length > 0) {
        const idCrianca = listaCriancas[0].id;
        setPerimetros((await listarPerimetros(idCrianca)) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('inicio')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug do Banco</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* USUÁRIOS */}
        <Text style={styles.sectionTitle}>👤 Usuários ({usuarios.length})</Text>
        {usuarios.length === 0 ? (
          <Text style={styles.empty}>Nenhum usuário.</Text>
        ) : (
          usuarios.map((u, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardText}>Nome: {u.nome}</Text>
              <Text style={styles.cardText}>Email: {u.email}</Text>
              <Text style={styles.cardText}>Telefone: {u.telefone}</Text>
              <Text style={styles.cardText}>Nascimento: {u.dataNasc}</Text>
            </View>
          ))
        )}

        {/* CRIANÇAS */}
        <Text style={styles.sectionTitle}>👧 Crianças ({criancas.length})</Text>
        {criancas.length === 0 ? (
          <Text style={styles.empty}>Nenhuma criança.</Text>
        ) : (
          criancas.map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.cardText}>ID: {c.id}</Text>
              <Text style={styles.cardText}>Nome: {c.nome}</Text>
              <Text style={styles.cardText}>Idade: {c.idade}</Text>
              <Text style={styles.cardText}>Dispositivo: {c.dispositivo}</Text>
            </View>
          ))
        )}

        {/* PERÍMETROS */}
        <Text style={styles.sectionTitle}>🛡️ Perímetros Seguros ({perimetros.length})</Text>
        {perimetros.length === 0 ? (
          <Text style={styles.empty}>Nenhum perímetro cadastrado.</Text>
        ) : (
          perimetros.map((p, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardText}>Nome: {p.nome}</Text>
              <Text style={styles.cardText}>Raio: {p.raio}m</Text>
              <Text style={styles.cardText}>Lat: {p.latitude}</Text>
              <Text style={styles.cardText}>Long: {p.longitude}</Text>
            </View>
          ))
        )}

        {/* BOTÃO ATUALIZAR */}
        <TouchableOpacity style={styles.refreshButton} onPress={carregarDados}>
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E3A8A',
    marginTop: 20, marginBottom: 10,
  },
  empty: {
    fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFF', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  cardText: { fontSize: 13, color: '#333', marginBottom: 2 },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E3A8A', paddingVertical: 12, borderRadius: 10, marginTop: 20,
  },
  refreshText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
});