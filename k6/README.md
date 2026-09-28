# 🚀 K6 Performance Tests — api-tickets-sale

Suíte de testes de performance para a [api-tickets-sale](../app), construída com o framework [K6](https://k6.io/). O objetivo é validar o comportamento dos endpoints de criação e listagem sob diferentes níveis de carga, simulando múltiplos usuários acessando simultaneamente um mesmo evento.

---

## 📋 Pré-requisitos

- **Docker** — para rodar a API localmente
- **K6** — para executar os testes

### Instalar o K6

**Via Docker (sem instalação):**
```bash
docker run --rm -i grafana/k6 version
```

**Via instalador (Windows):**
```powershell
winget install k6 --source winget
```

**Via Homebrew (macOS/Linux):**
```bash
brew install k6
```

Documentação oficial: https://k6.io/docs/get-started/installation/

---

## 🗂️ Estrutura do Projeto

```
k6/
├── config/
│   └── options.js          # Configurações de stages e thresholds reutilizáveis
├── data/
│   └── payloads.js         # Geradores de payloads dinâmicos (nomes únicos por VU/iteração)
├── helpers/
│   └── http.js             # Wrapper HTTP com headers padrão e métricas customizadas
├── tests/
│   ├── smoke/
│   │   └── smoke.test.js   # Sanidade básica — 1 VU, 30s
│   ├── load/
│   │   └── load.test.js    # Carga sustentada — até 20 VUs, 5min total
│   └── stress/
│       └── stress.test.js  # Carga crescente — até 100 VUs, ~13min total
└── README.md
```

### Descrição dos módulos

| Arquivo | Responsabilidade |
|---|---|
| `config/options.js` | Define `smokeOptions`, `loadOptions` e `stressOptions` com stages e thresholds |
| `data/payloads.js` | Funções `createEventPayload()`, `createTicketTypePayload()` e `listEventsParams()` com dados únicos por VU |
| `helpers/http.js` | Funções `postEvent()`, `getEvents()`, `getEventById()`, `postTicketType()` com `check()` e métricas `Trend`/`Counter` |

---

## 🔗 Endpoints Testados

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/event` | Criar evento |
| `GET` | `/api/event` | Listar eventos (com filtros opcionais) |
| `GET` | `/api/event/{id}` | Buscar evento por ID |
| `POST` | `/api/event/{id}/ticket-type` | Criar tipo de ingresso |

---

## ▶️ Como Rodar os Testes

### 1. Suba a API localmente

Na raiz do projeto:
```bash
docker compose up --build -d
```

Aguarde o health check ficar `UP`:
```bash
curl http://localhost:8080/api/actuator/health
```

### 2. Execute os testes

> Todos os comandos abaixo devem ser rodados a partir da raiz do projeto.

#### Smoke Test (sanidade — ~30s)
```bash
# Com K6 instalado
k6 run k6/tests/smoke/smoke.test.js

# Via Docker
docker run --rm -i --network host -v "${PWD}/k6:/k6" grafana/k6 run /k6/tests/smoke/smoke.test.js
```

#### Load Test (carga sustentada — ~5min)
```bash
# Com K6 instalado
k6 run k6/tests/load/load.test.js

# Via Docker
docker run --rm -i --network host -v "${PWD}/k6:/k6" grafana/k6 run /k6/tests/load/load.test.js
```

#### Stress Test (carga crescente — ~13min)
```bash
# Com K6 instalado
k6 run k6/tests/stress/stress.test.js

# Via Docker
docker run --rm -i --network host -v "${PWD}/k6:/k6" grafana/k6 run /k6/tests/stress/stress.test.js
```

### Variável de ambiente

Por padrão, os testes apontam para `http://localhost:8080/api`. Para apontar para outro ambiente:

```bash
k6 run -e K6_BASE_URL=https://sua-api.com/api k6/tests/smoke/smoke.test.js
```

---

## 📊 Thresholds (Critérios de Aprovação)

Os thresholds definem o que é considerado sucesso ou falha em cada teste.

| Métrica | Threshold | Descrição |
|---|---|---|
| `http_req_duration` p(95) | < 500ms | 95% das requisições respondem em até 500ms |
| `http_req_duration` p(99) | < 1500ms | 99% das requisições respondem em até 1,5s |
| `http_req_failed` | < 1% | Taxa máxima de erro de 1% |
| `http_reqs` | > 10/s | Throughput mínimo de 10 req/s |

> O **stress test** usa thresholds mais tolerantes (p95 < 800ms, p99 < 2000ms) para permitir identificar a degradação gradual sem falhar prematuramente.

### Métricas customizadas

Além das métricas padrão do K6, o projeto registra métricas por endpoint:

| Métrica | Tipo | Descrição |
|---|---|---|
| `create_event_duration` | Trend | Duração das requisições de criação de evento |
| `list_events_duration` | Trend | Duração das requisições de listagem |
| `get_event_by_id_duration` | Trend | Duração das requisições de busca por ID |
| `create_ticket_type_duration` | Trend | Duração das requisições de criação de ingresso |
| `create_event_errors` | Counter | Total de erros no endpoint de criação |
| `list_events_errors` | Counter | Total de erros no endpoint de listagem |
| `get_event_by_id_errors` | Counter | Total de erros na busca por ID |
| `create_ticket_type_errors` | Counter | Total de erros na criação de ingresso |

---

## 🧪 Tipos de Teste

### Smoke Test
- **VUs:** 1
- **Duração:** 30 segundos
- **Fluxo:** cria evento → cria tipo de ingresso → lista eventos → busca por ID
- **Objetivo:** validar sanidade básica dos endpoints antes de qualquer carga

### Load Test
- **VUs:** ramp-up até 20
- **Duração:** ~5 minutos (1min ramp-up + 3min sustentado + 1min ramp-down)
- **Estratégia:** 1 evento compartilhado entre todos os VUs; mix de 40% leitura por ID, 30% listagem, 30% criação
- **Objetivo:** comportamento sob carga normal esperada

### Stress Test
- **VUs:** ramp-up progressivo até 100
- **Duração:** ~13 minutos (4 níveis de carga × 3min cada + ramp-down)
- **Estratégia:** 1 evento popular compartilhado; mix de 60% leitura por ID, 25% listagem, 15% criação
- **Objetivo:** identificar o ponto de degradação da API sob alta carga simultânea

---

## 📄 Gerando Relatórios HTML

O K6 tem um **web dashboard nativo** que gera relatórios HTML com gráficos de linha do tempo, tabelas de métricas e status dos thresholds — sem instalar nada extra.

### Smoke Test com relatório
```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="k6/reports/smoke-report.html"; k6 run k6/tests/smoke/smoke.test.js
```

### Load Test com relatório
```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="k6/reports/load-report.html"; k6 run k6/tests/load/load.test.js
```

### Stress Test com relatório
```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="k6/reports/stress-report.html"; k6 run k6/tests/stress/stress.test.js
```

Os arquivos HTML gerados ficam em `k6/reports/` e são auto-suficientes — pode abrir no navegador ou compartilhar diretamente. A pasta `k6/reports/` está no `.gitignore` para não versionar os relatórios.

> **Nota:** os gráficos de linha do tempo só aparecem quando a duração do teste é maior que 3× o período de agregação (padrão 10s). O smoke test de 30s já é suficiente para gerar gráficos.

---

## 📈 Exemplo de Output

```
✓ POST /event → status 201
✓ GET /event → status 200
✓ GET /event/{id} → status 200

checks.........................: 100.00% ✓ 120  ✗ 0
data_received..................: 45 kB  1.4 kB/s
data_sent......................: 18 kB  570 B/s
get_event_by_id_duration.......: avg=12ms  min=8ms   med=11ms  max=45ms   p(90)=18ms  p(95)=22ms
http_req_duration..............: avg=15ms  min=8ms   med=13ms  max=52ms   p(90)=22ms  p(95)=28ms
http_req_failed................: 0.00%  ✓ 0    ✗ 30
http_reqs......................: 30     0.95/s
list_events_duration...........: avg=18ms  min=10ms  med=16ms  max=60ms   p(90)=28ms  p(95)=35ms
```

---

## 🔧 CI/CD

O workflow `.github/workflows/k6-tests.yml` executa o **smoke test** automaticamente a cada push, garantindo que nenhum commit quebre os endpoints básicos da API.

Para mais detalhes, veja [k6-tests.yml](../.github/workflows/k6-tests.yml).
