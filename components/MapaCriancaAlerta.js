import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

export default function MapaCriancaAlerta({ userData, onNavigate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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

  const nomeCrianca = userData?.nome || 'Criança';

  // HTML que será renderizado no WebView (Leaflet + OpenStreetMap)
  const gerarHTML = (lat, lng, nome) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${lat}, ${lng}], 16);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
        var marker = L.marker([${lat}, ${lng}]).addTo(map);
        marker.bindPopup("<b>${nome}</b><br>Localização do alerta").openPopup();
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com seta que volta para o Alerta */}
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

      {/* Mapa Real (OpenStreetMap via Leaflet) */}
      <View style={styles.mapContainer}>
        {errorMsg ? (
          <View style={styles.mapErrorContainer}>
            <Text style={styles.mapErrorText}>{errorMsg}</Text>
          </View>
        ) : location ? (
          <WebView
            style={styles.map}
            originWhitelist={['*']}
            source={{ html: gerarHTML(location.latitude, location.longitude, nomeCrianca) }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
          />
        ) : (
          <View style={styles.mapLoadingContainer}>
            <Text style={styles.mapLoadingText}>Buscando sinal do GPS...</Text>
          </View>
        )}

        {/* Informações do GPS (sobrepostas ao mapa) */}
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
  mapLoadingText: { fontSize: 13, color: '#6B7280' },
  mapErrorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 20,
  },
  mapErrorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  gpsInfo: {
    position: 'absolute',
    bottom: 10, left: 10, right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 6, borderRadius: 8,
  },
  gpsInfoText: { fontSize: 10, color: '#333333', textAlign: 'center' },
});