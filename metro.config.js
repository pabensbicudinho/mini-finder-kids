const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Configuração necessária para o expo-sqlite no modo Web
defaultConfig.server = defaultConfig.server || {};
const originalEnhanceMiddleware = defaultConfig.server.enhanceMiddleware;

defaultConfig.server.enhanceMiddleware = (middleware, server) => {
  return (req, res, next) => {
    // Adiciona os cabeçalhos de isolamento de origem cruzada
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    
    // Chama o middleware original do Expo
    if (originalEnhanceMiddleware) {
      return originalEnhanceMiddleware(middleware, server)(req, res, next);
    }
    return middleware(req, res, next);
  };
};

module.exports = defaultConfig; 