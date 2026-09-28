/**
 * smoke.test.js
 *
 * Smoke Test — sanidade básica da API de tickets.
 *
 * Objetivo: verificar que todos os endpoints respondem corretamente
 * com um único usuário virtual antes de qualquer carga real.
 *
 * Fluxo:
 *   1. POST /event         → cria um evento
 *   2. POST /ticket-type   → adiciona tipo de ingresso ao evento
 *   3. GET  /event         → lista eventos (sem filtro)
 *   4. GET  /event/{id}    → busca o evento criado pelo ID
 *
 * Configuração: 1 VU, 30 segundos.
 */

import { sleep } from 'k6';
import { smokeOptions } from '../../config/options.js';
import { createEventPayload, createTicketTypePayload } from '../../data/payloads.js';
import { postEvent, getEvents, getEventById, postTicketType } from '../../helpers/http.js';

// URL base da API — sobrescrevível via variável de ambiente K6_BASE_URL
const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8080/api';

export const options = smokeOptions;

export default function () {
  // ── 1. Criar evento ────────────────────────────────────────────────────────
  const createRes = postEvent(BASE_URL, createEventPayload());

  if (createRes.status !== 201) {
    console.error(`Smoke: falha ao criar evento — abortando iteração`);
    return;
  }

  const event = JSON.parse(createRes.body);
  const eventId = event.id;

  sleep(0.5);

  // ── 2. Criar tipo de ingresso para o evento ────────────────────────────────
  postTicketType(BASE_URL, eventId, createTicketTypePayload());

  sleep(0.5);

  // ── 3. Listar eventos ──────────────────────────────────────────────────────
  getEvents(BASE_URL);

  sleep(0.5);

  // ── 4. Buscar evento por ID ────────────────────────────────────────────────
  getEventById(BASE_URL, eventId);

  sleep(1);
}
