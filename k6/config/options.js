/**
 * options.js
 *
 * Configurações reutilizáveis de stages e thresholds para os testes K6.
 * Cada tipo de teste importa as opções correspondentes e as exporta
 * como `export const options` no arquivo de teste.
 */

/**
 * Thresholds compartilhados entre todos os tipos de teste.
 *
 * - http_req_duration: 95% das requisições devem responder em até 500ms;
 *                      99% em até 1500ms
 * - http_req_failed:   taxa de erro máxima de 1%
 * - http_reqs:         throughput mínimo de 10 req/s
 */
export const sharedThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed: ['rate<0.01'],
  http_reqs: ['rate>10'],
};

/**
 * Smoke Test — sanidade básica.
 * 1 usuário virtual, duração de 30 segundos.
 * Objetivo: garantir que todos os endpoints respondem corretamente
 * antes de aplicar qualquer carga real.
 *
 * Nota: o threshold de throughput (http_reqs rate) não se aplica aqui —
 * com 1 VU e sleeps entre requisições, o rate naturalmente será baixo.
 * O smoke test foca em latência e ausência de erros.
 */
export const smokeOptions = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    // Tolerância zero a erros no smoke — qualquer falha indica problema crítico
    http_req_failed: ['rate<0.001'],
  },
};

/**
 * Load Test — carga sustentada esperada.
 * Simula o uso normal da API com ramp-up gradual até 20 VUs.
 *
 * Stages:
 *   0 → 20 VUs em 1 min  (aquecimento)
 *   20 VUs por 3 min     (carga sustentada)
 *   20 → 0 VUs em 1 min  (ramp-down)
 */
export const loadOptions = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: sharedThresholds,
};

/**
 * Stress Test — carga crescente progressiva.
 * Aumenta os VUs gradualmente para identificar o ponto de degradação da API.
 * Todos os VUs atacam o mesmo evento (simula um evento popular).
 *
 * Stages:
 *   0 → 10 VUs em 1 min  (carga baixa)
 *   10 VUs por 2 min     (sustenta)
 *   10 → 30 VUs em 1 min (pressão moderada)
 *   30 VUs por 2 min     (sustenta)
 *   30 → 60 VUs em 1 min (alta carga)
 *   60 VUs por 2 min     (sustenta)
 *   60 → 100 VUs em 1 min (carga máxima)
 *   100 VUs por 2 min    (sustenta — ponto de ruptura)
 *   100 → 0 VUs em 1 min (ramp-down)
 */
export const stressOptions = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '2m', target: 30 },
    { duration: '1m', target: 60 },
    { duration: '2m', target: 60 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    ...sharedThresholds,
    // No stress, toleramos p95 um pouco mais alto (800ms)
    // para identificar a degradação sem falhar prematuramente
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
  },
};
