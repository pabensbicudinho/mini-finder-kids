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

export default function Mapa({ userData, onNavigate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const insets = useSafeAreaInsets();

  const webMapRef = useRef(null);
  const webMarkerRef = useRef(null);
  const webMapContainerRef = useRef(null);

  const nomeCrianca = userData?.nome || 'Criança';

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
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permissão de localização negada.');
          }
          return;
        }

        const currentLocation =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

        if (isMounted) {
          setLocation(currentLocation.coords);
        }

        locationSubscription =
          await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 180000,
              distanceInterval: 10,
            },
            (newLocation) => {
              if (isMounted) {
                setLocation(newLocation.coords);
              }
            }
          );
      } catch (error) {
        console.error(
          'Erro ao obter localização:',
          error
        );

        if (isMounted) {
          setErrorMsg(
            'Não foi possível obter a localização.'
          );
        }
      }
    };

    iniciarLocalizacao();

    return () => {
      isMounted = false;

      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  /*
   * ============================================================
   * HTML DO MAPA PARA ANDROID / IOS
   * ============================================================
   */

  const gerarHTML = (lat, lng, nome) => {
    const nomeSeguro = String(nome)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ');

    return `
      <!DOCTYPE html>
      <html>
      <head>

        <meta
          name="viewport"
          content="width=device-width,
          initial-scale=1.0,
          maximum-scale=1.0,
          user-scalable=no"
        />

        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
        </script>

        <style>

          html,
          body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }

          #map {
            width: 100%;
            height: 100%;
          }

        </style>

      </head>

      <body>

        <div id="map"></div>

        <script>

          var latitude = ${lat};
          var longitude = ${lng};

          var map = L.map('map', {
            zoomControl: true
          }).setView(
            [latitude, longitude],
            16
          );

          L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap'
            }
          ).addTo(map);

          var marker = L.marker([
            latitude,
            longitude
          ]).addTo(map);

          marker.bindPopup(
            "<b>${nomeSeguro}</b><br>Localização atual"
          ).openPopup();

          /*
           * Recebe atualizações de localização
           * enviadas pelo React Native.
           */
          document.addEventListener(
            'message',
            function(event) {

              try {

                var data = JSON.parse(
                  event.data
                );

                if (
                  data.latitude &&
                  data.longitude
                ) {

                  var novaPosicao = [
                    data.latitude,
                    data.longitude
                  ];

                  marker.setLatLng(
                    novaPosicao
                  );

                  map.setView(
                    novaPosicao,
                    map.getZoom()
                  );

                  marker
                    .bindPopup(
                      "<b>${nomeSeguro}</b><br>Localização atual"
                    );

                }

              } catch (error) {

                console.error(
                  'Erro ao atualizar mapa:',
                  error
                );

              }

            }
          );

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
    if (
      Platform.OS !== 'web' &&
      location &&
      webMapRef.current
    ) {
      const mensagem = JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      webMapRef.current.postMessage(mensagem);
    }
  }, [location]);

  /*
   * ============================================================
   * MAPA WEB
   *
   * No navegador não usamos WebView.
   * O Leaflet é carregado diretamente na página.
   * ============================================================
   */

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !location ||
      !webMapContainerRef.current
    ) {
      return;
    }

    let ativo = true;

    const iniciarMapaWeb = async () => {
      try {
        /*
         * Importação dinâmica do Leaflet.
         *
         * Isso evita que o Leaflet seja carregado
         * durante a execução Android/iOS.
         */
        const L = await import('leaflet');

        /*
         * CSS do Leaflet.
         */
        if (
          !document.getElementById(
            'leaflet-css'
          )
        ) {
          const link =
            document.createElement('link');

          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href =
            'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

          document.head.appendChild(link);
        }

        if (!ativo) return;

        /*
         * Se o mapa ainda não existe,
         * cria o mapa.
         */
        if (!webMapRef.current) {
          webMapRef.current =
            L.map(
              webMapContainerRef.current
            ).setView(
              [
                location.latitude,
                location.longitude,
              ],
              16
            );

          L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              maxZoom: 19,
              attribution:
                '&copy; OpenStreetMap',
            }
          ).addTo(
            webMapRef.current
          );

          /*
           * Corrige os ícones do marcador
           * quando usado no Web.
           */
          delete L.Icon.Default.prototype
            ._getIconUrl;

          L.Icon.Default.mergeOptions({
            iconRetinaUrl:
              'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

            iconUrl:
              'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

            shadowUrl:
              'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });

          webMarkerRef.current =
            L.marker([
              location.latitude,
              location.longitude,
            ]).addTo(
              webMapRef.current
            );

          webMarkerRef.current
            .bindPopup(
              `<b>${nomeCrianca}</b><br/>Localização atual`
            )
            .openPopup();
        }

        /*
         * Atualiza posição do marcador.
         */
        if (webMarkerRef.current) {
          const novaPosicao = [
            location.latitude,
            location.longitude,
          ];

          webMarkerRef.current.setLatLng(
            novaPosicao
          );

          webMapRef.current.setView(
            novaPosicao,
            webMapRef.current.getZoom()
          );
        }
      } catch (error) {
        console.error(
          'Erro ao carregar mapa Web:',
          error
        );
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
    /*
     * Erro de localização
     */
    if (errorMsg) {
      return (
        <View style={styles.mapErrorContainer}>
          <Ionicons
            name="location-outline"
            size={40}
            color="#DC2626"
          />

          <Text style={styles.mapErrorText}>
            {errorMsg}
          </Text>
        </View>
      );
    }

    /*
     * Ainda buscando GPS
     */
    if (!location) {
      return (
        <View style={styles.mapLoadingContainer}>
          <Ionicons
            name="navigate-outline"
            size={36}
            color="#1E3A8A"
          />

          <Text style={styles.mapLoadingText}>
            Buscando sinal do GPS...
          </Text>
        </View>
      );
    }

    /*
     * ========================================================
     * ANDROID / IOS
     * ========================================================
     */

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
              nomeCrianca
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

    /*
     * ========================================================
     * WEB
     * ========================================================
     */

    return (
      <View
        ref={webMapContainerRef}
        style={styles.map}
      />
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
          onPress={() =>
            onNavigate('inicio')
          }
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color="#1A237E"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Localização
        </Text>

        <View
          style={styles.headerSpacer}
        />

      </View>


      {/* CARD DE SAUDAÇÃO */}

      <View style={styles.greetingCard}>

        <View style={styles.avatarCircle}>

          <Ionicons
            name="person"
            size={26}
            color="#1E3A8A"
          />

        </View>

        <View
          style={styles.greetingTextContainer}
        >

          <Text
            style={styles.greetingTitle}
          >
            Olá, {nomeCrianca} está
            seguro(a)!
          </Text>

          <Text
            style={styles.greetingSubtitle}
          >
            Última atualização: agora
          </Text>

        </View>

      </View>


      {/* MAPA */}

      <View style={styles.mapContainer}>

        {renderMapa()}

        {/* INFORMAÇÕES GPS */}

        <View style={styles.gpsInfo}>

          <Text
            style={styles.gpsInfoText}
          >
            {location
              ? `Lat: ${location.latitude.toFixed(
                  4
                )} | Long: ${location.longitude.toFixed(
                  4
                )}`
              : 'Aguardando GPS...'}
          </Text>

        </View>

      </View>


      {/* STATUS */}

      <View style={styles.statusRow}>

        <TouchableOpacity
          style={styles.statusItem}
          onPress={() =>
            onNavigate(
              'perfilCrianca',
              userData
            )
          }
          activeOpacity={0.7}
        >

          <View
            style={styles.statusIconCircle}
          >

            <Ionicons
              name="person-outline"
              size={24}
              color="#1E3A8A"
            />

          </View>

          <Text style={styles.statusText}>
            Perfil criança
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.statusItem}
          activeOpacity={0.7}
        >

          <View
            style={styles.statusIconCircle}
          >

            <Ionicons
              name="time-outline"
              size={24}
              color="#1E3A8A"
            />

          </View>

          <Text style={styles.statusText}>
            Ver histórico
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.statusItem}
          activeOpacity={0.7}
        >

          <View
            style={styles.statusIconCircle}
          >

            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#1E3A8A"
            />

          </View>

          <Text style={styles.statusText}>
            Área segura
          </Text>

        </TouchableOpacity>

      </View>


      {/* EMERGÊNCIA */}

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() =>
          Alert.alert(
            'Emergência',
            'Acionando...'
          )
        }
        activeOpacity={0.8}
      >

        <Ionicons
          name="call"
          size={20}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />

        <Text
          style={styles.emergencyButtonText}
        >
          Emergência
        </Text>

      </TouchableOpacity>


      {/* MENU INFERIOR */}

      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom:
              insets.bottom + 10,
          },
        ]}
      >

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            onNavigate('alerta')
          }
          activeOpacity={0.7}
        >

          <Ionicons
            name="notifications-outline"
            size={22}
            color="#9CA3AF"
          />

          <Text style={styles.navText}>
            Alertas
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            onNavigate('inicio')
          }
          activeOpacity={0.7}
        >

          <Ionicons
            name="home"
            size={22}
            color="#1E3A8A"
          />

          <Text
            style={styles.navTextActive}
          >
            Início
          </Text>

        </TouchableOpacity>


        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            onNavigate(
              'perfil',
              userData
            )
          }
          activeOpacity={0.7}
        >

          <Ionicons
            name="person-outline"
            size={22}
            color="#9CA3AF"
          />

          <Text style={styles.navText}>
            Perfil
          </Text>

        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}


/*
 * ==============================================================
 * ESTILOS
 * ==============================================================
 */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

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

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A237E',
  },

  headerSpacer: {
    width: 40,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  greetingTextContainer: {
    flex: 1,
  },

  greetingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },

  greetingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

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

  map: {
    width: '100%',
    height: '100%',
  },

  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
  },

  mapLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },

  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 20,
  },

  mapErrorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 8,
  },

  gpsInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor:
      'rgba(255, 255, 255, 0.9)',
    padding: 6,
    borderRadius: 8,
  },

  gpsInfoText: {
    fontSize: 10,
    color: '#333333',
    textAlign: 'center',
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  statusItem: {
    alignItems: 'center',
    width: 90,
  },

  statusIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  statusText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },

  emergencyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 5,
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },

  navText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  navTextActive: {
    fontSize: 11, // Arthur Bueno Steinbach passou por aqui, e disse que o código é uma bosta feito pelo deepseek
    color: '#1E3A8A',
    fontWeight: '700',
    marginTop: 2,
  },

});