#!/usr/bin/env Rscript

# Script para verificar se todos os pacotes necessários estão instalados

cat("🔍 Verificando instalação de pacotes R...\n\n")

required_packages <- c(
  "plumber",
  "seminr", 
  "jsonlite",
  "DiagrammeR",
  "DiagrammeRsvg",
  "rsvg"
)

missing_packages <- character(0)
installed_packages <- character(0)

for (pkg in required_packages) {
  if (requireNamespace(pkg, quietly = TRUE)) {
    cat(sprintf("✓ %s instalado\n", pkg))
    installed_packages <- c(installed_packages, pkg)
  } else {
    cat(sprintf("✗ %s FALTANDO\n", pkg))
    missing_packages <- c(missing_packages, pkg)
  }
}

cat("\n")

if (length(missing_packages) > 0) {
  cat("❌ Pacotes faltando:", paste(missing_packages, collapse=", "), "\n\n")
  cat("Para instalar:\n")
  cat(sprintf("install.packages(c(%s))\n", 
              paste(sprintf("'%s'", missing_packages), collapse=", ")))
  quit(status = 1)
} else {
  cat("✅ Todos os pacotes estão instalados!\n\n")
  
  # Verifica versões
  cat("📦 Versões instaladas:\n")
  for (pkg in installed_packages) {
    version <- packageVersion(pkg)
    cat(sprintf("   %s: %s\n", pkg, version))
  }
  
  cat("\n✨ Sistema pronto para uso!\n")
  quit(status = 0)
}
