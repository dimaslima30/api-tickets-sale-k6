/**
 * load.test.js
 *
 * Load Test — carga sustentada esperada.
 *
 * Objetivo: validar o comportamento da API sob carga normal,
 * com múltiplos usuários virtuais simultâneos acessando o mesmo evento.
 *
 * Estratégia:
 * - setup() cria 1 evento fixo compartilhado entre todos os VUs.
 *   Isso simula um evento popular sendo acessado por muitos usuários.
 * - Cada VU executa um mix de operações:
 *     40% GET /event/{id}   — consulta ao evento compartilhado
 *     30% GET /event        — listagem geral com filtro
 *     30% POST /event       — criação de novos eventos
 *
 * Stages: ramp-up 0→20 VUs em 1min, sustenta 3min, ramp-down 1min.
 */

import { sleep } from 'k6';
import { loadOptions } from '../../config/options.js';
import { createEventPayload, createTicketTypePayload, listEventsParams } from '../../data/payloads.js';
import { postEvent, getEvents, getEventById, postTicketType } from '../../helpers/http.js';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080/api';

export const options = loadOptions;

/**
 * setup() é executado uma única vez antes de todos os VUs iniciarem.
 * Cria o evento compartilhado e retorna seu ID para todos os VUs.
 */
export function setup() {
  const res = postEvent(BASE_URL, {
    name: 'Evento Compartilhado - Load Test',
    description: 'Evento fixo usado por todos os VUs no load test',
    location: 'Arena K6, São Paulo - SP',
    capacity: 50000,
    ageRestriction: 0,
    dateInitial: '2030-01-01T10:00:00',
    dateFinal: '2030-01-07T23:00:00',
  });

  if (res.status !== 201) {
    console.error(`setup: falha ao criar evento compartilhado — ${res.status}: ${res.body}`);
    return { sharedEventId: null };
  }

  const sharedEventId = JSON.parse(res.body).id;
  console.log(`setup: evento compartilhado criado → id=${sharedEventId}`);

  // Adiciona um tipo de ingresso ao evento compartilhado
  postTicketType(BASE_URL, sharedEventId, {
    name: 'Pista - Load Test',
    description: 'Ingresso pista para load test',
    price: 200.00,
    capacity: 30000,
    dateInitial: '2029-06-01T10:00:00',
    dateFinal: '2029-12-31T23:59:59',
  });

  return { sharedEventId };
}

export default function (data) {
  const { sharedEventId } = data;

  // Distribui as operações por faixa do __ITER para simular mix realista
  const scenario = __ITER % 10;

  if (scenario < 4) {
    // 40% — consulta ao evento compartilhado (maior carga em leitura)
    if (sharedEventId) {
      getEventById(BASE_URL, sharedEventId);
    }
  } else if (scenario < 7) {
    // 30% — listagem geral de eventos
    getEvents(BASE_URL, listEventsParams());
  } else {
    // 30% — criação de novos eventos
    postEvent(BASE_URL, createEventPayload());
  }

  sleep(1);
}
