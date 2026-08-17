# Real Estate Backend

Node.js + Express.js + PostgreSQL backend for the Real Estate Platform.

## Setup

### PostgreSQL

```bash
docker pull postgres:16

docker run --name real_estate \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=real_estate \
  -p 5432:5432 \
  -d postgres:16
```

### Environment

```bash
cp .env.example .env
```

Update `DATABASE_URL` and JWT secrets in `.env`.

### Install & Run

```bash
npm install

npm run migrate

npm run seed

npm run dev
```

`npm run seed` creates around **500 demo listings**.

For 50,000 listings:

```bash
node src/db/seed.js 50000
```

## API

```text
http://localhost:5000
```

## Swagger

```text
http://localhost:5000/api-docs
```
