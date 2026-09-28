/**
 * payloads.js
 *
 * Funções geradoras de payloads dinâmicos para os testes K6.
 * Cada chamada gera dados únicos usando timestamps e contadores,
 * evitando conflitos de unicidade entre VUs e iterações.
 *
 * A API considera um evento duplicado quando nome + localização + intervalo
 * de datas coincidem com um evento já existente (não deletado).
 * Para garantir unicidade absoluta, o nome inclui um timestamp em ms
 * e as datas variam por VU + iteração.
 */

// Contador global por VU para garantir unicidade dentro do mesmo VU
let eventCounter = 0;
let ticketTypeCounter = 0;

// Timestamp de início da execução — diferencia execuções distintas do K6
const RUN_ID = Date.now();

/**
 * Gera datas futuras válidas para os eventos.
 * Retorna datas a partir de 1 ano no futuro para garantir
 * que @FutureOrPresent nunca falhe durante os testes.
 *
 * O offsetDays extra por VU/iteração garante que datas também sejam
 * únicas, eliminando o segundo vetor de conflito.
 *
 * @param {number} baseDays  - Deslocamento base em dias a partir de 1 ano no futuro
 * @param {number} extraDays - Deslocamento adicional (ex: baseado em VU/ITER)
 * @returns {string} Data no formato yyyy-MM-ddTHH:mm:ss
 */
function futureDate(baseDays, extraDays = 0) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() + baseDays + extraDays);
  date.setMilliseconds(0);
  return date.toISOString().replace('Z', '').split('.')[0];
}

/**
 * Cria payload para POST /api/event.
 *
 * Unicidade garantida por três fatores combinados:
 * - RUN_ID: timestamp de ms que muda a cada execução do K6
 * - __VU:   ID do usuário virtual (diferencia VUs paralelos)
 * - __ITER: número da iteração dentro do VU
 *
 * @returns {object} Payload válido para criação de evento
 */
export function createEventPayload() {
  eventCounter++;
  // Sufixo com RUN_ID garante que execuções diferentes nunca colidam
  const uniqueSuffix = `${RUN_ID}-${__VU}-${__ITER}-${eventCounter}`;
  // Offset de dias único por VU+iteração para variar também as datas
  const dateOffset = (__VU * 100) + (__ITER % 100);

  return {
    name: `Evento K6 ${uniqueSuffix}`,
    description: 'Evento gerado automaticamente pelo teste de performance K6',
    location: `Arena K6 ${uniqueSuffix}`,
    capacity: 10000,
    ageRestriction: 0,
    dateInitial: futureDate(0, dateOffset),
    dateFinal: futureDate(7, dateOffset),
  };
}

/**
 * Cria payload para POST /api/event/{eventId}/ticket-type.
 *
 * As datas de venda do ingresso são anteriores às datas do evento
 * (período de venda antecipada), respeitando a regra de negócio.
 *
 * @returns {object} Payload válido para criação de tipo de ingresso
 */
export function createTicketTypePayload() {
  ticketTypeCounter++;
  const uniqueSuffix = `${RUN_ID}-${__VU}-${__ITER}-${ticketTypeCounter}`;

  return {
    name: `Setor K6 ${uniqueSuffix}`,
    description: 'Tipo de ingresso gerado pelo teste de performance K6',
    price: 150.00,
    capacity: 5000,
    dateInitial: futureDate(-30),  // venda começa 30 dias antes do evento
    dateFinal: futureDate(-1),     // venda encerra 1 dia antes do evento
  };
}

/**
 * Payload de filtro para GET /api/event.
 * Usa um termo genérico que deve retornar resultados durante os testes,
 * já que todos os eventos criados pelos testes contêm "K6" no nome.
 *
 * @returns {object} Query params para listagem de eventos
 */
export function listEventsParams() {
  return {
    name: 'K6',
    available: true,
  };
}
