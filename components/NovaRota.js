import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { cepParaCoordenadas } from '../services/cepService';
import { tracarRota } from '../services/rotaService';
import { salvarRota } from '../database/db';

const TELA_VOLTAR = 'mapa';

export default function NovaRota({ userData, onNavigate, previousScreen }) {
  const [cepDestino, setCepDestino] = useState('');
  const [nomeArea, setNomeArea] = useState('Escola');
  const [raio, setRaio] = useState(500);
  const [coordenadas, setCoordenadas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const webMapRef = useRef(null);
  const webCircleRef = useRef(null);
  const webMapContainerRef = useRef(null);

  const handleVoltar = () => {
    console.log('🔙 Voltando para:', TELA_VOLTAR);
    onNavigate(TELA_VOLTAR, userData);
  };

  const handleCep = (texto) => {
    let numeros = texto.replace(/\D/g, '');
    if (numeros.length > 8) numeros = numeros.slice(0, 8);

    let formatado = '';
    if (numeros.length > 0) formatado = numeros.slice(0, 5);
    if (numeros.length > 5) formatado += '-' + numeros.slice(5, 8);

    setCepDestino(formatado);
  };

  const buscarCoordenadas = async () => {
    if (!cepDestino || cepDestino.length < 9) {
      Alert.alert('Erro', 'Digite um CEP válido.');
      return;
    }

    setBuscando(true);

    try {
      console.log('🔍 Buscando CEP:', cepDestino);
      const resultado = await cepParaCoordenadas(cepDestino);

      if (resultado.success) {
        setCoordenadas({
          latitude: resultado.latitude,
          longitude: resultado.longitude,
          endereco: resultado.enderecoCompleto,
          cep: resultado.endereco.cep,
          logradouro: resultado.endereco.logradouro,
          bairro: resultado.endereco.bairro,
          cidade: resultado.endereco.cidade,
          estado: resultado.endereco.estado,
        });
        console.log('✅ Coordenadas aplicadas:', resultado.latitude, resultado.longitude);
      } else {
        Alert.alert('Erro', resultado.message || 'CEP não encontrado.');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar CEP:', error);
      Alert.alert('Erro', 'Não foi possível buscar o CEP.');
    } finally {
      setBuscando(false);
    }
  };

  const handleSalvar = async () => {
    if (!nomeArea) {
      Alert.alert('Erro', 'Digite um nome para a área.');
      return;
    }
    if (!coordenadas) {
      Alert.alert('Erro', 'Busque o CEP de destino primeiro.');
      return;
    }

    setCarregando(true);

    try {
      // 1) Pega localização atual (origem)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização negada.');
        setCarregando(false);
        return;
      }

      const posAtual = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const origem = {
        latitude: posAtual.coords.latitude,
        longitude: posAtual.coords.longitude,
      };

      const destino = {
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
      };

      // 2) Traça a rota real via OSRM
      console.log('🛣️ Traçando rota:', origem, '→', destino);
      const resultadoRota = await tracarRota(origem, destino);

      let polyline = [origem, destino];
      let distanciaMetros = 0;
      let duracaoSegundos = 0;

      if (resultadoRota.success) {
        polyline = resultadoRota.rota.coordenadas;
        distanciaMetros = resultadoRota.rota.distanciaMetros;
        duracaoSegundos = resultadoRota.rota.duracaoSegundos;
        console.log('✅ Rota traçada:', polyline.length, 'pontos');
      } else {
        console.warn('⚠️ Falha ao traçar rota, usando linha reta.');
      }

      const novaRota = {
        criancaId: userData?.id || 1,
        cepOrigem: '',
        cepDestino,
        nome: nomeArea,
        latitudeOrigem: origem.latitude,
        longitudeOrigem: origem.longitude,
        latitudeDestino: destino.latitude,
        longitudeDestino: destino.longitude,
        raio: parseInt(raio, 10),
        logradouro: coordenadas.logradouro || null,
        bairro: coordenadas.bairro || null,
        cidade: coordenadas.cidade || null,
        estado: coordenadas.estado || null,
        cep: coordenadas.cep || null,
        enderecoCompleto: coordenadas.endereco || null,
        coordenadas: polyline,
        distanciaMetros,
        duracaoSegundos,
      };

      console.log('💾 Salvando rota:', novaRota);
      const resultado = await salvarRota(novaRota);
      setCarregando(false);

      if (resultado.success) {
        Alert.alert(
          '✅ Rota criada!',
          `Nome: ${nomeArea}\nTrajeto: ${polyline.length} pontos\nDistância: ${Math.round(distanciaMetros)}m`,
          [
            {
              text: 'Ver detalhes',
              onPress: () => onNavigate('rotaDetalhes', userData, TELA_VOLTAR),
            },
            {
              text: 'Voltar',
              onPress: () => onNavigate(TELA_VOLTAR, userData),
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Erro', resultado.message || 'Não foi possível salvar.');
      }
    } catch (error) {
      setCarregando(false);
      console.error('❌ Erro em handleSalvar:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar.');
    }
  };

  const gerarHTML = (lat, lng, raioMetros, nome) => {
    const nomeSeguro = String(nome).replace(/'/g, "\\'");
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          L.circle([${lat}, ${lng}], {
            color: '#1E3A8A', fillColor: '#3B82F6', fillOpacity: 0.25, radius: ${raioMetros}
          }).addTo(map);
          L.marker([${lat}, ${lng}]).addTo(map).bindPopup("<b>${nomeSeguro}</b>").openPopup();
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !coordenadas || !webMapContainerRef.current) return;
    let ativo = true;

    const iniciarMapaWeb = async () => {
      try {
        const L = await import('leaflet');
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!ativo) return;

        const lat = coordenadas.latitude;
        const lng = coordenadas.longitude;

        if (!webMapRef.current) {
          webMapRef.current = L.map(webMapContainerRef.current, {
            zoomControl: false,
          }).setView([lat, lng], 15);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; OpenStreetMap',
          }).addTo(webMapRef.current);

          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });

          webCircleRef.current = L.circle([lat, lng], {
            color: '#1E3A8A', fillColor: '#3B82F6', fillOpacity: 0.25, radius: raio,
          }).addTo(webMapRef.current);

          L.marker([lat, lng]).addTo(webMapRef.current).bindPopup(`<b>${nomeArea}</b>`).openPopup();
        } else {
          webMapRef.current.setView([lat, lng], 15);
          if (webCircleRef.current) {
            webCircleRef.current.setLatLng([lat, lng]);
            webCircleRef.current.setRadius(raio);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar mapa Web:', error);
      }
    };

    iniciarMapaWeb();
    return () => { ativo = false; };
  }, [coordenadas, raio, nomeArea]);

  useEffect(() => {
    return () => {
      if (webMapRef.current) {
        webMapRef.current.remove();
        webMapRef.current = null;
        webCircleRef.current = null;
      }
    };
  }, []);

  const renderMapa = () => {
    if (!coordenadas) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="location-outline" size={40} color="#9CA3AF" />
          <Text style={styles.mapPlaceholderText}>
            Digite o CEP e busque no mapa
          </Text>
        </View>
      );
    }

    if (Platform.OS !== 'web') {
      return (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: gerarHTML(coordenadas.latitude, coordenadas.longitude, raio, nomeArea) }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      );
    }

    return <View ref={webMapContainerRef} style={styles.map} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleVoltar}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Área segura</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mapContainer}>{renderMapa()}</View>

          <Text style={styles.label}>Nome da área</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Escola da Ana"
            placeholderTextColor="#9CA3AF"
            value={nomeArea}
            onChangeText={setNomeArea}
          />

          <Text style={styles.label}>CEP de destino</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="00000-000"
              placeholderTextColor="#9CA3AF"
              value={cepDestino}
              onChangeText={handleCep}
              keyboardType="numeric"
              maxLength={9}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={buscarCoordenadas}
              disabled={buscando}
            >
              {buscando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Raio da área</Text>
          <View style={styles.raioRow}>
            <Text style={styles.raioValue}>{raio} m</Text>
            <TouchableOpacity
              style={styles.raioButton}
              onPress={() => setRaio(Math.max(100, raio - 100))}
            >
              <Ionicons name="remove" size={20} color="#1E3A8A" />
            </TouchableOpacity>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${Math.min(100, ((raio - 100) / 1900) * 100)}%` },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.raioButton}
              onPress={() => setRaio(Math.min(2000, raio + 100))}
            >
              <Ionicons name="add" size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, carregando && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={carregando}
          >
            {carregando ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Salvar área segura</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerSpacer: { width: 40 },
  backButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },

  mapContainer: {
    width: '100%', height: 250, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#E0F2FE', marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 10,
  },

  label: {
    fontSize: 14, fontWeight: '600', color: '#333333',
    marginBottom: 6, marginTop: 10,
  },
  input: {
    width: '100%', height: 52, backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB',
    fontSize: 16, color: '#333333',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchButton: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: '#1E3A8A',
    justifyContent: 'center', alignItems: 'center',
  },

  raioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  raioValue: { fontSize: 14, fontWeight: '700', color: '#1E3A8A', width: 60 },
  raioButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center',
  },
  sliderTrack: {
    flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden',
  },
  sliderFill: { height: '100%', backgroundColor: '#1E3A8A' },

  button: {
    width: '100%', height: 52, backgroundColor: '#1E3A8A', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginTop: 30,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
});