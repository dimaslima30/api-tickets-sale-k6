/**
 * stress.test.js
 *
 * Stress Test — carga crescente progressiva.
 *
 * Objetivo: identificar o ponto de degradação da API aumentando
 * gradualmente o número de usuários virtuais simultâneos.
 * Todos os VUs atacam o mesmo evento, simulando um evento popular
 * com alta demanda de acesso simultâneo.
 *
 * Estratégia:
 * - setup() cria 1 evento fixo compartilhado entre todos os VUs.
 * - O fluxo por VU é intencionalmente simples e focado em leitura
 *   para maximizar a carga sobre os endpoints mais acessados:
 *     60% GET /event/{id}  — pico de acessos ao evento popular
 *     25% GET /event       — listagem geral
 *     15% POST /event      — criações para estressar escrita também
 *
 * Stages: ramp-up progressivo 0→10→30→60→100 VUs.
 * Cada nível é sustentado por 2 minutos para observar estabilização.
 */

import { sleep } from 'k6';
import { stressOptions } from '../../config/options.js';
import { createEventPayload, listEventsParams } from '../../data/payloads.js';
import { postEvent, getEvents, getEventById } from '../../helpers/http.js';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080/api';

export const options = stressOptions;

/**
 * setup() cria o evento compartilhado que será o alvo do stress test.
 * Um único evento recebendo acessos de até 100 VUs simultâneos.
 */
export function setup() {
  const res = postEvent(BASE_URL, {
    name: 'Evento Compartilhado - Stress Test',
    description: 'Evento fixo alvo do stress test — simula evento popular',
    location: 'Estádio K6, Rio de Janeiro - RJ',
    capacity: 100000,
    ageRestriction: 0,
    dateInitial: '2030-03-01T14:00:00',
    dateFinal: '2030-03-03T23:00:00',
  });

  if (res.status !== 201) {
    console.error(`setup: falha ao criar evento de stress — ${res.status}: ${res.body}`);
    return { sharedEventId: null };
  }

  const sharedEventId = JSON.parse(res.body).id;
  console.log(`setup: evento de stress criado → id=${sharedEventId}`);
  return { sharedEventId };
}

export default function (data) {
  const { sharedEventId } = data;

  const scenario = __ITER % 20;

  if (scenario < 12) {
    // 60% — leitura direta ao evento compartilhado
    // Esse é o cenário mais crítico: muitos usuários consultando
    // o mesmo evento ao mesmo tempo (ingressos esgotando, etc.)
    if (sharedEventId) {
      getEventById(BASE_URL, sharedEventId);
    }
  } else if (scenario < 17) {
    // 25% — listagem geral de eventos
    getEvents(BASE_URL, listEventsParams());
  } else {
    // 15% — criação de eventos para estressar operações de escrita
    postEvent(BASE_URL, createEventPayload());
  }

  // Sleep reduzido no stress para aumentar a pressão sobre a API
  sleep(0.5);
}
