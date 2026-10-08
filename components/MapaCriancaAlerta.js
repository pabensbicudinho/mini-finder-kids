import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapaCriancaAlerta({ userData, onNavigate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          if (isMounted) setErrorMsg('Permissão de localização negada.');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) setLocation(currentLocation.coords);

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 180000,
            distanceInterval: 10,
          },
          (newLocation) => {
            if (isMounted) setLocation(newLocation.coords);
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

          var map = L.map('map', { zoomControl: true }).setView([latitude, longitude], 16);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
          }).addTo(map);

          var marker = L.marker([latitude, longitude]).addTo(map);
          marker.bindPopup("<b>${nomeSeguro}</b><br>Localização do alerta").openPopup();

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
   * MAPA WEB
   * ============================================================
   */

  useEffect(() => {
    if (Platform.OS !== 'web' || !location || !webMapContainerRef.current) {
      return;
    }

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

        if (!webMapRef.current) {
          webMapRef.current = L.map(webMapContainerRef.current).setView(
            [location.latitude, location.longitude],
            16
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

          webMarkerRef.current = L.marker([location.latitude, location.longitude]).addTo(webMapRef.current);
          webMarkerRef.current
            .bindPopup(`<b>${nomeCrianca}</b><br/>Localização do alerta`)
            .openPopup();
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
          source={{ html: gerarHTML(location.latitude, location.longitude, nomeCrianca) }}
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
   * INTERFACE
   * ============================================================
   */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigate('alerta', userData)}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mapa</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* MAPA */}
      <View style={styles.mapContainer}>
        {renderMapa()}

        <View style={styles.gpsInfo}>
          <Text style={styles.gpsInfoText}>
            {location
              ? `Lat: ${location.latitude.toFixed(4)} | Long: ${location.longitude.toFixed(4)}`
              : 'Aguardando GPS...'}
          </Text>
        </View>
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
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  headerSpacer: { width: 40 },
  backButton: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'flex-start',
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
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
});