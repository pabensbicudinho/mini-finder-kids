import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cadastrarUsuario } from '../database/db';

export default function Cadastro({ onNavigate }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // --- Máscara de Telefone: (00) 00000-0000 ---
  const handleTelefone = (texto) => {
    let numeros = texto.replace(/\D/g, '');
    if (numeros.length > 11) numeros = numeros.slice(0, 11);

    let formatado = '';
    if (numeros.length > 0) formatado = '(' + numeros.slice(0, 2);
    if (numeros.length > 2) formatado += ') ' + numeros.slice(2, 7);
    if (numeros.length > 7) formatado += '-' + numeros.slice(7, 11);

    setTelefone(formatado);
  };

  // --- Máscara de Data: DD/MM/AAAA ---
  const handleDataNasc = (texto) => {
    let numeros = texto.replace(/\D/g, '');
    if (numeros.length > 8) numeros = numeros.slice(0, 8);

    let formatado = '';
    if (numeros.length > 0) formatado = numeros.slice(0, 2);
    if (numeros.length > 2) formatado += '/' + numeros.slice(2, 4);
    if (numeros.length > 4) formatado += '/' + numeros.slice(4, 8);

    setDataNasc(formatado);
  };

  // --- Validação de maior de 18 anos ---
  const validarMaioridade = (dataFormatada) => {
    const partes = dataFormatada.split('/');
    if (partes.length !== 3) return false;

    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const ano = parseInt(partes[2], 10);

    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900) return false;

    const dataNascimento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();

    if (
      mesAtual < dataNascimento.getMonth() ||
      (mesAtual === dataNascimento.getMonth() && diaAtual < dataNascimento.getDate())
    ) {
      idade--;
    }

    return idade >= 18;
  };

  const handleCadastro = async () => {
    if (!nome || !email || !telefone || !dataNasc || !senha || !confirmarSenha) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    if (telefone.length < 15) {
      Alert.alert('Erro', 'Por favor, insira um telefone válido com 11 dígitos.');
      return;
    }
    if (dataNasc.length < 10) {
      Alert.alert('Erro', 'Por favor, insira uma data de nascimento válida.');
      return;
    }
    if (!validarMaioridade(dataNasc)) {
      Alert.alert('Erro', 'Você precisa ter 18 anos ou mais para se cadastrar.');
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    try {
      const result = await cadastrarUsuario(nome, email, telefone, dataNasc, senha);

      if (result.success) {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
        onNavigate('login');
      } else {
        Alert.alert('Erro', result.message || 'Não foi possível cadastrar.');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar os dados.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para criar sua conta</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="nome"
            placeholderTextColor="#999999"
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#999999"
            value={telefone}
            onChangeText={handleTelefone}
            keyboardType="numeric"
            maxLength={15}
          />

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            style={styles.input}
            placeholder="dd/mm/aaaa"
            placeholderTextColor="#999999"
            value={dataNasc}
            onChangeText={handleDataNasc}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="senha"
              placeholderTextColor="#999999"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setMostrarSenha(!mostrarSenha)}
            >
              <Ionicons
                name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirme sua senha</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="senha"
              placeholderTextColor="#999999"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry={!mostrarConfirmarSenha}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
            >
              <Ionicons
                name={mostrarConfirmarSenha ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleCadastro}>
            <Text style={styles.buttonText}>Criar conta</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate('login')}>
            <Text style={styles.switchText}>
              Já tem uma conta? <Text style={styles.switchLink}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardContainer: { flex: 1, backgroundColor: '#fff' },
  container: {
    flexGrow: 1, justifyContent: 'center', padding: 20,
    paddingBottom: 80, backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a237e', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5, marginTop: 10 },
  input: {
    width: '100%', height: 50, backgroundColor: '#f9f9f9', borderRadius: 8,
    paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd',
    marginBottom: 10, fontSize: 16, color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', width: '100%', height: 50,
    backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1,
    borderColor: '#ddd', marginBottom: 10,
  },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 15, fontSize: 16, color: '#333' },
  eyeButton: { paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  button: {
    width: '100%', height: 50, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 2, borderColor: '#1e3a8a', justifyContent: 'center',
    alignItems: 'center', marginTop: 15,
  },
  buttonText: { color: '#1e3a8a', fontSize: 18, fontWeight: 'bold' },
  switchText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 25, marginBottom: 10 },
  switchLink: { color: '#1e3a8a', fontWeight: 'bold' },
});