/**
 * http.js
 *
 * Wrapper sobre o módulo k6/http que padroniza:
 * - Headers de todas as requisições
 * - Checagens de status HTTP via check()
 * - Métricas customizadas por endpoint (Trend e Counter)
 * - Log de erros para facilitar debug
 */

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

// ─── Métricas customizadas por endpoint ───────────────────────────────────────

/** Duração das requisições de criação de evento */
export const createEventDuration = new Trend('create_event_duration', true);

/** Duração das requisições de listagem de eventos */
export const listEventsDuration = new Trend('list_events_duration', true);

/** Duração das requisições de busca de evento por ID */
export const getEventByIdDuration = new Trend('get_event_by_id_duration', true);

/** Duração das requisições de criação de tipo de ingresso */
export const createTicketTypeDuration = new Trend('create_ticket_type_duration', true);

/** Contador de erros por endpoint */
export const createEventErrors = new Counter('create_event_errors');
export const listEventsErrors = new Counter('list_events_errors');
export const getEventByIdErrors = new Counter('get_event_by_id_errors');
export const createTicketTypeErrors = new Counter('create_ticket_type_errors');

// ─── Headers padrão ───────────────────────────────────────────────────────────

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// ─── Funções de requisição ────────────────────────────────────────────────────

/**
 * Realiza POST /api/event e registra métricas.
 *
 * @param {string} baseUrl - URL base da API (ex: http://localhost:8080/api)
 * @param {object} payload - Corpo da requisição
 * @returns {Response} Resposta do K6
 */
export function postEvent(baseUrl, payload) {
  const res = http.post(
    `${baseUrl}/event`,
    JSON.stringify(payload),
    { headers: DEFAULT_HEADERS }
  );

  createEventDuration.add(res.timings.duration);

  const ok = check(res, {
    'POST /event → status 201': (r) => r.status === 201,
    'POST /event → tem id no response': (r) => {
      try { return JSON.parse(r.body).id !== undefined; }
      catch (_) { return false; }
    },
  });

  if (!ok) {
    createEventErrors.add(1);
    console.error(`[postEvent] Erro ${res.status}: ${res.body}`);
  }

  return res;
}

/**
 * Realiza GET /api/event com query params opcionais e registra métricas.
 *
 * @param {string} baseUrl - URL base da API
 * @param {object} params  - Query params (ex: { name: 'K6', available: true })
 * @returns {Response} Resposta do K6
 */
export function getEvents(baseUrl, params = {}) {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = query ? `${baseUrl}/event?${query}` : `${baseUrl}/event`;

  const res = http.get(url, { headers: DEFAULT_HEADERS });

  listEventsDuration.add(res.timings.duration);

  const ok = check(res, {
    'GET /event → status 200': (r) => r.status === 200,
    'GET /event → response é array': (r) => {
      try { return Array.isArray(JSON.parse(r.body)); }
      catch (_) { return false; }
    },
  });

  if (!ok) {
    listEventsErrors.add(1);
    console.error(`[getEvents] Erro ${res.status}: ${res.body}`);
  }

  return res;
}

/**
 * Realiza GET /api/event/{id} e registra métricas.
 *
 * @param {string} baseUrl  - URL base da API
 * @param {string} eventId  - UUID do evento
 * @returns {Response} Resposta do K6
 */
export function getEventById(baseUrl, eventId) {
  const res = http.get(
    `${baseUrl}/event/${eventId}`,
    { headers: DEFAULT_HEADERS }
  );

  getEventByIdDuration.add(res.timings.duration);

  const ok = check(res, {
    'GET /event/{id} → status 200': (r) => r.status === 200,
    'GET /event/{id} → id correto no response': (r) => {
      try { return JSON.parse(r.body).id === eventId; }
      catch (_) { return false; }
    },
  });

  if (!ok) {
    getEventByIdErrors.add(1);
    console.error(`[getEventById] Erro ${res.status} para id=${eventId}: ${res.body}`);
  }

  return res;
}

/**
 * Realiza POST /api/event/{eventId}/ticket-type e registra métricas.
 *
 * @param {string} baseUrl  - URL base da API
 * @param {string} eventId  - UUID do evento pai
 * @param {object} payload  - Corpo da requisição
 * @returns {Response} Resposta do K6
 */
export function postTicketType(baseUrl, eventId, payload) {
  const res = http.post(
    `${baseUrl}/event/${eventId}/ticket-type`,
    JSON.stringify(payload),
    { headers: DEFAULT_HEADERS }
  );

  createTicketTypeDuration.add(res.timings.duration);

  const ok = check(res, {
    'POST /ticket-type → status 201': (r) => r.status === 201,
    'POST /ticket-type → tem id no response': (r) => {
      try { return JSON.parse(r.body).id !== undefined; }
      catch (_) { return false; }
    },
  });

  if (!ok) {
    createTicketTypeErrors.add(1);
    console.error(`[postTicketType] Erro ${res.status}: ${res.body}`);
  }

  return res;
}
