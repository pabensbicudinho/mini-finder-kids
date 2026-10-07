import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NovaCrianca({ onNavigate }) {
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [dispositivo, setDispositivo] = useState('');

  const handleSalvar = async () => {
    if (nome.trim() === '' || idade.trim() === '' || dispositivo.trim() === '') {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      const criancasSalvas = await AsyncStorage.getItem('@lista_criancas');
      const listaCriancas = criancasSalvas ? JSON.parse(criancasSalvas) : [];

      const novaCrianca = {
        id: Date.now(),
        nome: nome.trim(),
        idade: idade.trim(),
        dispositivo: dispositivo.trim().toUpperCase(),
        avatar: '🧒',
        color: '#FEF3C7',
        status: 'Dispositivo conectado',
      };

      listaCriancas.push(novaCrianca);
      await AsyncStorage.setItem('@lista_criancas', JSON.stringify(listaCriancas));

      setNome('');
      setIdade('');
      setDispositivo('');

      // Redireciona DIRETO para a tela inicial (sem pop-up)
      onNavigate('inicio');
    } catch (error) {
      console.error('Erro ao salvar criança:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com botão voltar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('inicio')}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Nova criança</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Preencha os dados abaixo para vincular uma nova criança ao seu perfil.
        </Text>

        <Text style={styles.label}>Nome da criança</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Ana"
          placeholderTextColor="#9CA3AF"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Idade</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 8"
          placeholderTextColor="#9CA3AF"
          value={idade}
          onChangeText={setIdade}
          keyboardType="numeric"
          maxLength={3}
        />

        <Text style={styles.label}>ID do dispositivo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: MFK-12345"
          placeholderTextColor="#9CA3AF"
          value={dispositivo}
          onChangeText={setDispositivo}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSalvar}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Salvar criança</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onNavigate('inicio')}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  backButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },
  backIcon: { fontSize: 32, color: '#1A237E', fontWeight: '400', lineHeight: 36 },
  headerSpacer: { width: 40 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 25, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333333', marginBottom: 6, marginTop: 10 },
  input: {
    width: '100%', height: 52, backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB',
    fontSize: 16, color: '#333333',
  },
  button: {
    width: '100%', height: 52, backgroundColor: '#1E3A8A', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 25,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  cancelText: {
    color: '#6B7280', fontSize: 14, textAlign: 'center',
    marginTop: 20, textDecorationLine: 'underline',
  },
});