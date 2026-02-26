library(plumber)
library(seminr)
library(jsonlite)

# Desabilita notação científica
options(scipen = 999)

# Variáveis globais
last_pls_model <- NULL

#* @apiTitle PLS-SEM API
#* @apiDescription API para análise PLS-SEM usando o pacote seminr

#* Retorna informações sobre a API
#* @get /
function() {
  list(
    message = "PLS-SEM API está rodando!",
    version = "2.0",
    seminr_version = as.character(packageVersion("seminr")),
    endpoints = c("/run-analysis", "/bootstrap", "/pls-predict")
  )
}

#* Executa análise PLS-SEM
#* @post /run-analysis
function() {
  tryCatch({
    # Carrega dataset mobi
    data("mobi", package = "seminr")
    
    # Define modelo de mensuração
    mobi_mm <- constructs(
      composite("Image", multi_items("IMAG", 1:5)),
      composite("Expectation", multi_items("CUEX", 1:3)),
      composite("Quality", multi_items("PERQ", 1:7)),
      composite("Value", multi_items("PERV", 1:2)),
      composite("Satisfaction", multi_items("CUSA", 1:3)),
      composite("Complaints", single_item("CUSCO")),
      composite("Loyalty", multi_items("CUSL", 1:3))
    )
    
    # Define modelo estrutural
    mobi_sm <- relationships(
      paths(from = "Image", to = c("Expectation", "Satisfaction", "Loyalty")),
      paths(from = "Expectation", to = c("Quality", "Value", "Satisfaction")),
      paths(from = "Quality", to = c("Value", "Satisfaction")),
      paths(from = "Value", to = c("Satisfaction")),
      paths(from = "Satisfaction", to = c("Complaints", "Loyalty")),
      paths(from = "Complaints", to = "Loyalty")
    )
    
    # Estima modelo PLS
    pls_model <- estimate_pls(
      data = mobi,
      measurement_model = mobi_mm,
      structural_model = mobi_sm
    )
    
    # Salva modelo globalmente para uso posterior
    assign("last_pls_model", pls_model, envir = .GlobalEnv)
    
    # Extrai resultados
    summary_result <- summary(pls_model)
    
    # Path coefficients (excluindo linhas R² e AdjR²)
    paths <- summary_result$paths
    path_coefficients <- list()
    
    # Identifica apenas linhas de constructs (não métricas)
    construct_rows <- rownames(paths)[!rownames(paths) %in% c("R^2", "AdjR^2")]
    
    for (row_name in construct_rows) {
      for (col_name in colnames(paths)) {
        value <- paths[row_name, col_name]
        if (!is.na(value) && value != 0) {
          path_name <- paste(row_name, "->", col_name)
          path_coefficients[[path_name]] <- as.numeric(value)
        }
      }
    }
    
    # R² values (extrai da linha específica R²)
    r_squared <- list()
    r2_row <- paths["R^2", ]
    for (construct in names(r2_row)) {
      if (!is.na(r2_row[[construct]]) && r2_row[[construct]] > 0) {
        r_squared[[construct]] <- as.numeric(r2_row[[construct]])
      }
    }
    
    return(list(
      success = TRUE,
      path_coefficients = path_coefficients,
      r_squared = r_squared
    ))
    
  }, error = function(e) {
    return(list(
      success = FALSE,
      error = paste("Erro na análise:", e$message)
    ))
  })
}

#* Executa bootstrap
#* @post /bootstrap
function(nboot = 100, seed = 123) {
  tryCatch({
    if (!exists("last_pls_model", envir = .GlobalEnv)) {
      return(list(
        success = FALSE,
        error = "Nenhum modelo foi estimado ainda. Execute /run-analysis primeiro."
      ))
    }
    
    # Recupera o último modelo
    pls_model <- get("last_pls_model", envir = .GlobalEnv)
    
    # Define seed para reprodutibilidade
    set.seed(as.numeric(seed))
    
    cat("\n=== Bootstrap ===\n")
    cat("Iterations:", nboot, "\n")
    cat("Seed:", seed, "\n")
    
    # Executa bootstrap usando a versão corrigida do seminr
    # Não precisa mais de workarounds!
    boot_estimates <- bootstrap_model(
      seminr_model = pls_model,
      nboot = as.numeric(nboot)
    )
    
    cat("✅ Bootstrap executado com sucesso!\n")
    
    # Extrai resultados
    boot_summary <- summary(boot_estimates)
    boot_paths <- as.data.frame(boot_summary$bootstrapped_paths)
    
    # Formata resultados
    bootstrap_summary <- list()
    
    for (path_name in rownames(boot_paths)) {
      bootstrap_summary[[path_name]] <- list(
        original_estimate = as.numeric(boot_paths[path_name, "Original Est."]),
        bootstrap_mean = as.numeric(boot_paths[path_name, "Bootstrap Mean"]),
        bootstrap_sd = as.numeric(boot_paths[path_name, "Bootstrap SD"]),
        t_value = as.numeric(boot_paths[path_name, "T Stat."]),
        ci_lower = as.numeric(boot_paths[path_name, "2.5% CI"]),
        ci_upper = as.numeric(boot_paths[path_name, "97.5% CI"])
      )
    }
    
    return(list(
      success = TRUE,
      nboot = as.numeric(nboot),
      bootstrap_summary = bootstrap_summary
    ))
    
  }, error = function(e) {
    cat("❌ Erro:", e$message, "\n")
    return(list(
      success = FALSE,
      error = paste("Bootstrap failed:", e$message)
    ))
  })
}

