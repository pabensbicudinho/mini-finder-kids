import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { listarRotas, listarPerimetros, deletarRota } from '../database/db';
import { coordenadasParaEndereco } from '../services/cepService';

export default function RotaDetalhes({ userData, onNavigate, previousScreen }) {
  const insets = useSafeAreaInsets();
  const [rota, setRota] = useState(null);
  const [perimetro, setPerimetro] = useState(null);
  const [endereco, setEndereco] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const webMapRef = useRef(null);
  const webCircleRef = useRef(null);
  const webMapContainerRef = useRef(null);

  // ============================================================
  // DEFINIR TELA DE VOLTA
  // Volta para a tela anterior real (previousScreen).
  // Só cai no fallback se não houver previousScreen válido.
  // ============================================================
  const getTelaDeVolta = () => {
    // Se não veio de lugar nenhum, usa o padrão
    if (!previousScreen) {
      return 'perfilCrianca';
    }

    // Proteção: não voltar para ela mesma (evita loop)
    if (previousScreen === 'rotaDetalhes') {
      return 'perfilCrianca';
    }

    // Qualquer outra tela → volta para ela
    return previousScreen;
  };

  const handleVoltar = () => {
    const telaVolta = getTelaDeVolta();
    console.log('🔙 Voltando para:', telaVolta);
    onNavigate(telaVolta, userData);
  };

  // ============================================================
  // CARREGAR ROTA/PERÍMETRO DA CRIANÇA
  // ============================================================
  useEffect(() => {
    const carregarDados = async () => {
      try {
        if (!userData?.id) {
          setCarregando(false);
          return;
        }

        const rotas = await listarRotas(userData.id);
        const perimetros = await listarPerimetros(userData.id);

        let rotaEncontrada = null;
        let perimetroEncontrado = null;

        if (rotas && rotas.length > 0) {
          rotaEncontrada = rotas[rotas.length - 1];
        }

        if (perimetros && perimetros.length > 0) {
          perimetroEncontrado = perimetros[perimetros.length - 1];
        }

        // Se tem perímetro, usa ele como base
        if (perimetroEncontrado) {
          setPerimetro(perimetroEncontrado);
        } else if (rotaEncontrada) {
          setPerimetro({
            latitude: rotaEncontrada.latitudeDestino || rotaEncontrada.latitude_destino,
            longitude: rotaEncontrada.longitudeDestino || rotaEncontrada.longitude_destino,
            raio: rotaEncontrada.raio || 500,
            nome: rotaEncontrada.nome || 'Área Segura',
            cep: rotaEncontrada.cep || rotaEncontrada.cepDestino,
            logradouro: rotaEncontrada.logradouro,
            bairro: rotaEncontrada.bairro,
            cidade: rotaEncontrada.cidade,
            estado: rotaEncontrada.estado,
          });
        }

        if (rotaEncontrada) {
          setRota(rotaEncontrada);
        }

        // Busca endereço
        const lat = perimetroEncontrado?.latitude
          || rotaEncontrada?.latitudeDestino
          || rotaEncontrada?.latitude_destino;
        const lng = perimetroEncontrado?.longitude
          || rotaEncontrada?.longitudeDestino
          || rotaEncontrada?.longitude_destino;

        // Se a rota já tem os dados do endereço salvos, usa direto
        const enderecoSalvo = rotaEncontrada?.logradouro
          ? {
              logradouro: rotaEncontrada.logradouro,
              bairro: rotaEncontrada.bairro,
              cidade: rotaEncontrada.cidade,
              estado: rotaEncontrada.estado,
              cep: rotaEncontrada.cep || rotaEncontrada.cepDestino,
              enderecoCompleto: rotaEncontrada.enderecoCompleto,
            }
          : null;

        if (enderecoSalvo) {
          setEndereco(enderecoSalvo);
        } else if (lat && lng) {
          // Busca via API
          const resultado = await coordenadasParaEndereco(lat, lng);
          if (resultado.success) {
            setEndereco(resultado.endereco);
          } else {
            setEndereco({
              enderecoCompleto: `Lat: ${lat.toFixed(4)}, Long: ${lng.toFixed(4)}`,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar rota/perímetro:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [userData]);

  // ============================================================
  // DELETAR
  // ============================================================
  const handleDeletar = () => {
    Alert.alert(
      'Excluir área segura',
      'Tem certeza que deseja excluir esta área segura?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (rota?.id) await deletarRota(rota.id);
              Alert.alert('Sucesso', 'Área segura excluída.');
              // Após excluir, volta para a tela anterior real
              onNavigate(getTelaDeVolta(), userData);
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // HTML DO MAPA
  // ============================================================
  const gerarHTML = (lat, lng, raioMetros, nome) => {
    const nomeSeguro = String(nome || 'Área Segura').replace(/'/g, "\\'");
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

  // ============================================================
  // MAPA WEB
  // ============================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !perimetro || !webMapContainerRef.current) return;

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

        const lat = perimetro.latitude;
        const lng = perimetro.longitude;
        const raio = perimetro.raio || 500;

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

          L.marker([lat, lng])
            .addTo(webMapRef.current)
            .bindPopup(`<b>${perimetro.nome || 'Área Segura'}</b>`)
            .openPopup();
        }
      } catch (error) {
        console.error('Erro ao carregar mapa Web:', error);
      }
    };

    iniciarMapaWeb();
    return () => { ativo = false; };
  }, [perimetro]);

  useEffect(() => {
    return () => {
      if (webMapRef.current) {
        webMapRef.current.remove();
        webMapRef.current = null;
        webCircleRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // RENDERIZAR MAPA
  // ============================================================
  const renderMapa = () => {
    if (!perimetro) return null;

    const lat = perimetro.latitude;
    const lng = perimetro.longitude;
    const raio = perimetro.raio || 500;

    if (Platform.OS !== 'web') {
      return (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: gerarHTML(lat, lng, raio, perimetro.nome) }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      );
    }

    return <View ref={webMapContainerRef} style={styles.map} />;
  };

  // Carregando
  if (carregando) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      </SafeAreaView>
    );
  }

  // Sem perímetro
  if (!perimetro) {
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
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={60} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Nenhuma área segura</Text>
          <Text style={styles.emptySubtitle}>
            Crie uma área segura para monitorar o deslocamento da criança.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => onNavigate('novaRota', userData)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Criar área segura</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Com perímetro
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapContainer}>{renderMapa()}</View>

        {/* CAIXA DE ENDEREÇO */}
        <View style={styles.addressBox}>
          <View style={styles.addressHeader}>
            <View style={styles.addressIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#1E3A8A" />
            </View>
            <View style={styles.addressHeaderText}>
              <Text style={styles.addressTitle}>{perimetro.nome || 'Área Segura'}</Text>
              <Text style={styles.addressSubtitle}>Raio: {perimetro.raio || 500} metros</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.addressBody}>
            {/* Logradouro + Número */}
            {endereco?.logradouro ? (
              <View style={styles.addressLine}>
                <Ionicons name="home-outline" size={18} color="#1E3A8A" />
                <View style={styles.addressLineText}>
                  <Text style={styles.addressLineLabel}>Logradouro</Text>
                  <Text style={styles.addressLineValue}>
                    {endereco.logradouro}
                    {endereco.numero ? `, ${endereco.numero}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Bairro */}
            {endereco?.bairro ? (
              <View style={styles.addressLine}>
                <Ionicons name="map-outline" size={18} color="#1E3A8A" />
                <View style={styles.addressLineText}>
                  <Text style={styles.addressLineLabel}>Bairro</Text>
                  <Text style={styles.addressLineValue}>{endereco.bairro}</Text>
                </View>
              </View>
            ) : null}

            {/* Cidade + Estado */}
            {endereco?.cidade ? (
              <View style={styles.addressLine}>
                <Ionicons name="business-outline" size={18} color="#1E3A8A" />
                <View style={styles.addressLineText}>
                  <Text style={styles.addressLineLabel}>Cidade</Text>
                  <Text style={styles.addressLineValue}>
                    {endereco.cidade}
                    {endereco.estado ? ` - ${endereco.estado}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* CEP */}
            {endereco?.cep ? (
              <View style={styles.addressLine}>
                <Ionicons name="mail-outline" size={18} color="#1E3A8A" />
                <View style={styles.addressLineText}>
                  <Text style={styles.addressLineLabel}>CEP</Text>
                  <Text style={styles.addressLineValue}>{endereco.cep}</Text>
                </View>
              </View>
            ) : null}

            {/* Fallback */}
            {!endereco?.logradouro && !endereco?.cidade && endereco?.enderecoCompleto ? (
              <View style={styles.addressLine}>
                <Ionicons name="location-outline" size={18} color="#1E3A8A" />
                <View style={styles.addressLineText}>
                  <Text style={styles.addressLineLabel}>Endereço</Text>
                  <Text style={styles.addressLineValue}>{endereco.enderecoCompleto}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onNavigate('novaRota', userData)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={22} color="#1E3A8A" />
          <Text style={styles.editText}>Criar nova área segura</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeletar}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
          <Text style={styles.deleteText}>Excluir área segura</Text>
        </TouchableOpacity>
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
  headerSpacer: { width: 40 },
  backButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },
  scrollContent: { padding: 20, paddingBottom: 120 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', color: '#1E3A8A', marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    marginTop: 8, marginBottom: 25, lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E3A8A', paddingVertical: 15, paddingHorizontal: 25,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8,
  },

  mapContainer: {
    width: '100%', height: 250, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#E0F2FE', marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  map: { width: '100%', height: '100%' },

  addressBox: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  addressHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  addressIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  addressHeaderText: { flex: 1 },
  addressTitle: { fontSize: 16, fontWeight: '700', color: '#1E3A8A' },
  addressSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  addressBody: { paddingVertical: 4 },
  addressLine: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10,
  },
  addressLineText: { flex: 1, marginLeft: 10 },
  addressLineLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  addressLineValue: {
    fontSize: 14, color: '#1E3A8A', fontWeight: '600', marginTop: 2,
  },

  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#1E3A8A', backgroundColor: '#FFF',
    marginBottom: 12,
  },
  editText: {
    color: '#1E3A8A', fontSize: 15, fontWeight: '700', marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#FFF',
  },
  deleteText: {
    color: '#DC2626', fontSize: 15, fontWeight: '700', marginLeft: 8,
  },
});