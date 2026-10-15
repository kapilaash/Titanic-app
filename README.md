# Titanic-app

To run this app successfully:
    1. Frontend
    2. Backend
    3. Meilisearch
    4. Observability

## 1. Frontend

Terminal => Git Bash
cd frontend

*http://localhost:3000/*

## 2. Backend

Terminal => cmd
cd backend
venv\Scripts\activate

*C:\project-1-titanic\backend>venv\Scripts\activate*

python app.py

## 3. Meilisearch

Install docker desktop on windows
Terminal => Powershell
cd docker

*docker compose -f docker-compose.meilisearch.yml up* will run with logs

**Start:** docker compose -f docker-compose.meilisearch.yml up -d
**Check Status:** docker ps
**Check logs:** docker logs -f titanic-meilisearch
**Stop:** docker compose -f docker-compose.meilisearch.yml down
**Restart:** docker restart titanic-meilisearch

Go to .env file in backend folder

Comment:
MEILI_URL=https://meilisearch-production-b189.up.railway.app
MEILI_MASTER_KEY= ***************************************************************

Uncomment:
# MEILI_URL=http://127.0.0.1:7700 # https://meilisearch-production-b189.up.railway.app
# MEILI_MASTER_KEY=masterKey # 8f5bbd4ccad8854540e055f66647f243665d08bb9a69c86c9d0e36f23dfe673e

## 4. Observability

Let's deal with Meilisearch first..