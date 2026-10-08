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
        console.log('Banco de dados pronto.');
      } catch (error) {
        console.error('Erro ao inicializar banco:', error);
      }
    };
    setup();
  }, []);

  const navigateTo = (screen, data = null) => {
    if (screen !== currentScreen) {
      setPreviousScreen(currentScreen);
    }
    if (screen === 'inicio' && data) {
      setLoggedUser(data);
      setSelectedChild(null);
    } else if (screen === 'login') {
      setLoggedUser(null);
      setSelectedChild(null);
    } else if (
      screen === 'mapa' ||
      screen === 'perfilCrianca' ||
      screen === 'mapaCriancaAlerta' ||
      screen === 'alerta'
    ) {
      if (data) setSelectedChild(data);
    }
    setCurrentScreen(screen);
  };

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
      {currentScreen === 'login' && <Login onNavigate={navigateTo} />}
      {currentScreen === 'cadastro' && <Cadastro onNavigate={navigateTo} />}
      {currentScreen === 'inicio' && <Inicio userData={loggedUser} onNavigate={navigateTo} />}
      {currentScreen === 'novaCriancas' && <NovaCrianca onNavigate={navigateTo} />}
      {currentScreen === 'mapa' && <Mapa userData={selectedChild} onNavigate={navigateTo} />}
      {currentScreen === 'perfil' && (
        <Perfil userData={loggedUser} onNavigate={navigateTo} previousScreen={previousScreen} />
      )}
      {currentScreen === 'perfilCrianca' && (
        <PerfilCrianca userData={selectedChild} onNavigate={navigateTo} />
      )}
      {currentScreen === 'alerta' && <Alerta userData={selectedChild} onNavigate={navigateTo} />}
      {currentScreen === 'mapaCriancaAlerta' && (
        <MapaCriancaAlerta userData={selectedChild} onNavigate={navigateTo} />
      )}
    </SafeAreaProvider>
  );
}