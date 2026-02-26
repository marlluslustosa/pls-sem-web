#!/usr/bin/env Rscript
# Script para instalar versão de desenvolvimento do seminr (com correções de bugs)

cat("📦 Instalando versão de desenvolvimento do seminr do GitHub...\n\n")

# Verifica se devtools está instalado
if (!requireNamespace("devtools", quietly = TRUE)) {
  cat("📥 Instalando devtools primeiro...\n")
  install.packages("devtools", repos = "https://cloud.r-project.org/")
}

library(devtools)

cat("🔧 Instalando seminr do GitHub (sem-in-r/seminr)...\n")
cat("   Esta versão contém correções de bugs incluindo:\n")
cat("   - Fix para erro de paralelização no bootstrap\n")
cat("   - Fix para erro de subset no pls_predict\n")
cat("   - Melhorias gerais de estabilidade\n\n")

tryCatch({
  devtools::install_github("sem-in-r/seminr")
  
  cat("\n✅ seminr (dev version) instalado com sucesso!\n\n")
  
  # Verifica versão
  cat("📊 Versão instalada:\n")
  cat("   seminr:", as.character(packageVersion("seminr")), "\n\n")
  
  # Testa carregamento
  library(seminr)
  cat("✅ Pacote carregado com sucesso!\n")
  
  # Testa dataset mobi
  data("mobi", package = "seminr")
  cat("✅ Dataset 'mobi' carregado com sucesso!\n")
  
  cat("\n🎉 Instalação completa!\n")
  cat("   Agora execute: Rscript test_seminr_dev.R\n")
  
}, error = function(e) {
  cat("\n❌ Erro ao instalar seminr do GitHub:\n")
  cat("   ", as.character(e), "\n\n")
  cat("💡 Possíveis soluções:\n\n")
  cat("1. Verifique sua conexão com internet\n")
  cat("2. Instale dependências do sistema (se ainda não fez):\n\n")
  cat("   Manjaro/Arch:\n")
  cat("   sudo pacman -S base-devel git curl openssl libxml2 udunits gdal geos proj v8\n\n")
  cat("3. Tente instalar manualmente no R:\n")
  cat("   devtools::install_github('sem-in-r/seminr')\n\n")
})
