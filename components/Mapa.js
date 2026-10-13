import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import {
  salvarLocalizacao,
  verificarPerimetro,
  listarLocalizacoes,
  listarPerimetros,
  listarRotas,
} from '../database/db';
import {
  treinarModelo,
  analisarPosicao,
  analisarRota,
} from '../services/iaService';

export default function Mapa({ userData, onNavigate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 🧠 Estados da IA
  const [iaInicializada, setIaInicializada] = useState(false);
  const [alertaDisparado, setAlertaDisparado] = useState(false);
  const [statusRota, setStatusRota] = useState(null);

  const insets = useSafeAreaInsets();

  const webMapRef = useRef(null);
  const webMarkerRef = useRef(null);
  const webMapContainerRef = useRef(null);

  // 🧠 Refs
  const iaModeloRef = useRef({ modelo: null, perimetros: [] });
  const rotaRef = useRef(null);

  const nomeCrianca = userData?.nome || 'Criança';

  /*
   * ============================================================
   * 🧠 IA: TREINAR MODELO + CARREGAR ROTA AO ABRIR A TELA
   * ============================================================
   */
  useEffect(() => {
    let ativo = true;

    const inicializarIA = async () => {
      if (!userData?.id) return;

      try {
        console.log('🧠 Inicializando IA preditiva...');

        const [historico, perimetros, rotas] = await Promise.all([
          listarLocalizacoes(userData.id),
          listarPerimetros(userData.id),
          listarRotas(userData.id),
        ]);

        const modelo = treinarModelo(historico || []);
        console.log('🧠 Modelo treinado:', {
          treinado: modelo.treinado,
          mediaDistancia: modelo.mediaDistancia,
          desvioPadrao: modelo.desvioPadrao,
          limiarAnomalia: modelo.limiarAnomalia,
          locaisHabituais: modelo.locaisHabituais?.length || 0,
          totalRegistros: modelo.totalRegistros,
        });

        if (!ativo) return;

        iaModeloRef.current = { modelo, perimetros: perimetros || [] };

        // 🛣️ Carrega a última rota (se existir)
        if (rotas && rotas.length > 0) {
          const ultimaRota = rotas[rotas.length - 1];
          rotaRef.current = ultimaRota;
          console.log('🛣️ Rota carregada:', {
            nome: ultimaRota.nome,
            pontos: ultimaRota.coordenadas?.length || 0,
          });
        }

        setIaInicializada(true);
      } catch (error) {
        console.error('❌ Erro ao inicializar IA:', error);
      }
    };

    inicializarIA();

    return () => {
      ativo = false;
    };
  }, [userData]);

  /*
   * ============================================================
   * LOCALIZAÇÃO
   * ============================================================
   */
  useEffect(() => {
    let locationSubscription = null;
    let isMounted = true;

    const iniciarLocalizacao = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) setErrorMsg('Permissão de localização negada.');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setLocation(currentLocation.coords);

          if (userData?.id) {
            await salvarLocalizacao(
              userData.id,
              currentLocation.coords.latitude,
              currentLocation.coords.longitude
            );
          }
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 180000,
            distanceInterval: 10,
          },
          async (newLocation) => {
            if (!isMounted) return;

            setLocation(newLocation.coords);

            if (!userData?.id) return;

            await salvarLocalizacao(
              userData.id,
              newLocation.coords.latitude,
              newLocation.coords.longitude
            );

            const posicaoAtual = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };

            const { modelo, perimetros } = iaModeloRef.current;

            // Análise comportamental
            const analiseComportamento = analisarPosicao({
              posicaoAtual,
              modelo,
              perimetros,
            });

            // 🛣️ Análise de rota
            const analiseRota = analisarRota({
              posicaoAtual,
              rota: rotaRef.current,
            });

            console.log('🧠 Análise Comportamento:', analiseComportamento);
            console.log('🛣️ Análise Rota:', analiseRota);

            // Atualiza status visual da rota
            setStatusRota(analiseRota.status);

            const desviou = analiseRota.status === 'desviou_rota';

            if ((analiseComportamento.anomalia || desviou) && !alertaDisparado) {
              setAlertaDisparado(true);

              const motivo = desviou
                ? analiseRota.motivo
                : analiseComportamento.motivo;

              Alert.alert(
                '⚠️ Alerta de Segurança',
                motivo || `${userData.nome} saiu do trajeto seguro.`,
                [
                  { text: 'Ficar aqui', style: 'cancel' },
                  {
                    text: 'Ver alerta',
                    onPress: () => onNavigate('alerta', userData),
                  },
                ]
              );
            }
          }
        );
      } catch (error) {
        console.error('Erro ao obter localização:', error);
        if (isMounted) setErrorMsg('Não foi possível obter a localização.');
      }
    };

    iniciarLocalizacao();

    return () => {
      isMounted = false;
      if (locationSubscription) locationSubscription.remove();
    };
  }, [userData, alertaDisparado]);

  /*
   * ============================================================
   * 🧠 IA: ANALISAR QUANDO A LOCALIZAÇÃO MUDA (reforço)
   * ============================================================
   */
  useEffect(() => {
    if (!location || !iaInicializada || alertaDisparado) return;

    const { modelo, perimetros } = iaModeloRef.current;

    const analiseComportamento = analisarPosicao({
      posicaoAtual: location,
      modelo,
      perimetros,
    });

    const analiseRota = analisarRota({
      posicaoAtual: location,
      rota: rotaRef.current,
    });

    setStatusRota(analiseRota.status);

    const desviou = analiseRota.status === 'desviou_rota';

    if (analiseComportamento.anomalia || desviou) {
      setAlertaDisparado(true);

      const motivo = desviou
        ? analiseRota.motivo
        : analiseComportamento.motivo;

      Alert.alert(
        '⚠️ Alerta de Segurança',
        motivo || `${nomeCrianca} saiu do trajeto seguro.`,
        [
          { text: 'Ficar aqui', style: 'cancel' },
          {
            text: 'Ver alerta',
            onPress: () => onNavigate('alerta', userData),
          },
        ]
      );
    }
  }, [location, iaInicializada, alertaDisparado]);

  /*
   * ============================================================
   * HTML DO MAPA PARA ANDROID / IOS
   * ============================================================
   */
  const gerarHTML = (lat, lng, nome, rota) => {
    const nomeSeguro = String(nome)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ');

    // Polyline da rota (se existir)
    let rotaJS = '';
    if (rota && rota.coordenadas && rota.coordenadas.length > 0) {
      const pontos = JSON.stringify(
        rota.coordenadas.map((p) => [p.latitude, p.longitude])
      );
      rotaJS = `
        var pontosRota = ${pontos};
        var polyline = L.polyline(pontosRota, {
          color: '#1E3A8A', weight: 5, opacity: 0.7, dashArray: '8, 8'
        }).addTo(map);
      `;
    }

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
          var latitude = ${lat};
          var longitude = ${lng};

          var map = L.map('map', { zoomControl: true }).setView([latitude, longitude], 15);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);

          ${rotaJS}

          var marker = L.marker([latitude, longitude]).addTo(map);
          marker.bindPopup("<b>${nomeSeguro}</b><br>Localização atual").openPopup();

          document.addEventListener('message', function(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.latitude && data.longitude) {
                var novaPosicao = [data.latitude, data.longitude];
                marker.setLatLng(novaPosicao);
                map.setView(novaPosicao, map.getZoom());
              }
            } catch (error) {
              console.error('Erro ao atualizar mapa:', error);
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  /*
   * ============================================================
   * ATUALIZA MAPA NATIVO
   * ============================================================
   */
  useEffect(() => {
    if (Platform.OS !== 'web' && location && webMapRef.current) {
      const mensagem = JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      webMapRef.current.postMessage(mensagem);
    }
  }, [location]);

  /*
   * ============================================================
   * MAPA WEB (com rota)
   * ============================================================
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || !location || !webMapContainerRef.current) {
      return;
    }

    let ativo = true;
    let polylineRef = null;

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

        if (!webMapRef.current) {
          webMapRef.current = L.map(webMapContainerRef.current).setView(
            [location.latitude, location.longitude],
            15
          );

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
          }).addTo(webMapRef.current);

          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });

          // 🛣️ Rota
          const rota = rotaRef.current;
          if (rota && rota.coordenadas && rota.coordenadas.length > 0) {
            const pontos = rota.coordenadas.map((p) => [p.latitude, p.longitude]);
            polylineRef = L.polyline(pontos, {
              color: '#1E3A8A', weight: 5, opacity: 0.7, dashArray: '8, 8',
            }).addTo(webMapRef.current);
          }

          webMarkerRef.current = L.marker([location.latitude, location.longitude]).addTo(webMapRef.current);
          webMarkerRef.current.bindPopup(`<b>${nomeCrianca}</b><br/>Localização atual`).openPopup();
        }

        if (webMarkerRef.current) {
          const novaPosicao = [location.latitude, location.longitude];
          webMarkerRef.current.setLatLng(novaPosicao);
          webMapRef.current.setView(novaPosicao, webMapRef.current.getZoom());
        }
      } catch (error) {
        console.error('Erro ao carregar mapa Web:', error);
      }
    };

    iniciarMapaWeb();

    return () => {
      ativo = false;
    };
  }, [location, nomeCrianca]);

  /*
   * ============================================================
   * LIMPEZA DO MAPA WEB
   * ============================================================
   */
  useEffect(() => {
    return () => {
      if (webMapRef.current) {
        webMapRef.current.remove();
        webMapRef.current = null;
        webMarkerRef.current = null;
      }
    };
  }, []);

  /*
   * ============================================================
   * RENDERIZAÇÃO DO MAPA
   * ============================================================
   */
  const renderMapa = () => {
    if (errorMsg) {
      return (
        <View style={styles.mapErrorContainer}>
          <Ionicons name="location-outline" size={40} color="#DC2626" />
          <Text style={styles.mapErrorText}>{errorMsg}</Text>
        </View>
      );
    }

    if (!location) {
      return (
        <View style={styles.mapLoadingContainer}>
          <Ionicons name="navigate-outline" size={36} color="#1E3A8A" />
          <Text style={styles.mapLoadingText}>Buscando sinal do GPS...</Text>
        </View>
      );
    }

    if (Platform.OS !== 'web') {
      return (
        <WebView
          ref={webMapRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{
            html: gerarHTML(
              location.latitude,
              location.longitude,
              nomeCrianca,
              rotaRef.current
            ),
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      );
    }

    return <View ref={webMapContainerRef} style={styles.map} />;
  };

  /*
   * ============================================================
   * BADGE DE STATUS DA ROTA
   * ============================================================
   */
  const renderStatusRota = () => {
    if (!statusRota) return null;

    const config = {
      seguindo_rota: { cor: '#10B981', icone: 'checkmark-circle', texto: 'Seguindo rota' },
      chegou_destino: { cor: '#1E3A8A', icone: 'flag', texto: 'Chegou ao destino' },
      saiu_origem: { cor: '#6B7280', icone: 'home', texto: 'No ponto de partida' },
      desviou_rota: { cor: '#DC2626', icone: 'warning', texto: 'Desviou da rota' },
      sem_rota: null,
    };

    const info = config[statusRota];
    if (!info) return null;

    return (
      <View style={[styles.rotaBadge, { backgroundColor: info.cor }]}>
        <Ionicons name={info.icone} size={14} color="#FFF" />
        <Text style={styles.rotaBadgeText}>{info.texto}</Text>
      </View>
    );
  };

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('inicio')}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Localização</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* CARD DE SAUDAÇÃO */}
      <View style={styles.greetingCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={26} color="#1E3A8A" />
        </View>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>
            Olá, {nomeCrianca} está seguro(a)!
          </Text>
          <Text style={styles.greetingSubtitle}>Última atualização: agora</Text>
        </View>
      </View>

      {/* MAPA */}
      <View style={styles.mapContainer}>
        {renderMapa()}

        {/* Badge de status da rota */}
        {renderStatusRota()}

        <View style={styles.gpsInfo}>
          <Text style={styles.gpsInfoText}>
            {location
              ? `Lat: ${location.latitude.toFixed(4)} | Long: ${location.longitude.toFixed(4)}`
              : 'Aguardando GPS...'}
          </Text>
        </View>
      </View>

      {/* STATUS - LINHA 1 */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => onNavigate('perfilCrianca', userData)}
          activeOpacity={0.7}
        >
          <View style={styles.statusIconCircle}>
            <Ionicons name="person-outline" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.statusText}>Perfil criança</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => onNavigate('historicoCrianca', userData)}
          activeOpacity={0.7}
        >
          <View style={styles.statusIconCircle}>
            <Ionicons name="time-outline" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.statusText}>Ver histórico</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => onNavigate('novaRota', userData)}
          activeOpacity={0.7}
        >
          <View style={styles.statusIconCircle}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.statusText}>Área segura</Text>
        </TouchableOpacity>
      </View>

      {/* STATUS - LINHA 2 */}
      <View style={styles.statusRowSecondary}>
        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => onNavigate('historicoMicrofone', userData)}
          activeOpacity={0.7}
        >
          <View style={styles.statusIconCircle}>
            <Ionicons name="mic-outline" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.statusText}>Microfone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statusItem}
          onPress={() => onNavigate('historicoCamera', userData)}
          activeOpacity={0.7}
        >
          <View style={styles.statusIconCircle}>
            <Ionicons name="camera-outline" size={24} color="#1E3A8A" />
          </View>
          <Text style={styles.statusText}>Câmera</Text>
        </TouchableOpacity>
      </View>

      {/* MENU INFERIOR */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('alerta')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Alertas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('inicio')}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={22} color="#1E3A8A" />
          <Text style={styles.navTextActive}>Início</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onNavigate('perfil')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  headerSpacer: { width: 40 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  avatarCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  greetingTextContainer: { flex: 1 },
  greetingTitle: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
  greetingSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  mapContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#E0F2FE',
    position: 'relative',
  },
  map: { width: '100%', height: '100%' },
  mapLoadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2FE',
  },
  mapLoadingText: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  mapErrorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 20,
  },
  mapErrorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginTop: 8 },
  gpsInfo: {
    position: 'absolute',
    bottom: 10, left: 10, right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 6, borderRadius: 8,
  },
  gpsInfoText: { fontSize: 10, color: '#333333', textAlign: 'center' },

  // Badge de status da rota
  rotaBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  rotaBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  statusRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statusItem: { alignItems: 'center', width: 90 },
  statusIconCircle: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 5,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  statusText: { fontSize: 12, color: '#4B5563', fontWeight: '500', textAlign: 'center' },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  navTextActive: { fontSize: 11, color: '#1E3A8A', fontWeight: '700', marginTop: 2 },
});