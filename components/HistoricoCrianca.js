import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert, AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { listarLocalizacoes, listarRotas, limparHistorico } from '../database/db';
import { coordenadasParaEndereco } from '../services/cepService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔑 Tela de retorno fixa
const TELA_VOLTAR = 'mapa';

// 🔑 Versão do cache — aumente quando mudar o formato do endereço
const CACHE_VERSION = 'v2';
const CACHE_KEY = `@cache_enderecos_${CACHE_VERSION}`;

// 🔑 Intervalo de atualização automática (3 minutos)
const INTERVALO_ATUALIZACAO = 180000;

export default function HistoricoCrianca({ userData, onNavigate, previousScreen }) {
  const insets = useSafeAreaInsets();
  const [localizacoes, setLocalizacoes] = useState([]);
  const [rota, setRota] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('hoje');

  const webMapRef = useRef(null);
  const webPolylineRef = useRef(null);
  const webMapContainerRef = useRef(null);

  const [enderecos, setEnderecos] = useState({});
  const buscandoRef = useRef(new Set());

  // ============================================================
  // FUNÇÃO AUXILIAR: FILTRAR 1 REGISTRO A CADA 3 MINUTOS
  // Compara com o registro ANTERIOR na ordem cronológica,
  // garantindo que pontos consecutivos tenham >= 3 min de diferença
  // ============================================================
  const filtrar3Minutos = (locs) => {
    // Ordena do mais recente para o mais antigo
    const locsOrdenadas = (locs || []).sort((a, b) => {
      const dataA = new Date(a.data_hora || a.dataHora);
      const dataB = new Date(b.data_hora || b.dataHora);
      return dataB - dataA;
    });

    const locsFiltradas = [];
    let ultimaAceita = null;

    for (const loc of locsOrdenadas) {
      const dataAtual = new Date(loc.data_hora || loc.dataHora);

      if (
        !ultimaAceita ||
        (ultimaAceita - dataAtual) >= INTERVALO_ATUALIZACAO
      ) {
        locsFiltradas.push(loc);
        ultimaAceita = dataAtual;
      }
    }

    return locsFiltradas;
  };

  // ============================================================
  // VOLTAR SEMPRE PARA O MAPA
  // ============================================================
  const handleVoltar = () => {
    console.log('🔙 Voltando para:', TELA_VOLTAR);
    onNavigate(TELA_VOLTAR, userData);
  };

  // ============================================================
  // APAGAR HISTÓRICO
  // ============================================================
  const handleLimparHistorico = () => {
    Alert.alert(
      'Apagar histórico',
      'Isso vai apagar TODAS as localizações e rotas. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await limparHistorico();
              await AsyncStorage.removeItem(CACHE_KEY);
              await AsyncStorage.removeItem('@cache_enderecos');

              setLocalizacoes([]);
              setRota(null);
              setEnderecos({});

              Alert.alert('Sucesso', 'Histórico apagado!');
            } catch (error) {
              console.error(error);
              Alert.alert('Erro', 'Não foi possível apagar.');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // CARREGAR CACHE DE ENDEREÇOS DO ASYNCSTORAGE
  // ============================================================
  useEffect(() => {
    const carregarCache = async () => {
      try {
        const cache = await AsyncStorage.getItem(CACHE_KEY);
        if (cache) {
          const parsed = JSON.parse(cache);
          console.log('💾 Cache de endereços carregado:', Object.keys(parsed).length);
          setEnderecos(parsed);
        }
      } catch (error) {
        console.error('Erro ao carregar cache:', error);
      }
    };
    carregarCache();
  }, []);

  // ============================================================
  // SALVAR CACHE DE ENDEREÇOS NO ASYNCSTORAGE
  // ============================================================
  useEffect(() => {
    const salvarCache = async () => {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(enderecos));
      } catch (error) {
        console.error('Erro ao salvar cache:', error);
      }
    };
    if (Object.keys(enderecos).length > 0) {
      salvarCache();
    }
  }, [enderecos]);

  // ============================================================
  // CARREGAR LOCALIZAÇÕES E ROTA (função reutilizável)
  // ============================================================
  const carregarDados = async () => {
    if (!userData?.id) return;

    try {
      const [locs, rotas] = await Promise.all([
        listarLocalizacoes(userData.id),
        listarRotas(userData.id),
      ]);

      const locsFiltradas = filtrar3Minutos(locs || []);

      console.log(
        `📊 Registros: ${(locs || []).length} → ${locsFiltradas.length} (filtrado para 3 min)`
      );

      setLocalizacoes(locsFiltradas);

      if (rotas && rotas.length > 0) {
        setRota(rotas[rotas.length - 1]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  // ============================================================
  // CARREGAMENTO INICIAL
  // ============================================================
  useEffect(() => {
    const inicial = async () => {
      setCarregando(true);
      await carregarDados();
      setCarregando(false);
    };
    inicial();
  }, [userData]);

  // ============================================================
  // ATUALIZAÇÃO AUTOMÁTICA A CADA 3 MINUTOS
  // ============================================================
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 Atualizando histórico automaticamente...');
      await carregarDados();
      console.log('✅ Histórico atualizado');
    }, INTERVALO_ATUALIZACAO);

    return () => clearInterval(interval);
  }, [userData]);

  // ============================================================
  // REVALIDAR QUANDO O APP VOLTA AO PRIMEIRO PLANO
  // ============================================================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log('📱 App voltou ao primeiro plano — revalidando...');
        carregarDados();
      }
    });

    return () => subscription.remove();
  }, [userData]);

  // ============================================================
  // BUSCAR ENDEREÇOS DAS LOCALIZAÇÕES
  // ============================================================
  useEffect(() => {
    let ativo = true;

    const buscarEnderecos = async () => {
      const novosEnderecos = { ...enderecos };

      for (const loc of localizacoes) {
        if (!ativo) return;

        const chave = `${loc.latitude},${loc.longitude}`;

        if (
          novosEnderecos[chave] !== undefined ||
          buscandoRef.current.has(chave)
        ) {
          continue;
        }

        buscandoRef.current.add(chave);

        try {
          console.log('🔍 Buscando:', chave);
          const resultado = await coordenadasParaEndereco(loc.latitude, loc.longitude);

          if (resultado.success) {
            console.log('🔎 Estrutura do endereço:', JSON.stringify(resultado.endereco));
            novosEnderecos[chave] = resultado.endereco;
          } else {
            console.log('❌ Endereço não encontrado:', chave, resultado.message);
            novosEnderecos[chave] = null;
          }

          setEnderecos({ ...novosEnderecos });

          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (error) {
          console.error('❌ Erro ao buscar endereço:', error);
          novosEnderecos[chave] = null;
          setEnderecos({ ...novosEnderecos });
        } finally {
          buscandoRef.current.delete(chave);
        }
      }
    };

    if (localizacoes.length > 0) {
      buscarEnderecos();
    }

    return () => {
      ativo = false;
    };
  }, [localizacoes]);

  // ============================================================
  // FILTRAR POR PERÍODO
  // ============================================================
  const filtrarPorPeriodo = (locs) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    return locs.filter((loc) => {
      const data = new Date(loc.data_hora || loc.dataHora);
      if (filtro === 'hoje') return data >= hoje;
      if (filtro === 'ontem') return data >= ontem && data < hoje;
      if (filtro === '7dias') return data >= seteDiasAtras;
      return true;
    });
  };

  const localizacoesFiltradas = filtrarPorPeriodo(localizacoes);

  // ============================================================
  // FORMATAR HORA (HH:MM)
  // ============================================================
  const formatarHora = (dataHora) => {
    if (!dataHora) return '--:--';
    const data = new Date(dataHora);
    const hh = String(data.getHours()).padStart(2, '0');
    const mm = String(data.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // ============================================================
  // PEGAR ENDEREÇO DO CACHE
  // ============================================================
  const getEndereco = (loc) => {
    const chave = `${loc.latitude},${loc.longitude}`;
    return enderecos[chave];
  };

  // ============================================================
  // NORMALIZAR ENDEREÇO
  // ============================================================
  const normalizarEndereco = (end) => {
    if (!end) return null;

    const logradouro =
      end.logradouro || end.road || end.street ||
      end.address?.road || end.address?.pedestrian || '';

    const numero =
      end.numero || end.house_number ||
      end.address?.house_number || '';

    const bairro =
      end.bairro || end.suburb || end.neighbourhood ||
      end.city_district || end.address?.suburb ||
      end.address?.neighbourhood || '';

    const cidade =
      end.cidade || end.city || end.town || end.village ||
      end.municipality || end.address?.city ||
      end.address?.town || end.address?.village || '';

    const estado =
      end.estado || end.state || end.state_code ||
      end.address?.state || end.address?.state_code || '';

    const cep =
      end.cep || end.postcode || end.address?.postcode || '';

    return { logradouro, numero, bairro, cidade, estado, cep };
  };

  // ============================================================
  // HTML DO MAPA
  // ============================================================
  const gerarHTML = (coordenadas, rota) => {
    if (!coordenadas || coordenadas.length === 0) {
      return `<html><body style="display:flex;justify-content:center;align-items:center;height:100%;color:#9CA3AF;font-family:sans-serif;">Sem localizações</body></html>`;
    }

    const ultima = coordenadas[0];
    const pontos = coordenadas.map((l) => [l.latitude, l.longitude]);
    const pontosStr = JSON.stringify(pontos);

    const rotaStr = rota
      ? `L.circle([${rota.latitudeDestino || rota.latitude_destino}, ${rota.longitudeDestino || rota.longitude_destino}], {
          color: '#1E3A8A', fillColor: '#3B82F6', fillOpacity: 0.15, radius: ${rota.raio || 500}
        }).addTo(map);`
      : '';

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
          var map = L.map('map', { zoomControl: false }).setView([${ultima.latitude}, ${ultima.longitude}], 14);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; OpenStreetMap'
          }).addTo(map);
          ${rotaStr}
          var pontos = ${pontosStr};
          var polyline = L.polyline(pontos, {
            color: '#1E3A8A', weight: 4, opacity: 0.8
          }).addTo(map);
          L.marker(pontos[pontos.length - 1]).addTo(map);
          L.marker(pontos[0]).addTo(map);
          map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
        </script>
      </body>
      </html>
    `;
  };

  // ============================================================
  // MAPA WEB
  // ============================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !localizacoesFiltradas.length || !webMapContainerRef.current) return;

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

        const pontos = localizacoesFiltradas.map((l) => [l.latitude, l.longitude]);

        if (!webMapRef.current) {
          webMapRef.current = L.map(webMapContainerRef.current, {
            zoomControl: false,
          }).setView(pontos[0], 14);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; OpenStreetMap',
          }).addTo(webMapRef.current);

          if (rota) {
            L.circle(
              [rota.latitudeDestino || rota.latitude_destino, rota.longitudeDestino || rota.longitude_destino],
              {
                color: '#1E3A8A', fillColor: '#3B82F6', fillOpacity: 0.15, radius: rota.raio || 500,
              }
            ).addTo(webMapRef.current);
          }

          webPolylineRef.current = L.polyline(pontos, {
            color: '#1E3A8A', weight: 4, opacity: 0.8,
          }).addTo(webMapRef.current);

          L.marker(pontos[pontos.length - 1]).addTo(webMapRef.current);
          L.marker(pontos[0]).addTo(webMapRef.current);

          webMapRef.current.fitBounds(webPolylineRef.current.getBounds(), { padding: [20, 20] });
        } else {
          if (webPolylineRef.current) {
            webPolylineRef.current.setLatLngs(pontos);
            webMapRef.current.fitBounds(webPolylineRef.current.getBounds(), { padding: [20, 20] });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar mapa Web:', error);
      }
    };

    iniciarMapaWeb();
    return () => { ativo = false; };
  }, [localizacoesFiltradas, rota]);

  useEffect(() => {
    return () => {
      if (webMapRef.current) {
        webMapRef.current.remove();
        webMapRef.current = null;
        webPolylineRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // RENDERIZAR MAPA
  // ============================================================
  const renderMapa = () => {
    if (carregando) {
      return (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.mapPlaceholderText}>Carregando mapa...</Text>
        </View>
      );
    }

    if (!localizacoesFiltradas.length) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={40} color="#9CA3AF" />
          <Text style={styles.mapPlaceholderText}>
            Nenhuma localização no período
          </Text>
        </View>
      );
    }

    if (Platform.OS !== 'web') {
      return (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: gerarHTML(localizacoesFiltradas, rota) }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      );
    }

    return <View ref={webMapContainerRef} style={styles.map} />;
  };

  // ============================================================
  // RENDERIZAR ITEM DA TIMELINE
  // ============================================================
  const renderTimelineItem = (item, index) => {
    const hora = formatarHora(item.data_hora || item.dataHora);
    const end = getEndereco(item);

    let titulo = 'Buscando endereço...';
    let subtitulo = '';

    if (end === null) {
      titulo = 'Endereço não disponível';
      subtitulo = `Lat: ${item.latitude.toFixed(4)}, Long: ${item.longitude.toFixed(4)}`;
    } else if (end) {
      const info = normalizarEndereco(end);

      if (info.logradouro && info.logradouro !== 'Via') {
        titulo = info.numero
          ? `${info.logradouro}, ${info.numero}`
          : info.logradouro;
      } else if (info.cidade) {
        titulo = info.cidade;
      } else {
        titulo = 'Local identificado';
      }

      const partes = [];
      if (info.bairro) partes.push(info.bairro);
      if (info.cidade && info.estado) {
        partes.push(`${info.cidade} - ${info.estado}`);
      } else if (info.cidade) {
        partes.push(info.cidade);
      }
      if (info.cep) partes.push(`CEP ${info.cep}`);

      subtitulo = partes.length > 0 ? partes.join(' • ') : '';
    }

    return (
      <View key={index} style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <Text style={styles.timelineHora}>{hora}</Text>
          <View style={styles.timelineDot}>
            <View style={styles.timelineDotInner} />
          </View>
          {index < localizacoesFiltradas.length - 1 && (
            <View style={styles.timelineLine} />
          )}
        </View>

        <View style={styles.timelineRight}>
          <Text style={styles.timelineLocal} numberOfLines={2}>
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={styles.timelineBairro} numberOfLines={2}>
              {subtitulo}
            </Text>
          ) : null}
          <Text style={styles.timelineEndereco}>
            Lat: {item.latitude.toFixed(4)} | Long: {item.longitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleVoltar}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A237E" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Histórico de localização</Text>

        <TouchableOpacity
          onPress={handleLimparHistorico}
          style={styles.deleteButton}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          <TouchableOpacity
            style={[styles.filtroBotao, filtro === 'hoje' && styles.filtroAtivo]}
            onPress={() => setFiltro('hoje')}
          >
            <Text style={[styles.filtroTexto, filtro === 'hoje' && styles.filtroTextoAtivo]}>
              Hoje
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBotao, filtro === 'ontem' && styles.filtroAtivo]}
            onPress={() => setFiltro('ontem')}
          >
            <Text style={[styles.filtroTexto, filtro === 'ontem' && styles.filtroTextoAtivo]}>
              Ontem
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBotao, filtro === '7dias' && styles.filtroAtivo]}
            onPress={() => setFiltro('7dias')}
          >
            <Text style={[styles.filtroTexto, filtro === '7dias' && styles.filtroTextoAtivo]}>
              7 dias
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>{renderMapa()}</View>

        {/* Timeline */}
        {localizacoesFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={50} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Nenhum registro</Text>
            <Text style={styles.emptySubtitle}>
              Ainda não há histórico de localização neste período.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {localizacoesFiltradas.map((item, index) => renderTimelineItem(item, index))}
          </View>
        )}
      </ScrollView>

      {/* Menu Inferior */}
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
          <Ionicons name="home-outline" size={22} color="#9CA3AF" />
          <Text style={styles.navText}>Início</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A237E' },
  backButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start',
  },
  deleteButton: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { padding: 20, paddingBottom: 120 },

  filtrosContainer: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8,
  },
  filtroBotao: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filtroAtivo: {
    backgroundColor: '#E0E7FF', borderColor: '#1E3A8A',
  },
  filtroTexto: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filtroTextoAtivo: { color: '#1E3A8A' },

  mapContainer: {
    width: '100%', height: 200, borderRadius: 16, overflow: 'hidden',
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

  timelineContainer: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  timelineItem: {
    flexDirection: 'row', minHeight: 80,
  },
  timelineLeft: {
    width: 60, alignItems: 'center', position: 'relative',
  },
  timelineHora: {
    fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 5,
  },
  timelineDot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
    borderColor: '#1E3A8A', backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  timelineDotInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E3A8A',
  },
  timelineLine: {
    position: 'absolute', top: 45, bottom: -15,
    width: 2, backgroundColor: '#E5E7EB',
  },
  timelineRight: {
    flex: 1, paddingLeft: 12, paddingBottom: 20,
  },
  timelineLocal: {
    fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 2,
  },
  timelineBairro: {
    fontSize: 12, color: '#6B7280', marginBottom: 2, lineHeight: 16,
  },
  timelineEndereco: {
    fontSize: 10, color: '#9CA3AF', lineHeight: 14, marginTop: 2,
  },

  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6,
  },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    justifyContent: 'space-around', paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
});