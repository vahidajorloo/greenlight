#First TAKE BACKUP FROM Greenlight-v3 Directory#

then we only need to change greenlight image in docker-compose.yml to:
ghcr.io/vahidajorloo/greenlight-custom:v1.0.2


then run these:

docker compose pull greenlight-v3

docker compose up -d \
  --no-deps \
  --force-recreate \
  greenlight-v3

docker logs -f greenlight-v3

docker exec greenlight-v3 bundle exec rails db:migrate:status
