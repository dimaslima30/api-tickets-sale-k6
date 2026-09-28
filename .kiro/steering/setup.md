# Guia de Setup — api-tickets-sale-k6

Este documento orienta qualquer pessoa que clonar o repositório a configurar e rodar o projeto localmente, do zero.

---

## Pré-requisitos

### 1. Docker Desktop
A API e o banco de dados rodam via Docker Compose. É obrigatório ter o Docker Desktop instalado e **em execução** antes de qualquer comando.

- Download: https://www.docker.com/products/docker-desktop/
- Após instalar, abra o Docker Desktop e aguarde o ícone da baleia ficar estável na bandeja do sistema.
- Confirme a instalação:
  ```powershell
  docker --version
  ```

> ⚠️ O erro `failed to connect to the docker API` indica que o Docker Desktop não está rodando. Abra-o antes de continuar.

### 2. K6
Ferramenta de testes de performance. Necessária apenas para rodar os testes — não é necessária para subir a API.

**Windows (via winget):**
```powershell
winget install k6 --source winget
```

**macOS (via Homebrew):**
```bash
brew install k6
```

**Via Docker (sem instalação local):**
```bash
docker run --rm -i grafana/k6 version
```

Confirme a instalação:
```powershell
k6 version
```

---

## Configuração do Ambiente

### 1. Crie o arquivo `.env`

Copie o arquivo de exemplo e ajuste se necessário:

```powershell
Copy-Item .env.example .env
```

O `.env.example` já contém valores prontos para uso local:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ticket_sales
MERCADOPAGO_ACCESS_TOKEN=dummy_token
MERCADOPAGO_NOTIFICATION_URL=http://localhost:8080/api/webhooks/mercadopago
```

> ℹ️ O token do MercadoPago é necessário apenas para o fluxo de compra de ingressos, que **não faz parte** dos testes de performance deste projeto. O valor `dummy_token` é suficiente para subir a API.

### 2. Suba a API

Na raiz do repositório:

```powershell
docker compose up --build
```

A primeira execução baixa as imagens e compila o projeto com Maven — pode levar alguns minutos.

Quando aparecer no log:
```
Started ApiTicketSalesApplication in X.XXX seconds
```
...a API está pronta.

### 3. Verifique o Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/actuator/health" | ConvertTo-Json
```

Resposta esperada:
```json
{ "status": "UP" }
```

---

## Rodando os Testes de Performance

Todos os comandos devem ser executados na **raiz do repositório**.

### Smoke Test (~30s)
```powershell
k6 run k6/tests/smoke/smoke.test.js
```

### Load Test (~5min)
```powershell
k6 run k6/tests/load/load.test.js
```

### Stress Test (~13min)
```powershell
k6 run k6/tests/stress/stress.test.js
```

### Gerando Relatório HTML

```powershell
$env:K6_WEB_DASHBOARD="true"
$env:K6_WEB_DASHBOARD_EXPORT="k6/reports/smoke-report.html"
k6 run k6/tests/smoke/smoke.test.js
```

Abra o arquivo gerado em `k6/reports/smoke-report.html` no navegador.

---

## Explorando a API

Com a API rodando, acesse:

| URL | Descrição |
|-----|-----------|
| http://localhost:8080/api/swagger-ui.html | Documentação interativa (Swagger UI) |
| http://localhost:8080/api/actuator/health | Health check |

---

## Parando os Containers

```powershell
docker compose down
```

Para remover também os dados do banco:
```powershell
docker compose down -v
```

---

## Problemas Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `failed to connect to the docker API` | Docker Desktop não está rodando | Abra o Docker Desktop |
| `docker` não reconhecido | Docker não está no PATH | Feche e abra um novo terminal após instalar |
| `409 Evento existente` nos testes | Dados de execuções anteriores no banco | Normal — os payloads são únicos por execução via timestamp |
| Porta 8080 ocupada | Outro processo usando a porta | Pare o processo ou altere a porta no `docker-compose.yml` |
| Porta 5432 ocupada | PostgreSQL local rodando na máquina | Pare o PostgreSQL local ou altere a porta no `docker-compose.yml` |
