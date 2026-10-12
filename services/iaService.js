// services/iaService.js

// ============================================================
// DISTÂNCIA ENTRE DOIS PONTOS (Haversine)
// ============================================================
export const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // metros
  const rad = Math.PI / 180;

  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ============================================================
// CLUSTERIZAÇÃO SIMPLES (agrupa pontos por proximidade)
// ============================================================
const agruparPorProximidade = (pontos, raioMetros = 150) => {
  const clusters = [];

  for (const ponto of pontos) {
    let encontrou = false;

    for (const cluster of clusters) {
      const dist = calcularDistancia(
        ponto.latitude,
        ponto.longitude,
        cluster.centroide.latitude,
        cluster.centroide.longitude
      );

      if (dist <= raioMetros) {
        cluster.pontos.push(ponto);
        // Recalcula centroide
        cluster.centroide.latitude =
          cluster.pontos.reduce((s, p) => s + p.latitude, 0) / cluster.pontos.length;
        cluster.centroide.longitude =
          cluster.pontos.reduce((s, p) => s + p.longitude, 0) / cluster.pontos.length;
        encontrou = true;
        break;
      }
    }

    if (!encontrou) {
      clusters.push({
        centroide: { latitude: ponto.latitude, longitude: ponto.longitude },
        pontos: [ponto],
      });
    }
  }

  return clusters;
};

// ============================================================
// 🧠 TREINAR MODELO COM O HISTÓRICO
// Retorna: locais habituais, raio típico de deslocamento, etc.
// ============================================================
export const treinarModelo = (historico) => {
  if (!historico || historico.length < 3) {
    return {
      treinado: false,
      motivo: 'Histórico insuficiente (mínimo 3 registros).',
    };
  }

  // 1. Centroide geral (média de todos os pontos)
  const centroideGeral = {
    latitude: historico.reduce((s, h) => s + h.latitude, 0) / historico.length,
    longitude: historico.reduce((s, h) => s + h.longitude, 0) / historico.length,
  };

  // 2. Raio típico (desvio padrão das distâncias ao centroide)
  const distancias = historico.map((h) =>
    calcularDistancia(h.latitude, h.longitude, centroideGeral.latitude, centroideGeral.longitude)
  );

  const mediaDistancia = distancias.reduce((s, d) => s + d, 0) / distancias.length;
  const variancia =
    distancias.reduce((s, d) => s + Math.pow(d - mediaDistancia, 2), 0) / distancias.length;
  const desvioPadrao = Math.sqrt(variancia);

  // 3. Locais habituais (clusters onde a criança passa mais tempo)
  const clusters = agruparPorProximidade(historico, 150);
  const locaisHabituais = clusters
    .filter((c) => c.pontos.length >= 2) // aparece ao menos 2x
    .map((c) => ({
      latitude: c.centroide.latitude,
      longitude: c.centroide.longitude,
      visitas: c.pontos.length,
    }))
    .sort((a, b) => b.visitas - a.visitas);

  return {
    treinado: true,
    centroideGeral,
    mediaDistancia: Math.round(mediaDistancia),
    desvioPadrao: Math.round(desvioPadrao),
    // Limite considerado "normal": média + 2 * desvio padrão
    limiarAnomalia: Math.round(mediaDistancia + 2 * desvioPadrao),
    locaisHabituais,
    totalRegistros: historico.length,
  };
};

// ============================================================
// 🔍 ANALISAR POSIÇÃO ATUAL CONTRA O MODELO + PERÍMETRO
// ============================================================
export const analisarPosicao = ({
  posicaoAtual,
  modelo,
  perimetros,
  limiarToleranciaMetros = 100,
}) => {
  const resultado = {
    anomalia: false,
    motivo: null,
    distanciaPerimetro: null,
    distanciaPadrao: null,
    perimetroMaisProximo: null,
  };

  // --- 1. Verificar perímetro seguro ---
  if (perimetros && perimetros.length > 0) {
    let menorDistancia = Infinity;
    let perimetroMaisProximo = null;

    for (const p of perimetros) {
      const dist = calcularDistancia(
        posicaoAtual.latitude,
        posicaoAtual.longitude,
        p.latitude,
        p.longitude
      );

      if (dist < menorDistancia) {
        menorDistancia = dist;
        perimetroMaisProximo = p;
      }
    }

    resultado.distanciaPerimetro = Math.round(menorDistancia);
    resultado.perimetroMaisProximo = perimetroMaisProximo;

    // Se a criança está FORA do perímetro seguro
    if (perimetroMaisProximo && menorDistancia > (perimetroMaisProximo.raio || 500)) {
      resultado.anomalia = true;
      resultado.motivo = `Saiu da área segura "${perimetroMaisProximo.nome || 'Sem nome'}" (${resultado.distanciaPerimetro}m de distância do centro).`;
      return resultado;
    }
  }

  // --- 2. Verificar desvio do padrão habitual ---
  if (modelo?.treinado) {
    const distPadrao = calcularDistancia(
      posicaoAtual.latitude,
      posicaoAtual.longitude,
      modelo.centroideGeral.latitude,
      modelo.centroideGeral.longitude
    );

    resultado.distanciaPadrao = Math.round(distPadrao);

    if (distPadrao > modelo.limiarAnomalia + limiarToleranciaMetros) {
      resultado.anomalia = true;
      resultado.motivo = `Deslocamento fora do padrão habitual (${resultado.distanciaPadrao}m vs. limite de ${modelo.limiarAnomalia}m).`;
      return resultado;
    }
  }

  return resultado;
};