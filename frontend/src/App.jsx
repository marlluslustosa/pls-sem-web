import { useState, useCallback } from 'react';
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
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

// Nós iniciais de exemplo
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

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newConstructName, setNewConstructName] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapResults, setBootstrapResults] = useState(null);
  const [activeView, setActiveView] = useState('builder'); // 'builder' ou 'model'
  const [rightPanel, setRightPanel] = useState('results'); // 'results' ou 'properties'
  
  // Parâmetros configuráveis
  const [nboot, setNboot] = useState(1000);
  const [randomSeed, setRandomSeed] = useState(123);
  const [kFolds, setKFolds] = useState(10);
  const [plsPredictReps, setPlsPredictReps] = useState(10);
  
  // PLSpredict
  const [predicting, setPredicting] = useState(false);
  const [predictResults, setPredictResults] = useState(null);
  
  // Nós e edges para visualização do modelo final
  const [modelNodes, setModelNodes, onModelNodesChange] = useNodesState([]);
  const [modelEdges, setModelEdges, onModelEdgesChange] = useEdgesState([]);

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

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const constructs = nodes.map((node) => ({
        id: node.id,
        indicators: [],
      }));

      const relationships = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      }));

      const response = await axios.post(`${API_URL}/run-analysis`, {
        constructs,
        relationships,
      });

      console.log('Resposta:', response.data);

      if (response.data.success) {
        setResults(response.data);

        const pathCoeffs = response.data.path_coefficients || {};
        if (Object.keys(pathCoeffs).length > 0) {
          setEdges((eds) =>
            eds.map((edge) => {
              const pathKey = `${edge.source}  ->  ${edge.target}`;
              const coeff = pathCoeffs[pathKey];
              
              if (coeff !== undefined) {
                return {
                  ...edge,
                  label: `β = ${coeff.toFixed(3)}`,
                  labelStyle: { fill: '#000', fontWeight: 700 },
                  labelBgStyle: { fill: '#fff' },
                };
              }
              return edge;
            })
          );
        }
      } else {
        setError(response.data.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro:', err);
      setError(err.message || 'Erro ao conectar com o backend');
    } finally {
      setLoading(false);
    }
  };

  const clearModel = () => {
    setNodes([]);
    setEdges([]);
    setResults(null);
    setBootstrapResults(null);
    setError(null);
  };

  const runBootstrap = async () => {
    setBootstrapping(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/bootstrap`, null, {
        params: { nboot: nboot, cores: 2, seed: randomSeed }
      });

      if (response.data.success) {
        setBootstrapResults(response.data);
        createModelVisualization(response.data.bootstrap_summary);
        setActiveView('model');
      } else {
        setError(response.data.error || 'Erro no bootstrap');
      }
    } catch (err) {
      console.error('Erro bootstrap:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao executar bootstrap');
    } finally {
      setBootstrapping(false);
    }
  };

  const runPLSPredict = async () => {
    setPredicting(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/pls-predict`, null, {
        params: { k: kFolds, reps: plsPredictReps, seed: randomSeed }
      });

      console.log('PLSpredict response:', response.data);

      if (response.data.success) {
        setPredictResults(response.data);
        console.log('PredictResults set:', response.data);
      } else {
        setError(response.data.error || 'Erro no PLSpredict');
      }
    } catch (err) {
      console.error('Erro PLSpredict:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao executar PLSpredict');
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
        data: { 
          label: construct,
        },
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
        label: `β=${mean.toFixed(3)}\\nt=${tValue.toFixed(2)}${isSignificant ? '*' : ''}`,
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
      {/* Header - Estilo SmartPLS */}
      <div className="header">
        <div className="header-left">
          <div className="header-logo">
            <span className="header-logo-icon">🔬</span>
            <span>PLS-SEM Web</span>
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
          <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>v1.0.0</span>
        </div>
      </div>

      {/* Workspace Principal */}
      <div className="workspace">
        {/* Sidebar Esquerdo - Project Explorer */}
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
            </div>
            
            <div className="project-section">
              <div className="project-section-title">📁 Data</div>
              <div className="project-item">📄 mobi.csv</div>
            </div>
            
            <div className="project-section">
              <div className="project-section-title">🔧 Models</div>
              <div className="project-item">Current Model</div>
            </div>
          </div>
        </div>

        {/* Área Central */}
        <div className="main-canvas">
          {activeView === 'builder' ? (
            <>
              {/* Toolbar */}
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
                    onClick={runAnalysis}
                    disabled={loading || edges.length === 0}
                    className="toolbar-button primary"
                  >
                    {loading ? '⏳ Running...' : '▶️ Calculate PLS'}
                  </button>
                  <button
                    onClick={runBootstrap}
                    disabled={bootstrapping || !results}
                    className="toolbar-button success"
                  >
                    {bootstrapping ? `⏳ Bootstrapping (${nboot})...` : `🔬 Bootstrap (${nboot} iter)`}
                  </button>
                  <button
                    onClick={runPLSPredict}
                    disabled={predicting || !results}
                    className="toolbar-button success"
                  >
                    {predicting ? `⏳ Predicting (${kFolds}-fold)...` : `🎯 PLSpredict (${kFolds}-fold CV)`}
                  </button>
                </div>
              </div>

              {/* Canvas */}
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
          ) : (
            <>
              {/* Model View */}
              <div className="model-info-banner">
                <h2>
                  <span>📊</span>
                  Bootstrap Results Model
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
          )}
        </div>

        {/* Sidebar Direito - Results/Properties */}
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

                {!results && !error && !loading && !bootstrapResults && (
                  <div className="placeholder">
                    <div className="placeholder-icon">📈</div>
                    <h3>No Results Yet</h3>
                    <p>Build your model and click "Calculate PLS" to see results</p>
                    <ol>
                      <li>Add constructs</li>
                      <li>Connect nodes</li>
                      <li>Run analysis</li>
                    </ol>
                  </div>
                )}

                {loading && (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Running PLS-SEM analysis...</p>
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

                {predictResults && predictResults.success && (
                  <div className="fade-in">
                    <div className="results-section">
                      <div className="results-title">🎯 PLSpredict Results (Out-of-Sample Prediction)</div>
                      <div style={{ padding: '0.5rem 1rem', background: '#f8f9fa', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        <strong>Configuration:</strong> {predictResults.folds || 0}-fold Cross-Validation, {predictResults.repetitions || 0} repetitions
                      </div>

                      {/* Métricas por Construto */}
                      {predictResults.construct_metrics && Object.keys(predictResults.construct_metrics).length > 0 && (
                        <>
                          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>📊 Construct-Level Metrics</h4>
                          <table className="results-table">
                            <thead>
                              <tr>
                                <th>Construct</th>
                                <th>In-Sample MSE</th>
                                <th>Out-of-Sample MSE</th>
                                <th>In-Sample MAE</th>
                                <th>Out-of-Sample MAE</th>
                                <th>Overfit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(predictResults.construct_metrics).map(([construct, metrics]) => {
                                if (!metrics) return null;
                                const overfitGood = (metrics.overfit || 0) < 0.15;
                                return (
                                  <tr key={construct}>
                                    <td style={{ fontWeight: 600 }}>{construct}</td>
                                    <td>{(metrics.IS_MSE || 0).toFixed(4)}</td>
                                    <td>{(metrics.OOS_MSE || 0).toFixed(4)}</td>
                                    <td>{(metrics.IS_MAE || 0).toFixed(4)}</td>
                                    <td>{(metrics.OOS_MAE || 0).toFixed(4)}</td>
                                    <td style={{ 
                                      fontWeight: 'bold',
                                      color: overfitGood ? '#28a745' : '#ffc107'
                                    }}>
                                      {((metrics.overfit || 0) * 100).toFixed(1)}%
                                      {overfitGood && ' ✓'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </>
                      )}

                      {/* Métricas por Indicador */}
                      {predictResults.indicator_metrics && Object.keys(predictResults.indicator_metrics).length > 0 && (
                        <>
                          <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>📈 Indicator-Level Metrics (PLS vs LM)</h4>
                          <table className="results-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th rowSpan="2">Indicator</th>
                                <th colSpan="2">PLS In-Sample</th>
                                <th colSpan="2">PLS Out-Sample</th>
                                <th colSpan="2">LM Out-Sample</th>
                              </tr>
                              <tr>
                                <th>RMSE</th>
                                <th>MAE</th>
                                <th>RMSE</th>
                                <th>MAE</th>
                                <th>RMSE</th>
                                <th>MAE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(predictResults.indicator_metrics).map(([indicator, metrics]) => {
                                if (!metrics || !metrics.PLS || !metrics.LM) return null;
                                // PLS é melhor que LM se tiver menor erro
                                const plsOutRMSE = metrics.PLS?.out_sample?.RMSE || 0;
                                const lmOutRMSE = metrics.LM?.out_sample?.RMSE || 0;
                                const plsBetter = plsOutRMSE < lmOutRMSE;
                                return (
                                  <tr key={indicator} className={plsBetter ? 'significant' : ''}>
                                    <td style={{ fontWeight: 600 }}>{indicator}</td>
                                    <td>{(metrics.PLS?.in_sample?.RMSE || 0).toFixed(3)}</td>
                                    <td>{(metrics.PLS?.in_sample?.MAE || 0).toFixed(3)}</td>
                                    <td style={{ fontWeight: 'bold' }}>{(metrics.PLS?.out_sample?.RMSE || 0).toFixed(3)}</td>
                                    <td style={{ fontWeight: 'bold' }}>{(metrics.PLS?.out_sample?.MAE || 0).toFixed(3)}</td>
                                    <td>{(metrics.LM?.out_sample?.RMSE || 0).toFixed(3)}</td>
                                    <td>{(metrics.LM?.out_sample?.MAE || 0).toFixed(3)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* Botões para visualizar gráficos de erro */}
                          <div style={{ marginTop: '1rem' }}>
                            <h5 style={{ marginBottom: '0.5rem' }}>📊 Error Distribution Plots</h5>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {Object.keys(predictResults.indicator_metrics).map(indicator => (
                                <button
                                  key={indicator}
                                  onClick={() => window.open(`${API_URL}/pls-predict-plot?indicator=${indicator}`, '_blank')}
                                  className="toolbar-button"
                                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                                >
                                  📈 {indicator}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div style={{ 
                        padding: '0.75rem', 
                        background: '#e7f3ff', 
                        marginTop: '1rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#004085'
                      }}>
                        <strong>📖 Interpretation Guide:</strong>
                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: 0 }}>
                          <li><strong>Lower RMSE/MAE:</strong> Better prediction accuracy</li>
                          <li><strong>PLS &lt; LM:</strong> PLS model outperforms Linear Model</li>
                          <li><strong>Overfit &lt; 15%:</strong> Good model generalization</li>
                          <li><strong>IS vs OOS:</strong> In-Sample vs Out-of-Sample (test set)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="fade-in">
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
                        onChange={(e) => setNboot(parseInt(e.target.value) || 1000)}
                        min="50"
                        max="5000"
                        step="50"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 1000 (recommended: 500-1000)</small>
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
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>For reproducibility (same as WebR mode)</small>
                    </div>
                    
                    <div style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#666'
                    }}>
                      <strong>Note:</strong> Use the same seed value in both Backend and WebR modes to get identical results.
                    </div>
                  </div>
                </div>

                <div className="results-section">
                  <div className="results-title">🎯 PLSpredict Configuration</div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        K-Folds (Cross-Validation):
                      </label>
                      <input
                        type="number"
                        value={kFolds}
                        onChange={(e) => setKFolds(parseInt(e.target.value) || 10)}
                        min="2"
                        max="20"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 10 (typical range: 5-10)</small>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        Repetitions:
                      </label>
                      <input
                        type="number"
                        value={plsPredictReps}
                        onChange={(e) => setPlsPredictReps(parseInt(e.target.value) || 10)}
                        min="1"
                        max="100"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                      <small style={{ color: '#666', fontSize: '0.75rem' }}>Default: 10 (higher = more stable)</small>
                    </div>
                    
                    <div style={{ 
                      padding: '0.75rem', 
                      background: '#f8f9fa', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#666'
                    }}>
                      <strong>About PLSpredict:</strong> Assesses out-of-sample prediction accuracy using cross-validation. 
                      Q² &gt; 0 indicates predictive relevance.
                    </div>
                  </div>
                </div>

                <div className="results-section">
                  <div className="results-title">ℹ️ About Backend Mode</div>
                  <div style={{ padding: '1rem', fontSize: '0.85rem', color: '#666' }}>
                    <p>Using R backend server with Plumber API.</p>
                    <p style={{ marginTop: '0.5rem' }}>Calculations are performed server-side with full seminr package.</p>
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

export default App;
