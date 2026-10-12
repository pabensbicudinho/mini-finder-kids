import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './database/db';

import Login from './components/Login';
import Cadastro from './components/Cadastro';
import Inicio from './components/Inicio';
import NovaCrianca from './components/NovaCriancas';
import Mapa from './components/Mapa';
import Perfil from './components/Perfil';
import PerfilCrianca from './components/PerfilCrianca';
import Alerta from './components/Alerta';
import MapaCriancaAlerta from './components/MapaCriancaAlerta';
import NovaRota from './components/NovaRota';
import RotaDetalhes from './components/RotaDetalhes';
import HistoricoCrianca from './components/HistoricoCrianca';
import HistoricoMicrofone from './components/HistoricoMicrofone';
import HistoricoCamera from './components/HistoricoCamera';
import CameraCapture from './components/CameraCapture';
import Debug from './components/Debug';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [previousScreen, setPreviousScreen] = useState('inicio');
  const [loggedUser, setLoggedUser] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        console.log('✅ Banco de dados pronto.');
      } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
      }
    };
    setup();
  }, []);

  const navigateTo = (screen, data = null) => {
    console.log('🟣 navigateTo:', { screen, data: data?.nome || data, currentScreen });

    if (screen !== currentScreen) {
      setPreviousScreen(currentScreen);
    }

    // LOGIN → INÍCIO (define o usuário logado)
    if (screen === 'inicio' && data) {
      setLoggedUser(data);
      setSelectedChild(null);
    }
    // LOGOUT
    else if (screen === 'login') {
      setLoggedUser(null);
      setSelectedChild(null);
    }
    // CRIANÇA SELECIONADA
    else if (
      screen === 'mapa' ||
      screen === 'perfilCrianca' ||
      screen === 'mapaCriancaAlerta' ||
      screen === 'alerta' ||
      screen === 'novaRota' ||
      screen === 'rotaDetalhes' ||
      screen === 'historicoCrianca' ||
      screen === 'historicoMicrofone' ||
      screen === 'historicoCamera' ||
      screen === 'cameraCapture'
    ) {
      if (data) setSelectedChild(data);
    }

    setCurrentScreen(screen);
  };

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
      {/* AUTENTICAÇÃO */}
      {currentScreen === 'login' && <Login onNavigate={navigateTo} />}
      {currentScreen === 'cadastro' && <Cadastro onNavigate={navigateTo} />}

      {/* TELAS PRINCIPAIS */}
      {currentScreen === 'inicio' && (
        <Inicio userData={loggedUser} onNavigate={navigateTo} />
      )}
      {currentScreen === 'perfil' && (
        <Perfil
          userData={loggedUser}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}

      {/* TELAS DE CRIANÇA */}
      {currentScreen === 'novaCriancas' && (
        <NovaCrianca onNavigate={navigateTo} />
      )}
      {currentScreen === 'mapa' && (
        <Mapa userData={selectedChild} onNavigate={navigateTo} />
      )}
      {currentScreen === 'perfilCrianca' && (
        <PerfilCrianca userData={selectedChild} onNavigate={navigateTo} />
      )}

      {/* TELAS DE ROTA / ÁREA SEGURA */}
      {currentScreen === 'novaRota' && (
        <NovaRota
          userData={selectedChild}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}
      {currentScreen === 'rotaDetalhes' && (
        <RotaDetalhes
          userData={selectedChild}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}

      {/* TELAS DE HISTÓRICO */}
      {currentScreen === 'historicoCrianca' && (
        <HistoricoCrianca
          userData={selectedChild}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}
      {currentScreen === 'historicoMicrofone' && (
        <HistoricoMicrofone
          userData={selectedChild}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}
      {currentScreen === 'historicoCamera' && (
        <HistoricoCamera
          userData={selectedChild}
          onNavigate={navigateTo}
          previousScreen={previousScreen}
        />
      )}

      {/* TELAS DE CAPTURA */}
      {currentScreen === 'cameraCapture' && (
        <CameraCapture
          userData={selectedChild}
          onNavigate={navigateTo}
        />
      )}

      {/* TELAS DE ALERTA */}
      {currentScreen === 'alerta' && (
        <Alerta userData={selectedChild} onNavigate={navigateTo} />
      )}
      {currentScreen === 'mapaCriancaAlerta' && (
        <MapaCriancaAlerta userData={selectedChild} onNavigate={navigateTo} />
      )}

      {/* DEBUG */}
      {currentScreen === 'debug' && <Debug onNavigate={navigateTo} />}
    </SafeAreaProvider>
  );
}