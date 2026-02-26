#!/usr/bin/env Rscript

# Script para iniciar a API Plumber
library(plumber)

# Cria a API a partir do arquivo api.R
pr <- plumb("api.R")

# Inicia o servidor na porta 8000
cat("🚀 Iniciando API PLS-SEM na porta 8000...\n")
cat("📊 Acesse http://localhost:8000/__docs__/ para ver a documentação\n")

pr$run(host = "0.0.0.0", port = 8000)
