#!/usr/bin/env Rscript

# Script para testar a geração de plots

library(seminr)
library(DiagrammeR)
library(DiagrammeRsvg)
library(rsvg)

cat("🧪 Testando geração de plots...\n\n")

# Carrega dataset mobi
data("mobi", package = "seminr")

# Cria modelo simples
mm <- constructs(
  composite("Image", multi_items("IMAG", 1:5)),
  composite("Satisfaction", multi_items("CUSA", 1:3))
)

sm <- relationships(
  paths(from = "Image", to = "Satisfaction")
)

cat("⏳ Estimando modelo PLS...\n")
pls_model <- estimate_pls(data = mobi, measurement_model = mm, structural_model = sm)

cat("✅ Modelo estimado\n\n")

cat("⏳ Gerando plot...\n")
diagram <- plot(pls_model, title = "Teste PLS-SEM")

cat("✅ Diagrama gerado (tipo:", class(diagram), ")\n\n")

cat("⏳ Convertendo para SVG...\n")
svg_string <- DiagrammeRsvg::export_svg(diagram)

cat("✅ SVG gerado (", nchar(svg_string), "caracteres)\n\n")

cat("⏳ Convertendo para PNG...\n")
png_data <- rsvg::rsvg_png(charToRaw(svg_string), width = 1200, height = 800)

cat("✅ PNG gerado (", length(png_data), "bytes)\n\n")

cat("💾 Salvando arquivo de teste...\n")
writeBin(png_data, "test_plot.png")

cat("✅ Arquivo salvo como test_plot.png\n\n")

# Teste PDF
cat("⏳ Gerando PDF...\n")
rsvg::rsvg_pdf(charToRaw(svg_string), file = "test_plot.pdf")

cat("✅ PDF salvo como test_plot.pdf\n\n")

cat("🎉 Todos os testes passaram!\n")
