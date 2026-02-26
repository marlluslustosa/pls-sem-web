import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

// WebR será carregado dinamicamente
let webR = null;

const initialNodes = [
  {
    id: 'Image',
    type: 'default',
    data: { label: 'Image' },
    position: { x: 250, y: 50 },
  },
  {
    id: 'Expectation',
    type: 'default',
    data: { label: 'Expectation' },
    position: { x: 100, y: 150 },
  },
  {
    id: 'Quality',
    type: 'default',
    data: { label: 'Quality' },
    position: { x: 250, y: 200 },
  },
  {
    id: 'Value',
    type: 'default',
    data: { label: 'Value' },
    position: { x: 400, y: 200 },
  },
  {
    id: 'Satisfaction',
    type: 'default',
    data: { label: 'Satisfaction' },
    position: { x: 250, y: 350 },
  },
  {
    id: 'Loyalty',
    type: 'default',
    data: { label: 'Loyalty' },
    position: { x: 250, y: 500 },
  },
];

const initialEdges = [];

function AppWebR() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newConstructName, setNewConstructName] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapResults, setBootstrapResults] = useState(null);
  const [activeView, setActiveView] = useState('builder');
  const [rightPanel, setRightPanel] = useState('results');
  
  // WebR status
  const [webRStatus, setWebRStatus] = useState('loading'); // 'loading', 'ready', 'error'
  const [webRMessage, setWebRMessage] = useState('Initializing WebR...');
  const [usingSeminr, setUsingSeminr] = useState(false); // Flag para saber se seminr está disponível
  
  // PLS Parameters
  const [nboot, setNboot] = useState(100);
  const [maxIterations, setMaxIterations] = useState(300);
  const [stopCriterion, setStopCriterion] = useState(7);
  const [randomSeed, setRandomSeed] = useState(123); // Seed para reprodutibilidade
  
  // PLSpredict
  const [predicting, setPredicting] = useState(false);
  const [predictResults, setPredictResults] = useState(null);
  const [plsFolds, setPlsFolds] = useState(10);
  const [plsReps, setPlsReps] = useState(10);
  const [plsNoFolds, setPlsNoFolds] = useState(false);
  
  const [modelNodes, setModelNodes, onModelNodesChange] = useNodesState([]);
  const [modelEdges, setModelEdges, onModelEdgesChange] = useEdgesState([]);

  // Inicializar WebR
  useEffect(() => {
    const initWebR = async () => {
      try {
        setWebRMessage('Loading WebR runtime...');
        
        // Importa WebR dinamicamente
        const { WebR } = await import('webr');
        webR = new WebR({
          baseUrl: 'https://webr.r-wasm.org/latest/',
          serviceWorkerUrl: '',
        });
        
        await webR.init();
        console.log('✅ WebR initialized');
        
        // Verificar pacotes disponíveis
        setWebRMessage('Checking available packages...');
        
        // Tentar instalar pacotes estatísticos básicos que estão disponíveis no WebR
        try {
          await webR.evalRVoid(`
            options(repos = c(CRAN = "https://repo.r-wasm.org/"))
          `);
          
          console.log('📦 Attempting to install seminr...');
          setWebRMessage('Attempting to install seminr package...');
          
          // Tentar instalar seminr
          try {
            await webR.installPackages(['seminr']);
            console.log('✅ seminr installed successfully!');
            
            // Carregar seminr e dataset mobi
            await webR.evalRVoid(`
              library(seminr)
              data("mobi", package = "seminr")
            `);
            
            setUsingSeminr(true);
            setWebRStatus('ready');
            setWebRMessage('✓ WebR ready with seminr package!');
            console.log('✅ WebR environment ready with seminr');
            return;
            
          } catch (seminrError) {
            console.warn('⚠️ seminr not available:', seminrError.message);
            setWebRMessage('seminr not available, using simplified PLS implementation...');
          }
          
          // Se seminr não está disponível, usar implementação alternativa
          console.log('📦 Using simplified PLS implementation...');
          setWebRMessage('Setting up simplified PLS calculation environment...');
          
          // Carregar dados de exemplo (mobi dataset inline com correlações)
          await webR.evalRVoid(`
            # Criar dataset mobi com correlações realistas
            set.seed(123)  # Para reprodutibilidade
            n <- 250
            
            # Criar variáveis latentes base
            Image_latent <- rnorm(n)
            Expectation_latent <- 0.65 * Image_latent + rnorm(n, sd = 0.76)
            Quality_latent <- 0.7 * Expectation_latent + rnorm(n, sd = 0.71)
            Value_latent <- 0.6 * Quality_latent + 0.1 * Image_latent + rnorm(n, sd = 0.78)
            Satisfaction_latent <- 0.6 * Image_latent + 0.24 * Expectation_latent + 
                                   0.52 * Quality_latent + 0.09 * Value_latent + rnorm(n, sd = 0.52)
            Loyalty_latent <- 0.54 * Satisfaction_latent + rnorm(n, sd = 0.71)
            
            # Criar indicadores observados a partir das variáveis latentes
            # Escala de 1-10
            scale_var <- function(x) {
              scaled <- (x - mean(x)) / sd(x)  # Padronizar
              scaled <- scaled * 1.2 + 6  # Média ~6, SD ~1.2
              pmin(pmax(scaled, 1), 10)  # Limitar entre 1 e 10
            }
            
            mobi <- data.frame(
              IMAG1 = scale_var(Image_latent + rnorm(n, sd = 0.3)),
              IMAG2 = scale_var(Image_latent + rnorm(n, sd = 0.3)),
              IMAG3 = scale_var(Image_latent + rnorm(n, sd = 0.3)),
              IMAG4 = scale_var(Image_latent + rnorm(n, sd = 0.3)),
              IMAG5 = scale_var(Image_latent + rnorm(n, sd = 0.3)),
              
              CUEX1 = scale_var(Expectation_latent + rnorm(n, sd = 0.3)),
              CUEX2 = scale_var(Expectation_latent + rnorm(n, sd = 0.3)),
              CUEX3 = scale_var(Expectation_latent + rnorm(n, sd = 0.3)),
              
              PERQ1 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ2 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ3 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ4 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ5 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ6 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              PERQ7 = scale_var(Quality_latent + rnorm(n, sd = 0.3)),
              
              PERV1 = scale_var(Value_latent + rnorm(n, sd = 0.3)),
              PERV2 = scale_var(Value_latent + rnorm(n, sd = 0.3)),
              
              CUSA1 = scale_var(Satisfaction_latent + rnorm(n, sd = 0.3)),
              CUSA2 = scale_var(Satisfaction_latent + rnorm(n, sd = 0.3)),
              CUSA3 = scale_var(Satisfaction_latent + rnorm(n, sd = 0.3)),
              
              CUSL1 = scale_var(Loyalty_latent + rnorm(n, sd = 0.3)),
              CUSL2 = scale_var(Loyalty_latent + rnorm(n, sd = 0.3)),
              CUSL3 = scale_var(Loyalty_latent + rnorm(n, sd = 0.3))
            )
            
            # Função simplificada de PLS-PM (PLS Path Modeling)
            simple_pls <- function(data, constructs, relationships) {
              # Calcular composites (média dos indicadores)
              composites <- list()
              for (construct in names(constructs)) {
                cols <- constructs[[construct]]
                composites[[construct]] <- rowMeans(data[, cols, drop = FALSE])
              }
              composite_df <- as.data.frame(composites)
              
              # Calcular path coefficients (regressões simples)
              path_coefs <- list()
              r_squared <- list()
              
              for (rel in relationships) {
                from <- rel$from
                to <- rel$to
                
                # Regressão linear simples
                formula <- as.formula(paste(to, "~", from))
                model <- lm(formula, data = composite_df)
                
                path_coefs[[paste(from, "->", to)]] <- coef(model)[2]
                r_squared[[to]] <- summary(model)$r.squared
              }
              
              list(
                path_coefficients = path_coefs,
                r_squared = r_squared,
                composites = composite_df
              )
            }
            
            # Função de bootstrap simplificada
            simple_bootstrap <- function(data, constructs, relationships, nboot = 100) {
              n <- nrow(data)
              boot_paths <- list()
              
              for (i in 1:nboot) {
                # Bootstrap sample
                boot_idx <- sample(1:n, n, replace = TRUE)
                boot_data <- data[boot_idx, ]
                
                # Calcular PLS no bootstrap sample
                boot_result <- simple_pls(boot_data, constructs, relationships)
                
                # Armazenar path coefficients
                for (path_name in names(boot_result$path_coefficients)) {
                  if (is.null(boot_paths[[path_name]])) {
                    boot_paths[[path_name]] <- numeric(nboot)
                  }
                  boot_paths[[path_name]][i] <- boot_result$path_coefficients[[path_name]]
                }
              }
              
              # Calcular estatísticas do bootstrap
              boot_summary <- list()
              for (path_name in names(boot_paths)) {
                values <- boot_paths[[path_name]]
                boot_summary[[path_name]] <- list(
                  mean = mean(values),
                  sd = sd(values),
                  ci_lower = quantile(values, 0.025),
                  ci_upper = quantile(values, 0.975)
                )
              }
              
              boot_summary
            }
          `);
          
          setWebRStatus('ready');
          setWebRMessage('✓ WebR ready! Using simplified PLS implementation.');
          console.log('✅ WebR environment ready');
          
        } catch (pkgError) {
          console.error('Package installation error:', pkgError);
          throw new Error(`Failed to setup R environment: ${pkgError.message}`);
        }
        
      } catch (err) {
        console.error('WebR init error:', err);
        setWebRStatus('error');
        setWebRMessage(`Error initializing WebR: ${err.message}`);
        setError(`Failed to initialize WebR: ${err.message}`);
      }
    };

    initWebR();
  }, []);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const addConstruct = () => {
    if (!newConstructName.trim()) return;

    const newNode = {
      id: newConstructName,
      type: 'default',
      data: { label: newConstructName },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNewConstructName('');
  };

  const runAnalysisWebR = async () => {
    if (webRStatus !== 'ready') {
      setError('WebR is not ready yet. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const relationships = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      console.log('Running analysis with WebR...', { usingSeminr, relationships });

      // Se seminr está disponível, usar implementação real
      if (usingSeminr) {
        let rCode = `
          library(seminr)
          
          # Carrega dataset
          data("mobi", package = "seminr")
          
          # Modelo de mensuração
          measurements <- constructs(
            composite("Image", multi_items("IMAG", 1:5)),
            composite("Expectation", multi_items("CUEX", 1:3)),
            composite("Quality", multi_items("PERQ", 1:7)),
            composite("Value", multi_items("PERV", 1:2)),
            composite("Satisfaction", multi_items("CUSA", 1:3)),
            composite("Loyalty", multi_items("CUSL", 1:3))
          )
          
          # Agrupa relações por fonte
          from_to_map <- list()
        `;

        relationships.forEach(rel => {
          rCode += `
          if (is.null(from_to_map[["${rel.source}"]])) {
            from_to_map[["${rel.source}"]] <- c()
          }
          from_to_map[["${rel.source}"]] <- c(from_to_map[["${rel.source}"]], "${rel.target}")
          `;
        });

        rCode += `
          # Cria paths
          path_list <- list()
          for (from_construct in names(from_to_map)) {
            to_constructs <- from_to_map[[from_construct]]
            path_list[[length(path_list) + 1]] <- paths(from = from_construct, to = to_constructs)
          }
          
          sm <- do.call(relationships, path_list)
          
          # Estima o modelo PLS
          pls_model <- estimate_pls(
            data = mobi,
            measurement_model = measurements,
            structural_model = sm,
            maxIt = ${maxIterations},
            stopCriterion = ${stopCriterion}
          )
          
          # Salva globalmente para uso no bootstrap - IMPORTANTE!
          .GlobalEnv$saved_pls_model <- pls_model
          
          # Extrai resultados
          summary_result <- summary(pls_model)
          paths_matrix <- summary_result$paths
          
          # DEBUG: Mostra a estrutura completa da matriz
          cat("\\n=== DEBUG: MATRIZ PATHS COMPLETA ===\\n")
          print(paths_matrix)
          cat("\\n=== DEBUG: ROWNAMES ===\\n")
          print(rownames(paths_matrix))
          cat("\\n=== DEBUG: Tipo de cada rowname ===\\n")
          for (rn in rownames(paths_matrix)) {
            cat(sprintf("'%s' (class: %s)\\n", rn, class(rn)))
          }
          cat("\\n")
          
          # Função para formatar valores numéricos para JSON
          format_num <- function(x) {
            if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
            return(as.character(x))
          }
          
          # Extrair path coefficients e R² separadamente
          path_coef_list <- list()
          r2_list <- list()
          
          # Identifica linhas que são constructs (não são R² ou AdjR²)
          construct_rows <- rownames(paths_matrix)[!rownames(paths_matrix) %in% c("R^2", "AdjR^2")]
          
          # DEBUG: mostra quais linhas foram identificadas
          cat("DEBUG - Todas as linhas da matriz:\\n")
          print(rownames(paths_matrix))
          cat("\\nDEBUG - Linhas identificadas como constructs:\\n")
          print(construct_rows)
          cat("\\n")
          
          # PATH COEFFICIENTS: somente entre constructs
          for (col_name in colnames(paths_matrix)) {
            for (row_name in construct_rows) {
              value <- paths_matrix[row_name, col_name]
              
              # Adiciona apenas se não for NA e não for zero
              if (!is.na(value) && value != 0) {
                path_name <- paste0(row_name, " -> ", col_name)
                path_coef_list[[path_name]] <- value
              }
            }
          }
          
          # R²: extrai da linha "R^2" da matriz
          if ("R^2" %in% rownames(paths_matrix)) {
            r2_row <- paths_matrix["R^2", ]
            for (col_name in names(r2_row)) {
              value <- r2_row[col_name]
              if (!is.na(value) && value != 0) {
                r2_list[[col_name]] <- value
              }
            }
          }
          
          # Formatar path coefficients para JSON
          if (length(path_coef_list) > 0) {
            path_parts <- sapply(names(path_coef_list), function(name) {
              val <- format_num(path_coef_list[[name]])
              paste0('"', name, '": ', val)
            })
            path_json <- paste(path_parts, collapse = ', ')
          } else {
            path_json <- ''
          }
          
          # Formatar R² para JSON
          if (length(r2_list) > 0) {
            r2_parts <- sapply(names(r2_list), function(name) {
              val <- format_num(r2_list[[name]])
              paste0('"', name, '": ', val)
            })
            r2_json <- paste(r2_parts, collapse = ', ')
          } else {
            r2_json <- ''
          }
          
          paste0('{"success": true, "path_coefficients": {', path_json, 
                 '}, "r_squared": {', r2_json, '}}')
        `;

        const resultStr = await webR.evalRString(rCode);
        console.log('WebR result (seminr):', resultStr);
        const data = JSON.parse(resultStr);
        
        if (data.success) {
          setResults(data);
          
          // Atualiza edges com coeficientes
          const pathCoeffs = data.path_coefficients || {};
          if (Object.keys(pathCoeffs).length > 0) {
            setEdges((eds) =>
              eds.map((edge) => {
                const pathKey = `${edge.source} -> ${edge.target}`;
                const coeff = pathCoeffs[pathKey];
                
                if (coeff !== undefined && coeff !== null) {
                  return {
                    ...edge,
                    label: `β = ${typeof coeff === 'number' ? coeff.toFixed(3) : parseFloat(coeff).toFixed(3)}`,
                    labelStyle: { fill: '#000', fontWeight: 700 },
                    labelBgStyle: { fill: '#fff' },
                  };
                }
                return edge;
              })
            );
          }
        }
        
        setLoading(false);
        return;
      }

      // Caso contrário, usar implementação simplificada
      const constructs = nodes.map((node) => ({
        id: node.id,
        indicators: [],
      }));

      console.log('Using simplified PLS implementation...');

      // Define os constructs baseados no modelo mobi
      const constructMap = {
        'Image': ['IMAG1', 'IMAG2', 'IMAG3', 'IMAG4', 'IMAG5'],
        'Expectation': ['CUEX1', 'CUEX2', 'CUEX3'],
        'Quality': ['PERQ1', 'PERQ2', 'PERQ3', 'PERQ4', 'PERQ5', 'PERQ6', 'PERQ7'],
        'Value': ['PERV1', 'PERV2'],
        'Satisfaction': ['CUSA1', 'CUSA2', 'CUSA3'],
        'Loyalty': ['CUSL1', 'CUSL2', 'CUSL3']
      };

      // Constrói o código R para o modelo usando a implementação simplificada
      let rCode = `
        # Define constructs
        constructs <- list(
      `;

      // Adiciona apenas os constructs que existem no modelo
      const validConstructs = nodes.filter(node => constructMap[node.id]);
      validConstructs.forEach((node, idx) => {
        const indicators = constructMap[node.id];
        rCode += `  "${node.id}" = c(${indicators.map(i => `"${i}"`).join(', ')})`;
        if (idx < validConstructs.length - 1) rCode += ',\n';
      });

      rCode += `
        )
        
        # Define relationships
        relationships <- list(
      `;

      relationships.forEach((rel, idx) => {
        rCode += `  list(from = "${rel.source}", to = "${rel.target}")`;
        if (idx < relationships.length - 1) rCode += ',\n';
      });

      rCode += `
        )
        
        # Executa análise PLS simplificada
        pls_result <- simple_pls(mobi, constructs, relationships)
        
        # Função para formatar valores numéricos para JSON
        format_num <- function(x) {
          if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
          return(as.character(x))
        }
        
        # Retorna resultado como JSON manualmente
        path_parts <- sapply(names(pls_result$path_coefficients), function(name) {
          val <- format_num(pls_result$path_coefficients[[name]])
          paste0('"', name, '": ', val)
        })
        path_json <- paste(path_parts, collapse = ', ')
        
        r2_parts <- sapply(names(pls_result$r_squared), function(name) {
          val <- format_num(pls_result$r_squared[[name]])
          paste0('"', name, '": ', val)
        })
        r2_json <- paste(r2_parts, collapse = ', ')
        
        paste0('{"success": true, "path_coefficients": {', path_json, 
               '}, "r_squared": {', r2_json, '}}')
      `;

      console.log('Executing R code in WebR...');
      
      // Executa o código R
      const resultStr = await webR.evalRString(rCode);
      console.log('WebR result:', resultStr);
      
      const data = JSON.parse(resultStr);
      console.log('Parsed result:', data);

      if (data.success) {
        setResults(data);

        // Atualiza edges com coeficientes
        const pathCoeffs = data.path_coefficients || {};
        if (Object.keys(pathCoeffs).length > 0) {
          setEdges((eds) =>
            eds.map((edge) => {
              const pathKey = `${edge.source} -> ${edge.target}`;
              const coeff = pathCoeffs[pathKey];
              
              if (coeff !== undefined) {
                return {
                  ...edge,
                  label: `β = ${typeof coeff === 'number' ? coeff.toFixed(3) : parseFloat(coeff).toFixed(3)}`,
                  labelStyle: { fill: '#000', fontWeight: 700 },
                  labelBgStyle: { fill: '#fff' },
                };
              }
              return edge;
            })
          );
        }
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('WebR analysis error:', err);
      setError(`Error running analysis: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runBootstrapWebR = async () => {
    if (webRStatus !== 'ready') {
      setError('WebR is not ready yet. Please wait...');
      return;
    }

    if (!results) {
      setError('Please run PLS analysis first');
      return;
    }

    setBootstrapping(true);
    setError(null);

    try {
      console.log('Running bootstrap with WebR...', { usingSeminr });

      // Se seminr está disponível, usar implementação real
      if (usingSeminr) {
        const rCode = `
          library(seminr)
          
          # Define seed para reprodutibilidade
          set.seed(${randomSeed})
          
          # Recupera o modelo salvo e faz bootstrap
          if (!exists("saved_pls_model", envir = .GlobalEnv)) {
            stop("Model not found. Please run PLS analysis first.")
          }
          
          pls_model <- .GlobalEnv$saved_pls_model
          
          # Workaround para bug do seminr com clusters paralelos
          # Ver: https://github.com/sem-in-r/seminr/issues/333
          
          # Cria uma versão do bootstrap que ignora erros de cluster
          safe_bootstrap <- function(model, nboot) {
            # Tenta executar bootstrap capturando warnings/errors
            result <- tryCatch({
              # Força ambiente single-thread
              old_cores <- getOption("mc.cores")
              options(mc.cores = 1)
              
              # Executa bootstrap
              boot_result <- bootstrap_model(
                seminr_model = model,
                nboot = nboot
              )
              
              # Restaura opções
              if (!is.null(old_cores)) options(mc.cores = old_cores)
              
              boot_result
            }, error = function(e) {
              # Se o erro é sobre 'cl' ou 'nrow', tenta alternativa manual
              if (grepl("cl|nrow|length 0", e$message, ignore.case = TRUE)) {
                # Bootstrap manual simplificado
                message("Using manual bootstrap due to error: ", e$message)
                
                n <- nrow(model$data)
                nboots <- nboot
                
                # Extrai path coefficients originais
                orig_summary <- summary(model)
                orig_paths_matrix <- orig_summary$paths
                
                # Remove linhas R^2 e AdjR^2 para pegar só os paths
                path_rows <- !(rownames(orig_paths_matrix) %in% c("R^2", "AdjR^2"))
                orig_paths_only <- orig_paths_matrix[path_rows, , drop = FALSE]
                
                # Armazena resultados do bootstrap
                boot_path_results <- array(NA, dim = c(nboots, nrow(orig_paths_only), ncol(orig_paths_only)))
                dimnames(boot_path_results) <- list(
                  NULL,
                  rownames(orig_paths_only),
                  colnames(orig_paths_only)
                )
                
                # Executa bootstrap
                for (i in 1:nboots) {
                  # Resample
                  idx <- sample(1:n, n, replace = TRUE)
                  boot_data <- model$data[idx, ]
                  
                  # Re-estimate
                  tryCatch({
                    boot_model <- estimate_pls(
                      data = boot_data,
                      measurement_model = model$measurement_model,
                      structural_model = model$structural_model
                    )
                    
                    boot_summary <- summary(boot_model)
                    boot_paths <- boot_summary$paths
                    boot_paths_only <- boot_paths[path_rows, , drop = FALSE]
                    
                    boot_path_results[i, , ] <- boot_paths_only
                  }, error = function(e2) {
                    # Se falhar, usa NA
                    message("Bootstrap iteration ", i, " failed")
                  })
                }
                
                # Calcula estatísticas
                boot_means <- apply(boot_path_results, c(2, 3), mean, na.rm = TRUE)
                boot_sds <- apply(boot_path_results, c(2, 3), sd, na.rm = TRUE)
                boot_t <- boot_means / boot_sds
                boot_ci_lower <- apply(boot_path_results, c(2, 3), quantile, probs = 0.025, na.rm = TRUE)
                boot_ci_upper <- apply(boot_path_results, c(2, 3), quantile, probs = 0.975, na.rm = TRUE)
                
                # Cria objeto compatível
                boot_paths_df <- data.frame(
                  Original = as.vector(orig_paths_only),
                  Mean = as.vector(boot_means),
                  SD = as.vector(boot_sds),
                  T_Stat = as.vector(boot_t),
                  CI_Lower = as.vector(boot_ci_lower),
                  CI_Upper = as.vector(boot_ci_upper)
                )
                
                rownames(boot_paths_df) <- paste(
                  rep(rownames(orig_paths_only), times = ncol(orig_paths_only)),
                  "  ->  ",
                  rep(colnames(orig_paths_only), each = nrow(orig_paths_only))
                )
                
                # Remove linhas com todos NA
                boot_paths_df <- boot_paths_df[!is.na(boot_paths_df$Original), ]
                
                # Retorna estrutura compatível
                list(
                  seminr_model = model,
                  bootstrapped_paths = boot_paths_df,
                  nboot = nboot
                )
              } else {
                stop(e)
              }
            })
            
            result
          }
          
          # Usa função segura
          boot_estimates <- safe_bootstrap(pls_model, ${nboot})
          
          # Verifica se temos resultados
          if (is.null(boot_estimates$bootstrapped_paths)) {
            stop("Bootstrap failed to produce results")
          }
          
          # Extrai resultados - verifica se é do seminr ou manual
          if ("boot_seminr_model" %in% class(boot_estimates)) {
            # Resultado do seminr oficial
            boot_summary <- summary(boot_estimates)
            boot_paths <- as.data.frame(boot_summary$bootstrapped_paths)
          } else {
            # Resultado manual
            boot_paths <- boot_estimates$bootstrapped_paths
          }
          
          # Função para formatar valores numéricos para JSON
          format_num <- function(x) {
            if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
            return(as.character(x))
          }
          
          # Formata resultados
          boot_json_parts <- c()
          for (path_name in rownames(boot_paths)) {
            orig_est <- format_num(boot_paths[path_name, 1])
            boot_mean <- format_num(boot_paths[path_name, 2])
            boot_sd <- format_num(boot_paths[path_name, 3])
            t_val <- if(ncol(boot_paths) >= 4) format_num(boot_paths[path_name, 4]) else "null"
            ci_lower <- if(ncol(boot_paths) >= 5) format_num(boot_paths[path_name, 5]) else "null"
            ci_upper <- if(ncol(boot_paths) >= 6) format_num(boot_paths[path_name, 6]) else "null"
            
            part <- paste0('"', path_name, '": {',
                          '"original_estimate": ', orig_est, ',',
                          '"bootstrap_mean": ', boot_mean, ',',
                          '"bootstrap_sd": ', boot_sd, ',',
                          '"t_value": ', t_val, ',',
                          '"ci_lower": ', ci_lower, ',',
                          '"ci_upper": ', ci_upper,
                          '}')
            boot_json_parts <- c(boot_json_parts, part)
          }
          
          paste0('{"success": true, "nboot": ${nboot}, "bootstrap_summary": {',
                 paste(boot_json_parts, collapse = ', '), '}}')
        `;

        const resultStr = await webR.evalRString(rCode);
        const data = JSON.parse(resultStr);
        console.log('Bootstrap result (seminr):', data);

        if (data.success) {
          setBootstrapResults(data);
          createModelVisualization(data.bootstrap_summary);
          setActiveView('model');
        } else {
          setError(data.error || 'Bootstrap error');
        }
        
        setBootstrapping(false);
        return;
      }

      // Caso contrário, usar implementação simplificada
      const relationships = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      // Define os constructs baseados no modelo mobi
      const constructMap = {
        'Image': ['IMAG1', 'IMAG2', 'IMAG3', 'IMAG4', 'IMAG5'],
        'Expectation': ['CUEX1', 'CUEX2', 'CUEX3'],
        'Quality': ['PERQ1', 'PERQ2', 'PERQ3', 'PERQ4', 'PERQ5', 'PERQ6', 'PERQ7'],
        'Value': ['PERV1', 'PERV2'],
        'Satisfaction': ['CUSA1', 'CUSA2', 'CUSA3'],
        'Loyalty': ['CUSL1', 'CUSL2', 'CUSL3']
      };

      let rCode = `
        # Define constructs
        constructs <- list(
      `;

      const validConstructs = nodes.filter(node => constructMap[node.id]);
      validConstructs.forEach((node, idx) => {
        const indicators = constructMap[node.id];
        rCode += `  "${node.id}" = c(${indicators.map(i => `"${i}"`).join(', ')})`;
        if (idx < validConstructs.length - 1) rCode += ',\n';
      });

      rCode += `
        )
        
        # Define relationships
        relationships <- list(
      `;

      relationships.forEach((rel, idx) => {
        rCode += `  list(from = "${rel.source}", to = "${rel.target}")`;
        if (idx < relationships.length - 1) rCode += ',\n';
      });

      rCode += `
        )
        
        # Define seed para reprodutibilidade
        set.seed(${randomSeed})
        
        # Executa bootstrap
        boot_result <- simple_bootstrap(mobi, constructs, relationships, nboot = ${nboot})
        
        # Função para formatar valores numéricos para JSON
        format_num <- function(x) {
          if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
          return(as.character(x))
        }
        
        # Formata resultados como JSON manualmente
        boot_json_parts <- c()
        for (path_name in names(boot_result)) {
          mean_val <- format_num(boot_result[[path_name]]$mean)
          sd_val <- format_num(boot_result[[path_name]]$sd)
          t_val <- format_num(boot_result[[path_name]]$mean / boot_result[[path_name]]$sd)
          ci_lower <- format_num(boot_result[[path_name]]$ci_lower)
          ci_upper <- format_num(boot_result[[path_name]]$ci_upper)
          
          part <- paste0('"', path_name, '": {',
                        '"original_estimate": ', mean_val, ',',
                        '"bootstrap_mean": ', mean_val, ',',
                        '"bootstrap_sd": ', sd_val, ',',
                        '"t_value": ', t_val, ',',
                        '"ci_lower": ', ci_lower, ',',
                        '"ci_upper": ', ci_upper,
                        '}')
          boot_json_parts <- c(boot_json_parts, part)
        }
        
        paste0('{"success": true, "nboot": ${nboot}, "bootstrap_summary": {',
               paste(boot_json_parts, collapse = ', '), '}}')
      `;

      const resultStr = await webR.evalRString(rCode);
      const data = JSON.parse(resultStr);
      console.log('Bootstrap result:', data);

      if (data.success) {
        setBootstrapResults(data);
        createModelVisualization(data.bootstrap_summary);
        setActiveView('model');
      } else {
        setError(data.error || 'Bootstrap error');
      }
    } catch (err) {
      console.error('WebR bootstrap error:', err);
      setError(`Error running bootstrap: ${err.message}`);
    } finally {
      setBootstrapping(false);
    }
  };

  const runPLSPredictWebR = async () => {
    if (webRStatus !== 'ready') {
      setError('WebR is not ready yet. Please wait...');
      return;
    }

    if (!results) {
      setError('Please run PLS analysis first');
      return;
    }

    setPredicting(true);
    setError(null);

    try {
      console.log('Running PLSpredict with WebR...', { usingSeminr, kFolds, plsPredictReps });

      // Se seminr está disponível, usar implementação real
      if (usingSeminr) {
        const rCode = `
          library(seminr)
          
          # Define seed para reprodutibilidade
          set.seed(${randomSeed})
          
          # Recupera o modelo salvo
          if (!exists("saved_pls_model", envir = .GlobalEnv)) {
            stop("Model not found. Please run PLS analysis first.")
          }
          
          pls_model <- .GlobalEnv$saved_pls_model
          
          # Executa PLSpredict
          pred_result <- predict_pls(
            model = pls_model,
            technique = predict_DA,
            noFolds = ${plsFolds},
            reps = ${plsPredictReps}
          )
          
          # Extrai sumário com métricas detalhadas
          pred_summary <- summary(pred_result)
          
          # Função para formatar valores numéricos para JSON
          format_num <- function(x) {
            if (is.na(x) || is.nan(x) || is.infinite(x)) return("null")
            return(as.character(x))
          }
          
          # CONSTRUCT-LEVEL METRICS
          construct_metrics <- list()
          if (!is.null(pred_summary$construct_level_metrics)) {
            cl_metrics <- pred_summary$construct_level_metrics
            for (i in 1:nrow(cl_metrics)) {
              construct <- rownames(cl_metrics)[i]
              construct_metrics[[construct]] <- list(
                IS_MSE = as.numeric(cl_metrics[i, "IS_MSE"]),
                IS_MAE = as.numeric(cl_metrics[i, "IS_MAE"]),
                OOS_MSE = as.numeric(cl_metrics[i, "OOS_MSE"]),
                OOS_MAE = as.numeric(cl_metrics[i, "OOS_MAE"]),
                overfit = ((as.numeric(cl_metrics[i, "OOS_MSE"]) - as.numeric(cl_metrics[i, "IS_MSE"])) / 
                          as.numeric(cl_metrics[i, "IS_MSE"])) * 100
              )
            }
          } else {
            # Fallback: calcula métricas agregadas a partir dos indicadores
            if (!is.null(pred_summary$PLS_in_sample)) {
              pls_in <- pred_summary$PLS_in_sample
              pls_out <- pred_summary$PLS_out_of_sample
              indicator_names <- colnames(pls_in)
              
              # Extrai prefixos únicos (CUEX, CUSA, CUSL, etc)
              construct_prefixes <- unique(gsub("\\\\d+$", "", indicator_names))
              
              for (prefix in construct_prefixes) {
                # Indicadores deste construto
                indicators <- grep(paste0("^", prefix), indicator_names, value = TRUE)
                
                if (length(indicators) > 0) {
                  # Calcula médias das métricas dos indicadores
                  is_mse_vals <- sapply(indicators, function(ind) (pls_in["RMSE", ind])^2)
                  oos_mse_vals <- sapply(indicators, function(ind) (pls_out["RMSE", ind])^2)
                  
                  is_mse <- mean(is_mse_vals, na.rm = TRUE)
                  oos_mse <- mean(oos_mse_vals, na.rm = TRUE)
                  is_mae <- mean(sapply(indicators, function(ind) pls_in["MAE", ind]), na.rm = TRUE)
                  oos_mae <- mean(sapply(indicators, function(ind) pls_out["MAE", ind]), na.rm = TRUE)
                  
                  construct_metrics[[prefix]] <- list(
                    IS_MSE = as.numeric(is_mse),
                    IS_MAE = as.numeric(is_mae),
                    OOS_MSE = as.numeric(oos_mse),
                    OOS_MAE = as.numeric(oos_mae),
                    overfit = as.numeric((oos_mse - is_mse) / is_mse * 100)
                  )
                }
              }
            }
          }
          
          # INDICATOR-LEVEL METRICS (PLS vs LM)
          indicator_metrics <- list()
          
          if (!is.null(pred_summary$PLS_in_sample) && !is.null(pred_summary$LM_in_sample)) {
            pls_in <- pred_summary$PLS_in_sample
            pls_out <- pred_summary$PLS_out_of_sample
            lm_in <- pred_summary$LM_in_sample
            lm_out <- pred_summary$LM_out_of_sample
            
            # Para cada indicador presente (agora em colunas)
            all_indicators <- colnames(pls_in)
            
            for (ind in all_indicators) {
              indicator_metrics[[ind]] <- list(
                PLS = list(
                  in_sample = list(
                    RMSE = if (ind %in% colnames(pls_in)) as.numeric(pls_in["RMSE", ind]) else NULL,
                    MAE = if (ind %in% colnames(pls_in)) as.numeric(pls_in["MAE", ind]) else NULL
                  ),
                  out_sample = list(
                    RMSE = if (ind %in% colnames(pls_out)) as.numeric(pls_out["RMSE", ind]) else NULL,
                    MAE = if (ind %in% colnames(pls_out)) as.numeric(pls_out["MAE", ind]) else NULL
                  )
                ),
                LM = list(
                  in_sample = list(
                    RMSE = if (ind %in% colnames(lm_in)) as.numeric(lm_in["RMSE", ind]) else NULL,
                    MAE = if (ind %in% colnames(lm_in)) as.numeric(lm_in["MAE", ind]) else NULL
                  ),
                  out_sample = list(
                    RMSE = if (ind %in% colnames(lm_out)) as.numeric(lm_out["RMSE", ind]) else NULL,
                    MAE = if (ind %in% colnames(lm_out)) as.numeric(lm_out["MAE", ind]) else NULL
                  )
                )
              )
            }
          }
          
          # Formata como JSON
          construct_json <- jsonlite::toJSON(construct_metrics, auto_unbox = TRUE, null = "null")
          indicator_json <- jsonlite::toJSON(indicator_metrics, auto_unbox = TRUE, null = "null")
          
          paste0('{"success": true, "folds": ${plsFolds}, "reps": ${plsPredictReps}, "method": "predict_DA",',
                 '"construct_metrics": ', construct_json, ',',
                 '"indicator_metrics": ', indicator_json, '}')
        `;

        const resultStr = await webR.evalRString(rCode);
        const data = JSON.parse(resultStr);
        console.log('PLSpredict result (seminr):', data);

        if (data.success) {
          setPredictResults(data);
        } else {
          setError(data.error || 'PLSpredict error');
        }
        
        setPredicting(false);
        return;
      }

      // Implementação simplificada se seminr não estiver disponível
      setError('PLSpredict requires seminr package (not available in simplified mode)');
      setPredicting(false);
      
    } catch (err) {
      console.error('WebR PLSpredict error:', err);
      setError(`Error running PLSpredict: ${err.message}`);
    } finally {
      setPredicting(false);
    }
  };

  const createModelVisualization = (bootstrapSummary) => {
    const constructSet = new Set();
    const pathsData = [];
    
    Object.entries(bootstrapSummary || {}).forEach(([path, stats]) => {
      const match = path.match(/(.+?)\s*->\s*(.+)/);
      if (match) {
        const source = match[1].trim();
        const target = match[2].trim();
        constructSet.add(source);
        constructSet.add(target);
        pathsData.push({ source, target, stats });
      }
    });
    
    const constructs = Array.from(constructSet);
    const newNodes = constructs.map((construct, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      
      return {
        id: construct,
        type: 'default',
        data: { label: construct },
        position: { 
          x: 100 + col * 300, 
          y: 100 + row * 200 
        },
      };
    });
    
    const newEdges = pathsData.map((path, idx) => {
      const { source, target, stats } = path;
      const mean = typeof stats.bootstrap_mean === 'number' ? stats.bootstrap_mean : parseFloat(stats.bootstrap_mean) || 0;
      const tValue = typeof stats.t_value === 'number' ? stats.t_value : parseFloat(stats.t_value) || 0;
      const isSignificant = Math.abs(tValue) > 1.96;
      
      return {
        id: `e${idx}`,
        source,
        target,
        type: 'smoothstep',
        animated: isSignificant,
        label: `β=${mean.toFixed(3)}\nt=${tValue.toFixed(2)}${isSignificant ? '*' : ''}`,
        labelStyle: { 
          fill: isSignificant ? '#28a745' : '#666',
          fontWeight: 700,
          fontSize: 12,
        },
        labelBgStyle: { 
          fill: 'white',
          fillOpacity: 0.9,
        },
        style: {
          stroke: isSignificant ? '#28a745' : '#999',
          strokeWidth: isSignificant ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isSignificant ? '#28a745' : '#999',
        },
      };
    });
    
    setModelNodes(newNodes);
    setModelEdges(newEdges);
  };

  const clearModel = () => {
    setNodes([]);
    setEdges([]);
    setResults(null);
    setBootstrapResults(null);
    setError(null);
  };

  const loadExample = () => {
    setNodes(initialNodes);
    setEdges([
      {
        id: 'e1',
        source: 'Image',
        target: 'Expectation',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e2',
        source: 'Image',
        target: 'Satisfaction',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e3',
        source: 'Expectation',
        target: 'Quality',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e4',
        source: 'Quality',
        target: 'Value',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e5',
        source: 'Value',
        target: 'Satisfaction',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e6',
        source: 'Satisfaction',
        target: 'Loyalty',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ]);
    setResults(null);
    setError(null);
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <div className="header-logo">
            <span className="header-logo-icon">🔬</span>
            <span>PLS-SEM Web (WebR Edition)</span>
          </div>
          <div className="header-menu">
            <button className="header-menu-item">File</button>
            <button className="header-menu-item">Edit</button>
            <button className="header-menu-item">Calculate</button>
            <button className="header-menu-item">View</button>
            <button className="header-menu-item">Help</button>
          </div>
        </div>
        <div className="header-right">
          <span style={{ 
            fontSize: '0.75rem', 
            padding: '0.25rem 0.5rem',
            background: webRStatus === 'ready' ? '#28a745' : webRStatus === 'error' ? '#dc3545' : '#ffc107',
            color: 'white',
            borderRadius: '3px',
            fontWeight: 600
          }}>
            {webRStatus === 'ready' ? '● WEBR READY' : webRStatus === 'error' ? '● ERROR' : '● LOADING'}
          </span>
        </div>
      </div>

      <div className="workspace">
        <div className="sidebar-left">
          <div className="sidebar-header">Project Explorer</div>
          <div className="sidebar-content">
            <div className="project-section">
              <div className="project-section-title">📊 Views</div>
              <div 
                className={`project-item ${activeView === 'builder' ? 'active' : ''}`}
                onClick={() => setActiveView('builder')}
              >
                🏗️ Model Builder
              </div>
              <div 
                className={`project-item ${activeView === 'model' ? 'active' : ''}`}
                onClick={() => setActiveView('model')}
                style={{ opacity: bootstrapResults ? 1 : 0.5 }}
              >
                📈 Bootstrap Results
              </div>
              <div 
                className={`project-item ${activeView === 'predict' ? 'active' : ''}`}
                onClick={() => setActiveView('predict')}
                style={{ opacity: predictResults ? 1 : 0.5 }}
              >
                🎯 PLSpredict Results
              </div>
            </div>
            
            <div className="project-section">
              <div className="project-section-title">📁 Data</div>
              <div className="project-item">📄 mobi (WebR)</div>
            </div>
            
            <div className="project-section">
              <div className="project-section-title">⚙️ WebR Status</div>
              <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                {webRMessage}
              </div>
            </div>
          </div>
        </div>

        <div className="main-canvas">
          {activeView === 'builder' ? (
            <>
              <div className="canvas-toolbar">
                <div className="toolbar-group">
                  <input
                    type="text"
                    placeholder="Construct name"
                    value={newConstructName}
                    onChange={(e) => setNewConstructName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addConstruct()}
                    className="toolbar-input"
                  />
                  <button onClick={addConstruct} className="toolbar-button">
                    ➕ Add
                  </button>
                </div>

                <div className="toolbar-group">
                  <button onClick={loadExample} className="toolbar-button">
                    📊 Load Example
                  </button>
                  <button onClick={clearModel} className="toolbar-button">
                    🗑️ Clear
                  </button>
                </div>

                <div className="toolbar-group">
                  <button
                    onClick={runAnalysisWebR}
                    disabled={loading || edges.length === 0 || webRStatus !== 'ready'}
                    className="toolbar-button primary"
                  >
                    {loading ? '⏳ Running...' : '▶️ Calculate PLS (WebR)'}
                  </button>
                  <button
                    onClick={runBootstrapWebR}
                    disabled={bootstrapping || !results || webRStatus !== 'ready'}
                    className="toolbar-button success"
                  >
                    {bootstrapping ? `⏳ Bootstrapping (${nboot})...` : `🔬 Bootstrap (${nboot} iter)`}
                  </button>
                  <button
                    onClick={runPLSPredictWebR}
                    disabled={predicting || !results || webRStatus !== 'ready'}
                    className="toolbar-button info"
                  >
                    {predicting ? `⏳ Predicting (${plsFolds}-fold)...` : `🎯 PLSpredict (${plsFolds}-fold CV)`}
                  </button>
                </div>
              </div>

              <div className="flow-container">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  fitView
                >
                  <Controls />
                  <MiniMap />
                  <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
              </div>
            </>
          ) : activeView === 'model' ? (
            <>
              <div className="model-info-banner">
                <h2>
                  <span>📊</span>
                  Bootstrap Results Model (WebR)
                </h2>
                <div className="model-legend">
                  <div className="legend-item">
                    <div className="legend-dot significant"></div>
                    <span>Significant (p &lt; 0.05)</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot not-significant"></div>
                    <span>Not Significant</span>
                  </div>
                </div>
              </div>

              <div className="flow-container">
                <ReactFlow
                  nodes={modelNodes}
                  edges={modelEdges}
                  onNodesChange={onModelNodesChange}
                  onEdgesChange={onModelEdgesChange}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                >
                  <Controls />
                  <MiniMap nodeColor={(node) => '#28a745'} />
                  <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
              </div>
            </>
          ) : activeView === 'predict' ? (
            <>
              <div className="model-info-banner">
                <h2>
                  <span>🎯</span>
                  PLSpredict Results (WebR)
                </h2>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#666' }}>
                  Out-of-sample prediction using {predictResults?.folds || plsFolds}-fold cross-validation with {predictResults?.repetitions || plsReps} repetitions
                </p>
              </div>

              <div style={{ padding: '2rem' }}>
                {predictResults && predictResults.construct_metrics && (
                  <>
                    <h3 style={{ marginBottom: '1rem', color: '#333' }}>📊 Construct-Level Metrics</h3>
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Construct</th>
                          <th>IS MSE</th>
                          <th>IS MAE</th>
                          <th>OOS MSE</th>
                          <th>OOS MAE</th>
                          <th>Overfit %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(predictResults.construct_metrics).map(([construct, metrics]) => (
                          <tr key={construct}>
                            <td><strong>{construct}</strong></td>
                            <td>{metrics.IS_MSE.toFixed(4)}</td>
                            <td>{metrics.IS_MAE.toFixed(4)}</td>
                            <td>{metrics.OOS_MSE.toFixed(4)}</td>
                            <td>{metrics.OOS_MAE.toFixed(4)}</td>
                            <td className={metrics.overfit < 15 ? 'positive' : 'negative'}>
                              {metrics.overfit.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="info-box" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                      <h4>💡 Construct-Level Interpretation</h4>
                      <ul>
                        <li><strong>IS (In-Sample)</strong>: Prediction error within training data</li>
                        <li><strong>OOS (Out-of-Sample)</strong>: Prediction error on test data (more realistic)</li>
                        <li><strong>Overfit &lt; 15%</strong>: Model generalizes well (shown in green)</li>
                        <li><strong>Lower MSE/MAE values</strong>: Better prediction accuracy</li>
                      </ul>
                    </div>
                  </>
                )}

                {predictResults && predictResults.indicator_metrics && Object.keys(predictResults.indicator_metrics).length > 0 && (
                  <>
                    <h3 style={{ marginBottom: '1rem', color: '#333' }}>📈 Indicator-Level: PLS vs Linear Model (LM)</h3>
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Indicator</th>
                          <th>PLS In RMSE</th>
                          <th>PLS Out RMSE</th>
                          <th>LM In RMSE</th>
                          <th>LM Out RMSE</th>
                          <th>PLS In MAE</th>
                          <th>PLS Out MAE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(predictResults.indicator_metrics).map(([indicator, metrics]) => {
                          const plsBetterOut = metrics.PLS_out_RMSE && metrics.LM_out_RMSE && 
                                              metrics.PLS_out_RMSE < metrics.LM_out_RMSE;
                          return (
                            <tr key={indicator} className={plsBetterOut ? 'positive' : ''}>
                              <td><strong>{indicator}</strong></td>
                              <td>{metrics.PLS_in_RMSE?.toFixed(4) || 'N/A'}</td>
                              <td className={plsBetterOut ? 'positive' : ''}>
                                {metrics.PLS_out_RMSE?.toFixed(4) || 'N/A'}
                              </td>
                              <td>{metrics.LM_in_RMSE?.toFixed(4) || 'N/A'}</td>
                              <td>{metrics.LM_out_RMSE?.toFixed(4) || 'N/A'}</td>
                              <td>{metrics.PLS_in_MAE?.toFixed(4) || 'N/A'}</td>
                              <td>{metrics.PLS_out_MAE?.toFixed(4) || 'N/A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="info-box" style={{ marginTop: '1.5rem' }}>
                      <h4>💡 Indicator-Level Interpretation</h4>
                      <ul>
                        <li><strong>PLS vs LM</strong>: Compares PLS-SEM against Linear Model benchmark</li>
                        <li><strong>Green rows</strong>: PLS outperforms LM (lower out-of-sample RMSE)</li>
                        <li><strong>RMSE</strong>: Root Mean Square Error (prediction accuracy)</li>
                        <li><strong>MAE</strong>: Mean Absolute Error (average prediction deviation)</li>
                        <li><strong>Out-of-sample metrics</strong>: Most important for assessing real predictive power</li>
                      </ul>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                      <p style={{ margin: 0, color: '#856404' }}>
                        <strong>ℹ️ WebR Note:</strong> Plot generation for error distributions is available in Backend mode. 
                        Switch to Backend mode to view detailed prediction error plots for each indicator.
                      </p>
                    </div>
                  </>
                )}

                {predictResults && !predictResults.construct_metrics && !predictResults.indicator_metrics && (
                  <div className="info-box">
                    <p>No detailed metrics available. Please ensure the model has been estimated and has dependent constructs.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="sidebar-right">
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${rightPanel === 'results' ? 'active' : ''}`}
              onClick={() => setRightPanel('results')}
            >
              📊 Results
            </button>
            <button 
              className={`sidebar-tab ${rightPanel === 'properties' ? 'active' : ''}`}
              onClick={() => setRightPanel('properties')}
            >
              🔧 Properties
            </button>
          </div>

          <div className="sidebar-panel">
            {rightPanel === 'results' ? (
              <>
                {error && (
                  <div className="error fade-in">
                    <strong>❌ Error</strong>
                    <p>{error}</p>
                  </div>
                )}

                {webRStatus === 'loading' && (
                  <div className="placeholder">
                    <div className="loading">
                      <div className="spinner"></div>
                      <p>{webRMessage}</p>
                    </div>
                  </div>
                )}

                {!results && !error && !loading && !bootstrapResults && webRStatus === 'ready' && (
                  <div className="placeholder">
                    <div className="placeholder-icon">📈</div>
                    <h3>No Results Yet</h3>
                    <p>Build your model and click "Calculate PLS" to see results</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: '#28a745' }}>
                      ✓ Running with WebR - all calculations in your browser!
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Running PLS-SEM analysis with WebR...</p>
                  </div>
                )}

                {results && results.success && (
                  <div className="fade-in">
                    <div className="results-section">
                      <div className="results-title">📊 Path Coefficients</div>
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Path</th>
                            <th>Coefficient</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(results.path_coefficients || {}).map(
                            ([path, coeff]) => (
                              <tr key={path}>
                                <td>{path}</td>
                                <td>{typeof coeff === 'number' ? coeff.toFixed(3) : coeff}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {results.r_squared && (
                      <div className="results-section">
                        <div className="results-title">📈 R² (Explained Variance)</div>
                        <table className="results-table">
                          <thead>
                            <tr>
                              <th>Construct</th>
                              <th>R²</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(results.r_squared).map(([construct, r2]) => (
                              <tr key={construct}>
                                <td>{construct}</td>
                                <td>{typeof r2 === 'number' ? r2.toFixed(3) : r2}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {bootstrapResults && bootstrapResults.success && (
                  <div className="fade-in">
                    <div className="results-section">
                      <div className="results-title">🔬 Bootstrap Summary</div>
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Path</th>
                            <th>Mean</th>
                            <th>t-value</th>
                            <th>Sig.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bootstrapResults.bootstrap_summary || {}).map(
                            ([path, stats]) => {
                              const mean = typeof stats.bootstrap_mean === 'number' ? stats.bootstrap_mean : parseFloat(stats.bootstrap_mean) || 0;
                              const tValue = typeof stats.t_value === 'number' ? stats.t_value : parseFloat(stats.t_value) || 0;
                              const isSignificant = Math.abs(tValue) > 1.96;
                              return (
                                <tr key={path} className={isSignificant ? 'significant' : ''}>
                                  <td>{path}</td>
                                  <td style={{ fontWeight: 'bold' }}>{mean.toFixed(3)}</td>
                                  <td>{tValue.toFixed(3)}</td>
                                  <td>
                                    {isSignificant ? (
                                      <span className="status-badge success">Yes</span>
                                    ) : (
                                      <span className="status-badge warning">No</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="results-section">
                      <div className="results-title">📊 Confidence Intervals (95%)</div>
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Path</th>
                            <th>Lower</th>
                            <th>Upper</th>
                            <th>SD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(bootstrapResults.bootstrap_summary || {}).map(
                            ([path, stats]) => {
                              const ciLower = typeof stats.ci_lower === 'number' ? stats.ci_lower : parseFloat(stats.ci_lower) || 0;
                              const ciUpper = typeof stats.ci_upper === 'number' ? stats.ci_upper : parseFloat(stats.ci_upper) || 0;
                              const sd = typeof stats.bootstrap_sd === 'number' ? stats.bootstrap_sd : parseFloat(stats.bootstrap_sd) || 0;
                              return (
                                <tr key={path}>
                                  <td>{path}</td>
                                  <td>{ciLower.toFixed(3)}</td>
                                  <td>{ciUpper.toFixed(3)}</td>
                                  <td>{sd.toFixed(3)}</td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="fade-in">
                <div className="results-section">
                  <div className="results-title">⚙️ PLS Configuration</div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Max Iterations:
                      </label>
                      <input
                        type="number"
                        value={maxIterations}
                        onChange={(e) => setMaxIterations(parseInt(e.target.value) || 300)}
                        min="50"
                        max="1000"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 300</small>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Stop Criterion (10^-x):
                      </label>
                      <input
                        type="number"
                        value={stopCriterion}
                        onChange={(e) => setStopCriterion(parseInt(e.target.value) || 7)}
                        min="3"
                        max="10"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 7 (10^-7)</small>
                    </div>
                  </div>
                </div>

                <div className="results-section">
                  <div className="results-title">🔬 Bootstrap Configuration</div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Bootstrap Iterations:
                      </label>
                      <input
                        type="number"
                        value={nboot}
                        onChange={(e) => setNboot(parseInt(e.target.value) || 100)}
                        min="50"
                        max="5000"
                        step="50"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 100 (recommended: 500-1000)</small>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Random Seed:
                      </label>
                      <input
                        type="number"
                        value={randomSeed}
                        onChange={(e) => setRandomSeed(parseInt(e.target.value) || 123)}
                        min="1"
                        max="99999"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>For reproducibility (use same value in backend)</small>
                    </div>
                    
                    <div style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#666'
                    }}>
                      <strong>Note:</strong> Higher iterations provide more accurate estimates but take longer to compute.
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>50-100: Quick testing (~5-15s)</li>
                        <li>500-1000: Standard analysis (~30-90s)</li>
                        <li>1000-5000: High precision (~2-8min)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="results-section">
                  <div className="results-title">🎯 PLSpredict Configuration</div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        k-Folds:
                      </label>
                      <input
                        type="number"
                        value={plsFolds}
                        onChange={(e) => setPlsFolds(parseInt(e.target.value) || 10)}
                        min="5"
                        max="20"
                        step="1"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 10 (recommended: 5-10)</small>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Repetitions:
                      </label>
                      <input
                        type="number"
                        value={plsReps}
                        onChange={(e) => setPlsReps(parseInt(e.target.value) || 10)}
                        min="5"
                        max="50"
                        step="5"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 10 (recommended: 10-20)</small>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={plsNoFolds}
                          onChange={(e) => setPlsNoFolds(e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Use full sample (no cross-validation)</span>
                      </label>
                      <small style={{ color: '#666', fontSize: '0.75rem', marginLeft: '1.5rem' }}>
                        Faster but less robust validation
                      </small>
                    </div>
                    
                    <div style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#666'
                    }}>
                      <strong>Note:</strong> Cross-validation estimates out-of-sample prediction performance.
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>5-fold, 10 reps: Quick validation (~15-30s)</li>
                        <li>10-fold, 10 reps: Standard (default, ~30-60s)</li>
                        <li>10-fold, 20+ reps: High precision (~60-120s)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="results-section">
                  <div className="results-title">ℹ️ About WebR Mode</div>
                  <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#666' }}>
                    <p>Running entirely in your browser using WebAssembly.</p>
                    <p style={{ marginTop: '0.5rem' }}>All calculations are performed client-side with no server required.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppWebR;
