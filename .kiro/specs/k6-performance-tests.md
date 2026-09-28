# K6 Performance Tests — api-tickets-sale

## Requirements

### Contexto
Este projeto implementa uma suíte de testes de performance para a API de venda de ingressos (`api-tickets-sale`), utilizando o framework [K6](https://k6.io/). O objetivo é validar o comportamento dos endpoints de criação e listagem sob diferentes níveis de carga, simulando múltiplos usuários acessando simultaneamente um mesmo evento.

### Escopo dos Endpoints Testados
- `POST /api/event` — Criar evento
- `GET /api/event` — Listar eventos (com e sem filtros)
- `GET /api/event/{id}` — Buscar evento por ID
- `POST /api/event/{eventId}/ticket-type` — Criar tipo de ingresso para um evento

### Tipos de Teste
1. **Smoke Test** — Sanidade básica com 1–2 usuários virtuais, valida que os endpoints estão respondendo corretamente antes de qualquer carga
2. **Load Test** — Carga esperada e sustentada, simulando uso normal com ramp-up gradual
3. **Stress Test** — Carga crescente até identificar o ponto de degradação da API, com múltiplos usuários simultâneos acessando o mesmo evento

### Thresholds (Critérios de Aprovação)
- `http_req_duration` p(95) < 500ms — 95% das requisições devem responder em até 500ms
- `http_req_duration` p(99) < 1500ms — 99% das requisições devem responder em até 1,5s
- `http_req_failed` < 1% — taxa de erro máxima de 1%
- `http_reqs` rate > 10/s — throughput mínimo de 10 requisições por segundo

### Estrutura do Projeto K6
```
k6/
├── config/
│   └── options.js          # Configurações reutilizáveis de stages e thresholds
├── data/
│   └── payloads.js         # Payloads de request (event, ticket-type) com dados dinâmicos
├── helpers/
│   └── http.js             # Wrapper de requisições HTTP com checagens padrão
├── tests/
│   ├── smoke/
│   │   └── smoke.test.js   # Smoke test (1–2 VUs, duração curta)
│   ├── load/
│   │   └── load.test.js    # Load test (ramp-up gradual, carga sustentada)
│   └── stress/
│       └── stress.test.js  # Stress test (carga crescente até degradação)
└── README.md               # Documentação completa do projeto
```

### Contratos dos Endpoints

#### POST /api/event
**Request:**
```json
{
  "name": "string (obrigatório)",
  "description": "string (opcional)",
  "location": "string (obrigatório)",
  "capacity": "int > 0 (obrigatório)",
  "ageRestriction": "int >= 0 (opcional, padrão 0)",
  "dateInitial": "yyyy-MM-ddTHH:mm:ss (obrigatório, futuro ou presente)",
  "dateFinal": "yyyy-MM-ddTHH:mm:ss (obrigatório, futuro ou presente, > dateInitial)"
}
```
**Response:** 201 Created com corpo `EventResponseDTO`

#### GET /api/event
**Query params opcionais:** `name`, `location`, `dateInitial`, `dateFinal`, `ageRestriction`, `available`
**Response:** 200 OK com array de `EventResponseDTO`

#### GET /api/event/{id}
**Path param:** `id` (UUID)
**Response:** 200 OK com `EventResponseDTO`

#### POST /api/event/{eventId}/ticket-type
**Request:**
```json
{
  "name": "string (obrigatório)",
  "description": "string (opcional)",
  "price": "decimal > 0 (obrigatório)",
  "capacity": "int > 0 (obrigatório)",
  "dateInitial": "yyyy-MM-ddTHH:mm:ss (obrigatório, futuro ou presente)",
  "dateFinal": "yyyy-MM-ddTHH:mm:ss (obrigatório, > dateInitial)"
}
```
**Response:** 201 Created com corpo `TicketTypeResponseDTO`

### GitHub Actions
- Workflow `k6-tests.yml` que executa o smoke test automaticamente em cada push
- Execução em ambiente local via Docker (sem necessidade de serviço externo de métricas)

### README
O `k6/README.md` deve conter:
- Descrição do projeto e objetivo
- Pré-requisitos (K6 instalado ou via Docker)
- Como rodar cada tipo de teste
- Explicação da estrutura de pastas
- Descrição dos thresholds e o que cada um valida
- Exemplos de output esperado

---

## Design

### Arquitetura do Projeto

```
k6/
├── config/
│   └── options.js
├── data/
│   └── payloads.js
├── helpers/
│   └── http.js
├── tests/
│   ├── smoke/
│   │   └── smoke.test.js
│   ├── load/
│   │   └── load.test.js
│   └── stress/
│       └── stress.test.js
└── README.md
```

### config/options.js
Exporta objetos de configuração K6 reutilizáveis:
- `smokeOptions` — 1 VU, 30s de duração
- `loadOptions` — stages: ramp-up 0→20 VUs em 1min, sustenta 20 VUs por 3min, ramp-down em 1min
- `stressOptions` — stages: ramp-up progressivo 0→10→30→60→100 VUs, cada nível sustentado por 2min, ramp-down
- Thresholds compartilhados aplicados em todos os testes

### data/payloads.js
Funções que retornam payloads com dados dinâmicos (usando `Date.now()` e contadores para unicidade):
- `createEventPayload()` — gera payload para POST /event com datas futuras válidas
- `createTicketTypePayload()` — gera payload para POST /event/{id}/ticket-type

### helpers/http.js
Wrapper sobre o módulo `k6/http` que:
- Adiciona headers padrão (`Content-Type: application/json`)
- Encapsula checagens de status HTTP via `check()`
- Registra métricas de sucesso/falha por endpoint usando `Trend` e `Counter` do K6

### Estratégia dos Testes

#### smoke.test.js
- Fluxo: cria 1 evento → adiciona 1 tipo de ingresso → lista eventos → busca evento por ID
- Valida status codes (201, 200) e estrutura básica do response
- 1 VU, 30 segundos

#### load.test.js
- Setup: cria 1 evento fixo no `setup()` e compartilha o ID com todos os VUs
- Fluxo por VU: GET /event (listagem geral) + GET /event/{id} (evento compartilhado) + POST /event (criação)
- Simula múltiplos usuários acessando o mesmo evento simultaneamente
- Ramp-up até 20 VUs sustentados

#### stress.test.js
- Setup: cria 1 evento fixo no `setup()` — todos os VUs atacam o mesmo evento
- Fluxo por VU: concentrado no GET /event/{id} do evento compartilhado (simula pico de acessos a um evento popular)
- Intercala com POST /event (criação) e GET /event (listagem) para stress mais completo
- Ramp-up progressivo até 100 VUs para identificar ponto de degradação
- Thresholds mais rigorosos para identificar limites

### GitHub Actions — k6-tests.yml
- Trigger: push em qualquer branch
- Job: sobe a API via `docker compose up -d`, aguarda health check, roda smoke test com K6 via Docker, derruba os containers
- Usa `grafana/k6` como imagem Docker para não precisar instalar K6 no runner

---

## Tasks

- [ ] 1. Criar estrutura de pastas do projeto K6 (`k6/config`, `k6/data`, `k6/helpers`, `k6/tests/smoke`, `k6/tests/load`, `k6/tests/stress`)
- [ ] 2. Implementar `k6/config/options.js` com configurações de smoke, load e stress (stages e thresholds)
- [ ] 3. Implementar `k6/data/payloads.js` com funções geradoras de payloads dinâmicos para event e ticket-type
- [ ] 4. Implementar `k6/helpers/http.js` com wrapper HTTP, headers padrão e métricas customizadas
- [ ] 5. Implementar `k6/tests/smoke/smoke.test.js` com fluxo completo de sanidade
- [ ] 6. Implementar `k6/tests/load/load.test.js` com setup de evento compartilhado e carga sustentada
- [ ] 7. Implementar `k6/tests/stress/stress.test.js` com ramp-up progressivo e evento compartilhado
- [ ] 8. Criar `k6/README.md` com documentação completa do projeto
- [ ] 9. Criar `.github/workflows/k6-tests.yml` com pipeline de CI rodando o smoke test automaticamente
