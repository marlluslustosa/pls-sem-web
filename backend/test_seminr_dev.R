#!/usr/bin/env Rscript

cat("🧪 Testando seminr (versão dev) com PLSpredict...\n\n")

library(seminr)

cat("📊 Versão do seminr:", as.character(packageVersion("seminr")), "\n\n")

# Carrega dataset mobi
data("mobi", package = "seminr")

# Cria modelo simples
mm <- constructs(
  composite("Image", multi_items("IMAG", 1:5)),
  composite("Expectation", multi_items("CUEX", 1:3)),
  composite("Satisfaction", multi_items("CUSA", 1:3)),
  composite("Loyalty", multi_items("CUSL", 1:3))
)

sm <- relationships(
  paths(from = "Image", to = c("Expectation", "Satisfaction")),
  paths(from = "Expectation", to = "Satisfaction"),
  paths(from = "Satisfaction", to = "Loyalty")
)

cat("⏳ Estimando modelo PLS...\n")
pls_model <- estimate_pls(
  data = mobi,
  measurement_model = mm,
  structural_model = sm
)

cat("✅ Modelo estimado\n\n")

# TESTE 1: Bootstrap (verificar se não dá erro de 'cl')
cat("📊 TESTE 1: Bootstrap\n")
cat("⏳ Executando bootstrap (100 iterações)...\n")

tryCatch({
  boot_model <- bootstrap_model(
    seminr_model = pls_model,
    nboot = 100
  )
  cat("✅ Bootstrap executado com sucesso! (sem erro de 'cl')\n\n")
}, error = function(e) {
  cat("❌ Erro no bootstrap:", e$message, "\n\n")
})

# TESTE 2: PLSpredict (verificar se não dá erro de subset)
cat("📊 TESTE 2: PLSpredict\n")
cat("⏳ Executando PLSpredict (5-fold, 5 reps)...\n")

tryCatch({
  pred_result <- predict_pls(
    model = pls_model,
    technique = predict_DA,
    noFolds = 5,
    reps = 5
  )
  cat("✅ PLSpredict executado com sucesso! (sem erro de subset)\n\n")
  
  cat("📈 Resultados:\n")
  print(pred_result)
  
}, error = function(e) {
  cat("❌ Erro no PLSpredict:", e$message, "\n\n")
})

cat("\n🎉 Testes concluídos!\n")
