# Crypto Trader Bot

## Stack
- Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (banco de dados + realtime)
- Vercel (hospedagem + cron jobs)
- Binance Futures API
- Groq AI (LLaMA 3.3-70B)

## Variáveis de Ambiente necessárias:
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GROQ_API_KEY=
CRON_SECRET=

## Deploy na Vercel (passo a passo):
1. Criar conta em vercel.com
2. Importar repositório GitHub
3. Em "Environment Variables", adicionar todas as variáveis acima
4. Clicar em Deploy
5. Após deploy, ir em Settings > Cron Jobs para verificar o scheduler

## Supabase (passo a passo):
1. Criar projeto em supabase.com
2. Ir em SQL Editor
3. Executar todos os CREATE TABLE do arquivo lib/supabase.ts
4. Ir em Authentication > Policies e habilitar RLS se necessário

## Como usar:
- Acesse o dashboard na URL da Vercel
- Configure os parâmetros das estratégias no StrategyPanel
- Ative o Paper Trade primeiro para testar sem dinheiro real
- Monitore os sinais no TradingLog
- Quando satisfeito com os resultados, desative o Paper Trade

## AVISO DE RISCO:
Trading de futuros de criptomoedas envolve alto risco de perda financeira.
Use sempre o modo Paper Trade para validar estratégias antes de operar com 
dinheiro real. Nunca invista mais do que você pode perder.