#* Executa PLSpredict (out-of-sample prediction)
#* @post /pls-predict
#* @serializer json
function(req, res, k = 10, reps = 10, seed = 123) {
  tryCatch({
    if (!exists("last_pls_model", envir = .GlobalEnv)) {
      res$body <- toJSON(list(
        success = FALSE,
        error = "Nenhum modelo foi estimado ainda. Execute /run-analysis primeiro."
      ), auto_unbox = TRUE)
      return(res)
    }
    
    # Recupera o último modelo
    pls_model <- get("last_pls_model", envir = .GlobalEnv)
    
    # Define seed para reprodutibilidade
    set.seed(as.numeric(seed))
    
    cat("\n=== PLSpredict ===\n")
    cat("K-folds:", k, "\n")
    cat("Repetitions:", reps, "\n")
    cat("Seed:", seed, "\n")
    
    # Converte para data.frame explicitamente (precaução)
    pls_model$data <- as.data.frame(pls_model$data)
    
    # Usa a versão corrigida do seminr - funciona sem workarounds!
    pred_result <- predict_pls(
      model = pls_model,
      technique = predict_DA,
      noFolds = as.numeric(k),
      reps = as.numeric(reps)
    )
    
    cat("✅ PLSpredict executado com sucesso!\n")
    
    # Obtém sumário detalhado
    pred_summary <- summary(pred_result)
    
    # DEBUG: Mostra estrutura do sumário
    cat("DEBUG - Nomes no pred_summary:\n")
    print(names(pred_summary))
    cat("\n")
    
    # Salva resultado para plotagem posterior
    assign("last_predict_result", pred_result, envir = .GlobalEnv)
    
    # Extrai métricas detalhadas
    construct_metrics <- list()
    indicator_metrics <- list()
    
    # Métricas por indicador (item-level)
    pls_in_sample <- pred_summary$PLS_in_sample
    pls_out_sample <- pred_summary$PLS_out_of_sample
    lm_in_sample <- pred_summary$LM_in_sample
    lm_out_sample <- pred_summary$LM_out_of_sample
    
    # Para cada indicador
    if (!is.null(pls_in_sample)) {
      indicator_names <- colnames(pls_in_sample)
      
      for (indicator in indicator_names) {
        indicator_metrics[[indicator]] <- list(
          PLS = list(
            in_sample = list(
              RMSE = as.numeric(pls_in_sample["RMSE", indicator]),
              MAE = as.numeric(pls_in_sample["MAE", indicator])
            ),
            out_sample = list(
              RMSE = as.numeric(pls_out_sample["RMSE", indicator]),
              MAE = as.numeric(pls_out_sample["MAE", indicator])
            )
          ),
          LM = list(
            in_sample = list(
              RMSE = as.numeric(lm_in_sample["RMSE", indicator]),
              MAE = as.numeric(lm_in_sample["MAE", indicator])
            ),
            out_sample = list(
              RMSE = as.numeric(lm_out_sample["RMSE", indicator]),
              MAE = as.numeric(lm_out_sample["MAE", indicator])
            )
          )
        )
      }
    }
    
    # Métricas por construto (construct-level)
    if (!is.null(pred_summary$construct_level_metrics)) {
      construct_level <- pred_summary$construct_level_metrics
      construct_names <- rownames(construct_level)
      
      cat("DEBUG - Constructs encontrados:", length(construct_names), "\n")
      print(construct_names)
      
      for (construct in construct_names) {
        construct_metrics[[construct]] <- list(
          IS_MSE = as.numeric(construct_level[construct, "IS_MSE"]),
          IS_MAE = as.numeric(construct_level[construct, "IS_MAE"]),
          OOS_MSE = as.numeric(construct_level[construct, "OOS_MSE"]),
          OOS_MAE = as.numeric(construct_level[construct, "OOS_MAE"]),
          overfit = as.numeric(construct_level[construct, "overfit"])
        )
      }
    } else {
      cat("⚠️  AVISO: construct_level_metrics não encontrado no sumário!\n")
      cat("Tentando calcular manualmente...\n")
      
      # Fallback: calcula métricas agregadas a partir dos indicadores
      # Agrupa indicadores por construto (prefixo)
      if (!is.null(pls_in_sample)) {
        indicator_names <- colnames(pls_in_sample)
        
        # Extrai prefixos únicos (CUEX, CUSA, CUSL, etc)
        construct_prefixes <- unique(gsub("\\d+$", "", indicator_names))
        
        for (prefix in construct_prefixes) {
          # Indicadores deste construto
          indicators <- grep(paste0("^", prefix), indicator_names, value = TRUE)
          
          if (length(indicators) > 0) {
            # Calcula médias das métricas dos indicadores
            is_mse_vals <- sapply(indicators, function(ind) {
              (pls_in_sample["RMSE", ind])^2
            })
            oos_mse_vals <- sapply(indicators, function(ind) {
              (pls_out_sample["RMSE", ind])^2
            })
            
            is_mse <- mean(is_mse_vals, na.rm = TRUE)
            oos_mse <- mean(oos_mse_vals, na.rm = TRUE)
            is_mae <- mean(sapply(indicators, function(ind) pls_in_sample["MAE", ind]), na.rm = TRUE)
            oos_mae <- mean(sapply(indicators, function(ind) pls_out_sample["MAE", ind]), na.rm = TRUE)
            
            construct_metrics[[prefix]] <- list(
              IS_MSE = as.numeric(is_mse),
              IS_MAE = as.numeric(is_mae),
              OOS_MSE = as.numeric(oos_mse),
              OOS_MAE = as.numeric(oos_mae),
              overfit = as.numeric((oos_mse - is_mse) / is_mse)
            )
          }
        }
        
        cat("✅ Calculadas métricas para", length(construct_metrics), "construtos via fallback\n")
      }
    }
    
    cat("DEBUG - Total construct_metrics:", length(construct_metrics), "\n")
    cat("DEBUG - Total indicator_metrics:", length(indicator_metrics), "\n")
    
    # Garante que listas vazias viram objetos JSON vazios {}
    if (length(construct_metrics) == 0) {
      construct_metrics <- structure(list(), names = character(0))
    }
    if (length(indicator_metrics) == 0) {
      indicator_metrics <- structure(list(), names = character(0))
    }
    
    # Retorna estrutura completa usando toJSON com auto_unbox
    result <- list(
      success = TRUE,
      folds = as.numeric(k),
      repetitions = as.numeric(reps),
      method = "seminr_predict_pls_dev",
      construct_metrics = construct_metrics,
      indicator_metrics = indicator_metrics,
      summary_available = TRUE
    )
    
    cat("DEBUG - Retornando resultado\n")
    
    # Serializa manualmente com auto_unbox
    res$body <- toJSON(result, auto_unbox = TRUE, digits = 6)
    return(res)
    
  }, error = function(e) {
    cat("❌ Erro:", e$message, "\n")
    res$body <- toJSON(list(
      success = FALSE,
      error = paste("Erro no PLSpredict:", e$message)
    ), auto_unbox = TRUE)
    return(res)
  })
}

