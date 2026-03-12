#!/bin/bash

# FinQuest — dev startup script
# Запускает: postgres, backend, ngrok
# Использование: ./dev.sh

set -e

BACKEND_PORT=3000
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  FinQuest Dev Server${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1. Postgres
echo -e "\n${GREEN}[1/3] Starting PostgreSQL...${NC}"
docker-compose up -d
sleep 2

# 2. NestJS в фоне
echo -e "${GREEN}[2/3] Starting NestJS backend...${NC}"
npm run start:dev &
NEST_PID=$!
sleep 4

# 3. ngrok
echo -e "${GREEN}[3/3] Starting ngrok tunnel...${NC}"
ngrok http $BACKEND_PORT --log=stdout --log-level=warn &
NGROK_PID=$!
sleep 3

# Получаем публичный URL через ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | \
  python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; \
  print(next(t['public_url'] for t in tunnels if t['proto']=='https'))" 2>/dev/null)

echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services running!${NC}\n"
echo -e "  ${YELLOW}API URL:${NC}       ${NGROK_URL}/api"
echo -e "  ${YELLOW}Local API:${NC}     http://localhost:${BACKEND_PORT}/api"
echo -e "  ${YELLOW}ngrok UI:${NC}      http://localhost:4040"
echo -e "\n${YELLOW}📱 BotFather setup (one time per session):${NC}"
echo -e "   /mybots → выбери бота → Bot Settings → Menu Button"
echo -e "   URL: ${NGROK_URL}"
echo -e "\n${YELLOW}🔑 Не забудь обновить BOT_TOKEN в .env${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Ждём Ctrl+C
trap "echo -e '\n${YELLOW}Stopping...${NC}'; kill $NEST_PID $NGROK_PID 2>/dev/null; docker-compose stop; exit 0" INT
wait
