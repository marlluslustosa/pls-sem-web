#!/bin/bash

# Script para iniciar o projeto completo

echo "🚀 Iniciando PLS-SEM Web..."
echo ""

# Verifica se o R está instalado
if ! command -v Rscript &> /dev/null; then
    echo "❌ R não está instalado. Por favor, instale o R primeiro."
    exit 1
fi

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

echo "✅ R instalado: $(Rscript --version 2>&1 | head -n 1)"
echo "✅ Node.js instalado: $(node --version)"
echo ""

# Inicia o backend R em background
echo "📡 Iniciando backend R (porta 8000)..."
cd backend
Rscript start_api.R &
BACKEND_PID=$!
cd ..

# Aguarda o backend iniciar
echo "⏳ Aguardando backend inicializar..."
sleep 5

# Inicia o frontend
echo ""
echo "🎨 Iniciando frontend React (porta 5173)..."
cd frontend

# Verifica se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✨ Aplicação iniciada com sucesso!"
echo ""
echo "📊 Backend (R + Plumber): http://localhost:8000"
echo "🌐 Frontend (React): http://localhost:5173"
echo "📚 API Docs: http://localhost:8000/__docs__/"
echo ""
echo "Pressione Ctrl+C para encerrar ambos os servidores"
echo ""

# Função para encerrar processos ao receber Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Encerrando servidores..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Mantém o script rodando
wait