#* Gera gráfico de erro de predição para um indicador específico
#* @get /pls-predict-plot
#* @serializer png
function(indicator = NULL, res) {
  tryCatch({
    if (!exists("last_predict_result", envir = .GlobalEnv)) {
      stop("Nenhum PLSpredict foi executado ainda. Execute /pls-predict primeiro.")
    }
    
    pred_result <- get("last_predict_result", envir = .GlobalEnv)
    pred_summary <- summary(pred_result)
    
    # Se nenhum indicador especificado, usa o primeiro disponível
    if (is.null(indicator) || indicator == "") {
      indicators <- colnames(pred_summary$PLS_in_sample)
      indicator <- indicators[1]
    }
    
    # Gera o plot
    print(plot(pred_summary, indicator = indicator))
    
  }, error = function(e) {
    plot.new()
    text(0.5, 0.5, paste("Erro ao gerar gráfico:", e$message), cex = 1.2)
  })
}

#* Lista indicadores disponíveis para plotagem
#* @get /pls-predict-indicators
function() {
  tryCatch({
    if (!exists("last_predict_result", envir = .GlobalEnv)) {
      return(list(
        success = FALSE,
        error = "Nenhum PLSpredict foi executado ainda."
      ))
    }
    
    pred_result <- get("last_predict_result", envir = .GlobalEnv)
    pred_summary <- summary(pred_result)
    
    # Extrai indicadores disponíveis
    indicators <- colnames(pred_summary$PLS_in_sample)
    
    # Agrupa por construto (baseado no prefixo antes do número)
    indicators_by_construct <- list()
    
    for (ind in indicators) {
      # Extrai prefixo (ex: "IMAG" de "IMAG1")
      prefix <- gsub("[0-9]+$", "", ind)
      
      if (is.null(indicators_by_construct[[prefix]])) {
        indicators_by_construct[[prefix]] <- c()
      }
      indicators_by_construct[[prefix]] <- c(indicators_by_construct[[prefix]], ind)
    }
    
    return(list(
      success = TRUE,
      indicators = as.list(indicators),
      by_construct = indicators_by_construct
    ))
    
  }, error = function(e) {
    return(list(
      success = FALSE,
      error = paste("Erro:", e$message)
    ))
  })
}

#* Gera gráfico do modelo (placeholder - será implementado)
#* @get /plot-model
#* @serializer png
function() {
  if (!exists("last_pls_model", envir = .GlobalEnv)) {
    stop("Nenhum modelo foi estimado ainda.")
  }
  
  pls_model <- get("last_pls_model", envir = .GlobalEnv)
  plot(pls_model)
}