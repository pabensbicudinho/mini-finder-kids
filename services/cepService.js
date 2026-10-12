// services/cepService.js

// ============================================================
// CONVERTER CEP → ENDEREÇO (ViaCEP)
// ============================================================
export const buscarEnderecoPorCep = async (cep) => {
  try {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return { success: false, message: 'CEP inválido.' };
    }

    const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

    if (!resposta.ok) {
      return { success: false, message: `HTTP ${resposta.status}` };
    }

    const dados = await resposta.json();

    if (dados.erro) {
      return { success: false, message: 'CEP não encontrado.' };
    }

    return {
      success: true,
      endereco: {
        cep: dados.cep,
        logradouro: dados.logradouro,
        bairro: dados.bairro,
        cidade: dados.localidade,
        estado: dados.uf,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return { success: false, message: 'Erro ao buscar CEP.' };
  }
};

// ============================================================
// CONVERTER ENDEREÇO → LAT/LONG (Nominatim)
// ============================================================
export const buscarCoordenadas = async (endereco) => {
  const tentativas = [
    `${endereco.logradouro}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.estado}, Brasil`,
    `${endereco.logradouro}, ${endereco.cidade}, ${endereco.estado}, Brasil`,
    `${endereco.cidade}, ${endereco.estado}, Brasil`,
  ];

  for (let i = 0; i < tentativas.length; i++) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(tentativas[i])}&format=json&limit=1&countrycodes=br`;

      console.log(`🔍 Tentativa ${i + 1}:`, tentativas[i]);

      const resposta = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'MiniFinderKids/1.0 (contato@minifinderkids.com)',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      if (!resposta.ok) {
        console.error(`❌ Nominatim HTTP ${resposta.status}`);
        if (i < tentativas.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        continue;
      }

      const texto = await resposta.text();

      if (texto.trim().startsWith('<')) {
        if (i < tentativas.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
        continue;
      }

      const dados = JSON.parse(texto);

      if (dados && dados.length > 0) {
        console.log(`✅ Coordenadas encontradas:`, dados[0].lat, dados[0].lon);

        return {
          success: true,
          latitude: parseFloat(dados[0].lat),
          longitude: parseFloat(dados[0].lon),
          enderecoCompleto: dados[0].display_name,
        };
      }

      if (i < tentativas.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`Erro na tentativa ${i + 1}:`, error);
    }
  }

  return {
    success: false,
    message: 'Não foi possível encontrar as coordenadas deste endereço.',
  };
};

// ============================================================
// FUNÇÃO COMBINADA: CEP → LAT/LONG
// ============================================================
export const cepParaCoordenadas = async (cep) => {
  console.log('📍 Iniciando busca do CEP:', cep);

  const resultadoCep = await buscarEnderecoPorCep(cep);

  if (!resultadoCep.success) {
    return resultadoCep;
  }

  console.log('✅ Endereço encontrado:', resultadoCep.endereco);

  const resultadoCoord = await buscarCoordenadas(resultadoCep.endereco);

  if (!resultadoCoord.success) {
    return resultadoCoord;
  }

  console.log('✅ Coordenadas encontradas:', resultadoCoord.latitude, resultadoCoord.longitude);

  return {
    success: true,
    endereco: resultadoCep.endereco,
    latitude: resultadoCoord.latitude,
    longitude: resultadoCoord.longitude,
    enderecoCompleto: resultadoCoord.enderecoCompleto,
  };
};

// ============================================================
// GEOCODIFICAÇÃO REVERSA: Lat/Long → Endereço
// 1º tenta Nominatim (mais completo no Brasil)
// 2º usa BigDataCloud como fallback
// ============================================================
export const coordenadasParaEndereco = async (latitude, longitude) => {
  // ---------- TENTATIVA 1: NOMINATIM ----------
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}` +
      `&addressdetails=1&accept-language=pt-BR,pt;q=0.9&zoom=18`;

    const resposta = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'MiniFinderKids/1.0 (contato@minifinderkids.com)',
        'Accept': 'application/json',
      },
    });

    if (resposta.ok) {
      const texto = await resposta.text();

      if (!texto.trim().startsWith('<')) {
        const dados = JSON.parse(texto);
        const a = dados.address || {};

        const logradouro =
          a.road ||
          a.pedestrian ||
          a.footway ||
          a.residential ||
          a.path ||
          '';

        const numero = a.house_number || '';

        const bairro =
          a.suburb ||
          a.neighbourhood ||
          a.city_district ||
          a.quarter ||
          a.hamlet ||
          '';

        const cidade =
          a.city ||
          a.town ||
          a.village ||
          a.municipality ||
          a.county ||
          '';

        const estado = a.state_code || a.state || '';
        const cep = a.postcode || '';
        const pais = a.country || 'Brasil';

        // Só aceita se tiver pelo menos cidade OU logradouro
        if (logradouro || cidade) {
          const enderecoCompleto =
            dados.display_name ||
            [
              logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
              bairro,
              cidade && estado ? `${cidade} - ${estado}` : cidade,
              cep,
              pais,
            ]
              .filter(Boolean)
              .join(', ');

          console.log('✅ Endereço (Nominatim):', enderecoCompleto);

          return {
            success: true,
            endereco: {
              logradouro,
              numero,
              bairro,
              cidade,
              estado,
              cep,
              pais,
              enderecoCompleto,
            },
            enderecoCompleto,
          };
        }
      }
    }

    console.warn('⚠️ Nominatim não retornou endereço utilizável, tentando BigDataCloud...');
  } catch (error) {
    console.warn('⚠️ Erro no Nominatim, tentando BigDataCloud...', error?.message);
  }

  // ---------- TENTATIVA 2: BIGDATACLOUD (fallback) ----------
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`;

    const resposta = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!resposta.ok) {
      console.error(`❌ BigDataCloud HTTP ${resposta.status}`);
      return { success: false, message: `HTTP ${resposta.status}` };
    }

    const dados = await resposta.json();

    if (!dados) {
      return { success: false, message: 'Endereço não encontrado.' };
    }

    // Extrai bairro dos dados administrativos (índices variam por região)
    const admin = dados.localityInfo?.administrative || [];
    const bairroAdmin =
      admin.find((x) => /bairro|suburb|neighbourhood|district/i.test(x.description || ''))?.name ||
      admin.find((x) => (x.adminLevel || 0) >= 8 && (x.adminLevel || 0) <= 10)?.name ||
      '';

    const logradouro = dados.street || '';
    const numero = dados.streetNumber || '';
    const bairro = bairroAdmin || dados.locality || '';
    const cidade = dados.city || dados.locality || '';
    const estado = dados.principalSubdivision || dados.principalSubdivisionCode?.replace('BR-', '') || '';
    const cep = dados.postcode || '';
    const pais = dados.countryName || 'Brasil';

    // Se não conseguiu nem o logradouro nem a cidade, retorna erro
    if (!logradouro && !cidade) {
      return { success: false, message: 'Endereço não encontrado.' };
    }

    const enderecoCompleto = [
      logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
      bairro,
      cidade && estado ? `${cidade} - ${estado}` : cidade,
      cep,
      pais,
    ]
      .filter(Boolean)
      .join(', ');

    console.log('✅ Endereço (BigDataCloud):', enderecoCompleto);

    return {
      success: true,
      endereco: {
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cep,
        pais,
        enderecoCompleto,
      },
      enderecoCompleto,
    };
  } catch (error) {
    console.error('Erro na geocodificação reversa:', error);
    return { success: false, message: 'Erro ao buscar endereço.' };
  }
};
