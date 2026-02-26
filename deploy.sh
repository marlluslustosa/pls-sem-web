#!/bin/bash

# Script de deploy para PLS-SEM Web (WebR)

set -e

echo "🔬 PLS-SEM Web - Deploy Script"
echo "================================"
echo ""

# Escolher modo de deploy
echo "Escolha o modo de deploy:"
echo "1) Netlify (Recomendado)"
echo "2) Vercel"
echo "3) Build local apenas"
echo ""
read -p "Opção [1-3]: " choice

cd "$(dirname "$0")/frontend"

echo ""
echo "📦 Instalando dependências..."
npm ci

echo ""
echo "🏗️  Building aplicação..."
npm run build

case $choice in
  1)
    echo ""
    echo "🚀 Deploy para Netlify..."
    
    # Verifica se netlify-cli está instalado
    if ! command -v netlify &> /dev/null; then
        echo "⚠️  Netlify CLI não encontrado. Instalando..."
        npm install -g netlify-cli
    fi
    
    echo ""
    echo "Iniciando deploy..."
    netlify deploy --prod --dir=dist
    
    echo ""
    echo "✅ Deploy completo!"
    echo "📱 Acesse sua aplicação na URL fornecida acima"
    ;;
    
  2)
    echo ""
    echo "🚀 Deploy para Vercel..."
    
    # Verifica se vercel está instalado
    if ! command -v vercel &> /dev/null; then
        echo "⚠️  Vercel CLI não encontrado. Instalando..."
        npm install -g vercel
    fi
    
    cd ..
    echo ""
    echo "Iniciando deploy..."
    vercel --prod
    
    echo ""
    echo "✅ Deploy completo!"
    ;;
    
  3)
    echo ""
    echo "✅ Build completo!"
    echo "📁 Arquivos gerados em: frontend/dist/"
    echo ""
    echo "Para fazer deploy manual:"
    echo "1. Acesse https://app.netlify.com/drop"
    echo "2. Arraste a pasta 'frontend/dist' para o site"
    echo "3. Pronto!"
    ;;
    
  *)
    echo "❌ Opção inválida"
    exit 1
    ;;
esac

echo ""
echo "🎉 Processo finalizado!"
