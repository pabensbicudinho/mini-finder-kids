// services/rotaService.js

// ============================================================
// TRAÇAR ROTA ENTRE DOIS PONTOS (OSRM)
// ============================================================
export const tracarRota = async (origem, destino) => {
  try {
    // OSRM espera longitude,latitude (nessa ordem!)
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}?overview=full&geometries=geojson`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (!dados.routes || dados.routes.length === 0) {
      return { success: false, message: 'Não foi possível traçar a rota.' };
    }

    const rota = dados.routes[0];

    // Converte as coordenadas [lng, lat] para [lat, lng]
    const coordenadas = rota.geometry.coordinates.map((coord) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    return {
      success: true,
      rota: {
        coordenadas: coordenadas,
        distanciaMetros: rota.distance,
        duracaoSegundos: rota.duration,
      },
    };
  } catch (error) {
    console.error('Erro ao traçar rota:', error);
    return { success: false, message: 'Erro ao traçar rota.' };
  }
};