import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, Image,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loginUsuario } from '../database/db';

export default function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      // Usa o SQLite para validar o login
      const user = await loginUsuario(email, password);

      if (user) {
        Alert.alert('Sucesso', `Bem-vindo(a), ${user.nome}!`);
        onNavigate('inicio', user);
      } else {
        Alert.alert('Erro', 'E-mail ou senha incorretos.');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao verificar os dados.');
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
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <View style={styles.container}>
            <Image
              source={require('../assets/logo-minifinderkids.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.subtitle}>Bem-vindo(a)!</Text>
            <Text style={styles.description}>
              Acesse sua conta para continuar cuidando de quem você ama.
            </Text>

            <View style={styles.inputContainer}>
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#999999"
                  value={password}
                  onChangeText={setPassword}
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
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Entrar</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => Alert.alert('Google', 'Integração futura.')}
            >
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Entrar com o Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onNavigate('cadastro')}>
              <Text style={styles.switchText}>
                Ainda não tem uma conta? <Text style={styles.switchLink}>Criar conta</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (mantenha os mesmos estilos que você já tem)
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  keyboardContainer: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingBottom: 60 },
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f5f7fa', paddingHorizontal: 25, paddingVertical: 20,
  },
  logo: { width: 300, height: 210, marginBottom: 5 },
  subtitle: { fontSize: 21, fontWeight: 'bold', color: '#333', marginTop: 5, marginBottom: 6 },
  description: {
    fontSize: 14, color: '#666', textAlign: 'center',
    lineHeight: 21, marginBottom: 18, paddingHorizontal: 15,
  },
  inputContainer: { width: '100%', marginTop: 5 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  input: {
    width: '100%', height: 52, backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd',
    fontSize: 16, color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', width: '100%', height: 52,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
  },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 15, fontSize: 16, color: '#333' },
  eyeButton: { paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
  button: {
    width: '100%', height: 52, backgroundColor: '#1E3A8A', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 12, color: '#777', fontSize: 13, fontWeight: '500' },
  googleButton: {
    flexDirection: 'row', width: '100%', height: 52, backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center', marginBottom: 22,
  },
  googleIcon: { width: 23, height: 23, marginRight: 10 },
  googleButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  switchText: { fontSize: 14, color: '#666', textAlign: 'center' },
  switchLink: { color: '#1E3A8A', fontWeight: 'bold' },
});