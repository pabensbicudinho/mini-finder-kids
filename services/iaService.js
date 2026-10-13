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
// ============================================================
export const treinarModelo = (historico) => {
  if (!historico || historico.length < 3) {
    return {
      treinado: false,
      motivo: 'Histórico insuficiente (mínimo 3 registros).',
    };
  }

  const centroideGeral = {
    latitude: historico.reduce((s, h) => s + h.latitude, 0) / historico.length,
    longitude: historico.reduce((s, h) => s + h.longitude, 0) / historico.length,
  };

  const distancias = historico.map((h) =>
    calcularDistancia(h.latitude, h.longitude, centroideGeral.latitude, centroideGeral.longitude)
  );

  const mediaDistancia = distancias.reduce((s, d) => s + d, 0) / distancias.length;
  const variancia =
    distancias.reduce((s, d) => s + Math.pow(d - mediaDistancia, 2), 0) / distancias.length;
  const desvioPadrao = Math.sqrt(variancia);

  const clusters = agruparPorProximidade(historico, 150);
  const locaisHabituais = clusters
    .filter((c) => c.pontos.length >= 2)
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
    limiarAnomalia: Math.round(mediaDistancia + 2 * desvioPadrao),
    locaisHabituais,
    totalRegistros: historico.length,
  };
};

// ============================================================
// 🔍 ANALISAR POSIÇÃO (perímetro + padrão)
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

// ============================================================
// 🛣️ DISTÂNCIA MÍNIMA ATÉ UMA POLYLINE
// ============================================================
export const distanciaAteRota = (ponto, coordenadasRota) => {
  if (!coordenadasRota || coordenadasRota.length === 0) return Infinity;

  let menor = Infinity;

  for (const coord of coordenadasRota) {
    const d = calcularDistancia(
      ponto.latitude,
      ponto.longitude,
      coord.latitude,
      coord.longitude
    );
    if (d < menor) menor = d;
  }

  return menor;
};

// ============================================================
// 🧠 ANALISAR SE ESTÁ SEGUINDO A ROTA
// ============================================================
const TOLERANCIA_ROTA_METROS = 150;
const RAIO_PONTO_METROS = 100;

export const analisarRota = ({
  posicaoAtual,
  rota,
  toleranciaMetros = TOLERANCIA_ROTA_METROS,
  raioPontoMetros = RAIO_PONTO_METROS,
}) => {
  const resultado = {
    status: 'sem_rota',
    anomalia: false,
    motivo: null,
    distanciaRota: null,
    distanciaOrigem: null,
    distanciaDestino: null,
    progresso: 0,
    pontoMaisProximo: null,
  };

  if (!rota || !rota.coordenadas || rota.coordenadas.length === 0) {
    return resultado;
  }

  const polyline = rota.coordenadas;
  const origem = polyline[0];
  const destino = polyline[polyline.length - 1];

  resultado.distanciaRota = Math.round(distanciaAteRota(posicaoAtual, polyline));

  resultado.distanciaOrigem = Math.round(
    calcularDistancia(
      posicaoAtual.latitude,
      posicaoAtual.longitude,
      origem.latitude,
      origem.longitude
    )
  );

  resultado.distanciaDestino = Math.round(
    calcularDistancia(
      posicaoAtual.latitude,
      posicaoAtual.longitude,
      destino.latitude,
      destino.longitude
    )
  );

  let menorDist = Infinity;
  let idxMaisProximo = 0;

  for (let i = 0; i < polyline.length; i++) {
    const d = calcularDistancia(
      posicaoAtual.latitude,
      posicaoAtual.longitude,
      polyline[i].latitude,
      polyline[i].longitude
    );
    if (d < menorDist) {
      menorDist = d;
      idxMaisProximo = i;
    }
  }

  resultado.pontoMaisProximo = idxMaisProximo;
  resultado.progresso =
    polyline.length > 1
      ? Math.round((idxMaisProximo / (polyline.length - 1)) * 100)
      : 0;

  // 1) Chegou ao destino
  if (resultado.distanciaDestino <= raioPontoMetros) {
    resultado.status = 'chegou_destino';
    resultado.motivo = `Chegou ao destino (${resultado.distanciaDestino}m do ponto final).`;
    return resultado;
  }

  // 2) Ainda na origem
  if (resultado.distanciaOrigem <= raioPontoMetros) {
    resultado.status = 'saiu_origem';
    resultado.motivo = `Ainda no ponto de partida (${resultado.distanciaOrigem}m do início).`;
    return resultado;
  }

  // 3) Seguindo a rota
  if (resultado.distanciaRota <= toleranciaMetros) {
    resultado.status = 'seguindo_rota';
    resultado.motivo = `Seguindo a rota (${resultado.distanciaRota}m da linha, ${resultado.progresso}% percorrido).`;
    return resultado;
  }

  // 4) Desviou
  resultado.status = 'desviou_rota';
  resultado.anomalia = true;
  resultado.motivo = `Desviou da rota (${resultado.distanciaRota}m fora do trajeto).`;
  return resultado;
};