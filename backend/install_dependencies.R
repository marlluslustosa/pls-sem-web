# Script para instalar todas as dependências do projeto

# Define biblioteca do usuário se necessário
user_lib <- Sys.getenv("R_LIBS_USER")
if (!dir.exists(user_lib)) {
  dir.create(user_lib, recursive = TRUE)
  cat("📁 Criando biblioteca do usuário:", user_lib, "\n")
}

cat("📦 Instalando pacotes R...\n\n")

# Lista de pacotes
packages <- c("plumber", "jsonlite", "seminr")

# Verifica quais pacotes precisam ser instalados
installed <- installed.packages()[,"Package"]
to_install <- packages[!(packages %in% installed)]

if(length(to_install) == 0) {
  cat("✅ Todos os pacotes já estão instalados!\n\n")
} else {
  cat("Pacotes a instalar:", paste(to_install, collapse = ", "), "\n")
  cat("Biblioteca:", user_lib, "\n\n")
  
  # Instala pacotes básicos primeiro
  basic_pkgs <- intersect(c("plumber", "jsonlite"), to_install)
  if (length(basic_pkgs) > 0) {
    cat("1️⃣ Instalando pacotes básicos...\n")
    install.packages(basic_pkgs, 
                     repos = "https://cloud.r-project.org/",
                     lib = user_lib)
  }
  
  # Tenta instalar seminr (pode falhar se faltarem dependências do sistema)
  if ("seminr" %in% to_install) {
    cat("\n2️⃣ Instalando seminr...\n")
    cat("⚠️  Este pacote requer dependências do sistema.\n")
    cat("   Se falhar, veja: INSTALL_TROUBLESHOOTING.md\n\n")
    
    tryCatch({
      # Primeiro tenta instalar DiagrammeRsvg (requer V8)
      cat("   Instalando dependência DiagrammeRsvg...\n")
      install.packages("DiagrammeRsvg", 
                       repos = "https://cloud.r-project.org/",
                       lib = user_lib)
      
      # Depois instala seminr
      cat("   Instalando seminr...\n")
      install.packages("seminr", 
                       repos = "https://cloud.r-project.org/",
                       lib = user_lib,
                       dependencies = TRUE)
                       
      cat("✅ seminr instalado com sucesso!\n")
    }, error = function(e) {
      cat("❌ Erro ao instalar seminr:\n")
      cat("   ", as.character(e), "\n\n")
      cat("💡 Solução para Manjaro/Arch:\n")
      cat("   sudo pacman -S v8\n")
      cat("   Depois execute novamente: Rscript install_dependencies.R\n\n")
      cat("💡 Solução para Ubuntu/Debian:\n")
      cat("   sudo apt install libv8-dev libnode-dev\n\n")
      cat("💡 Ou instale manualmente no RStudio:\n")
      cat("   install.packages('V8')\n")
      cat("   install.packages('DiagrammeRsvg')\n")
      cat("   install.packages('seminr')\n\n")
    })
  }
}

# Verifica instalação
cat("\n📊 Status dos pacotes:\n")
cat("─────────────────────────────\n")
for(pkg in packages) {
  if (pkg %in% installed.packages()[,"Package"]) {
    version <- packageVersion(pkg)
    cat(sprintf("  ✅ %s: %s\n", pkg, version))
  } else {
    cat(sprintf("  ❌ %s: NÃO INSTALADO\n", pkg))
  }
}

# Mensagem final
cat("\n")
if (all(packages %in% installed.packages()[,"Package"])) {
  cat("🎉 Instalação completa!\n")
  cat("Execute: Rscript start_api.R\n")
} else {
  cat("⚠️  Alguns pacotes não foram instalados.\n")
  cat("Consulte: INSTALL_TROUBLESHOOTING.md\n")
  cat("\nVocê ainda pode testar com: Rscript start_api.R\n")
  cat("(A API funcionará parcialmente sem o seminr)\n")
}
