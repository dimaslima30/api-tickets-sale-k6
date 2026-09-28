# api-tickets-sale-k6

> Performance test suite for a ticket sales REST API using K6, covering smoke, load and stress scenarios — built end-to-end with [Amazon Kiro](https://kiro.dev).

Este repositório estende a API de venda de ingressos desenvolvida no TCC com um projeto de **testes de performance** estruturado com o framework [K6](https://k6.io/), integrando CI/CD via GitHub Actions e documentação gerada com auxílio do **Amazon Kiro**.

---

## 🧠 Como o Amazon Kiro foi usado neste projeto

O [Kiro](https://kiro.dev) é um IDE com IA desenvolvido pela Amazon que vai além da geração de código. Neste projeto, três funcionalidades foram utilizadas de forma estruturada:

### 📋 Spec
Antes de escrever qualquer linha de código, foi criada uma **spec** no Kiro com requirements, design e tasks detalhadas. O Kiro analisou os contratos da API (DTOs, validações, regras de negócio) e gerou um plano de implementação completo — revisado e aprovado antes da execução.

A spec está disponível em: `.kiro/specs/k6-performance-tests.md`

### 🤖 Custom Agent — `ticket-sales-api-specialist`
Foi criado um **agent customizado** especializado nas regras de negócio da API. Ele conhece:
- Os contratos de cada endpoint (campos obrigatórios, tipos, validações)
- Os cenários de erro esperados (HTTP 400, 409, 422)
- As particularidades dos payloads para evitar conflitos nos testes

O agent está disponível em: `.kiro/agents/ticket-sales-api-specialist.md`

Qualquer novo teste criado no projeto pode consultar esse agent para garantir que os payloads respeitam as regras da API.

### 📌 Steering File — Setup
Um **steering file** foi configurado com o guia completo de setup do projeto. O Kiro injeta esse contexto automaticamente em todas as sessões, garantindo que qualquer desenvolvedor que abrir o projeto no Kiro já tenha as instruções de instalação e execução disponíveis.

O steering file está em: `.kiro/steering/setup.md`

---

## 🏗️ Sobre a API

A **api-tickets-sale** é uma API REST desenvolvida com **Java 25 + Spring Boot 3.5** como projeto de TCC. Ela gerencia eventos, tipos de ingresso, compra de ingressos e integração com o MercadoPago para processamento de pagamentos.

No TCC, os endpoints foram validados com **Robot Framework**, cobrindo regras de negócio, contratos e cenários de erro. Os testes Robot estão disponíveis na pasta `robot/`.

Este repositório adiciona a camada de **testes de performance** sobre os mesmos endpoints.

---

## 🔗 Endpoints Testados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/event` | Criar evento |
| `GET` | `/api/event` | Listar eventos com filtros opcionais |
| `GET` | `/api/event/{id}` | Buscar evento por ID |
| `POST` | `/api/event/{id}/ticket-type` | Criar tipo de ingresso |

---

## 🧪 Testes de Performance com K6

### Tipos de Teste

| Tipo | VUs | Duração | Objetivo |
|------|-----|---------|----------|
| **Smoke** | 1 | 30s | Sanidade básica — valida que os endpoints respondem antes de qualquer carga |
| **Load** | até 20 | ~5min | Carga sustentada — simula uso normal com ramp-up gradual |
| **Stress** | até 100 | ~13min | Carga crescente — identifica o ponto de degradação da API |

### Thresholds

| Métrica | Threshold |
|---------|-----------|
| `http_req_duration` p(95) | < 500ms |
| `http_req_duration` p(99) | < 1500ms |
| `http_req_failed` | < 1% |
| `http_reqs` | > 10/s |

> O stress test usa thresholds mais tolerantes (p95 < 800ms, p99 < 2000ms) para permitir observar a degradação gradual.

### Estrutura do Projeto K6

```
k6/
├── config/
│   └── options.js          # Stages e thresholds reutilizáveis (smoke, load, stress)
├── data/
│   └── payloads.js         # Geradores de payloads dinâmicos com unicidade por VU/iteração
├── helpers/
│   └── http.js             # Wrapper HTTP com check(), métricas Trend e Counter por endpoint
├── tests/
│   ├── smoke/
│   │   └── smoke.test.js
│   ├── load/
│   │   └── load.test.js
│   └── stress/
│       └── stress.test.js
├── reports/                # Relatórios HTML gerados localmente (ignorado pelo git)
└── README.md
```

---

## 🚀 Como Rodar

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução
- [K6](https://k6.io/docs/get-started/installation/) instalado

```powershell
# Windows
winget install k6 --source winget
```

### 1. Configurar o ambiente

```powershell
Copy-Item .env.example .env
```

### 2. Subir a API

```powershell
docker compose up -d
```

### 3. Verificar o health check

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/actuator/health" | ConvertTo-Json
```

### 4. Rodar os testes

```powershell
# Smoke Test (~30s)
k6 run k6/tests/smoke/smoke.test.js

# Load Test (~5min)
k6 run k6/tests/load/load.test.js

# Stress Test (~13min)
k6 run k6/tests/stress/stress.test.js
```

### 5. Gerar relatório HTML

```powershell
$env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="k6/reports/smoke-report.html"; k6 run k6/tests/smoke/smoke.test.js
```

Abra o arquivo `k6/reports/smoke-report.html` no navegador para visualizar os gráficos de latência, throughput e status dos thresholds.

---

## 🔁 CI/CD

O workflow `.github/workflows/k6-tests.yml` executa o **smoke test** automaticamente a cada push. Load e stress tests ficam disponíveis para disparo manual via `workflow_dispatch`.

---

## 🗂️ Estrutura Completa do Repositório

```
api-tickets-sale-k6/
├── app/                        # API Spring Boot (Java 25 + Spring Boot 3.5)
├── robot/                      # Testes contratuais com Robot Framework (TCC)
├── k6/                         # Testes de performance com K6
├── .kiro/
│   ├── specs/
│   │   └── k6-performance-tests.md     # Spec do projeto K6 gerada com Kiro
│   ├── agents/
│   │   └── ticket-sales-api-specialist.md  # Agent especialista na API
│   └── steering/
│       └── setup.md                    # Guia de setup automático do Kiro
├── .github/
│   └── workflows/
│       └── k6-tests.yml        # Pipeline CI/CD
├── docker-compose.yml          # Orquestração local da API + PostgreSQL
├── .env.example                # Template de variáveis de ambiente
└── README.md
```

---

## 🛠️ Stack

`Java 25` `Spring Boot 3.5` `PostgreSQL` `Docker` `Robot Framework` `K6` `GitHub Actions` `Amazon Kiro`
