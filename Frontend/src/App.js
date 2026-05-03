import { useEffect, useState } from "react";
import "./App.light.css";
import {
  RefreshCw,
  Trash2,
  Printer,
  Database,
  FileText,
  Settings,
  TestTubeDiagonal,
  Ban,
  Send,
  Clock,
  Loader,
  X,
  Scroll,
  Play,
  Sparkles,
  TriangleAlert
} from "lucide-react";



function App() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cluster, setCluster] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [history, setHistory] = useState([]);
  const [resources, setResources] = useState({
    pods: [],
    deployments: [],
    services: []
  });
  const [kubeconfig, setKubeconfig] = useState(null);
  const hasDeleteAction = response?.plan?.some(
    (step) => step.action === "delete"
  );

  useEffect(() => {
    refreshCluster();
    refreshKubeconfig();
    refreshHistory();
    refreshResources();
  }, []);


  const dryRunCommand = async () => {
    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/dry-run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await res.json();
    setResponse(data);

    setLoading(false);
  };


  const refreshResources = async () => {
    const res = await fetch("http://127.0.0.1:8000/cluster/resources");
    const data = await res.json();

    if (data.success) {
      setResources({
        pods: data.pods,
        deployments: data.deployments,
        services: data.services,
      });
    }
  };

  const generatePlan = async () => {
    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await res.json();
    setResponse(data);
    setLoading(false);
  };

  const refreshHistory = async () => {
    const res = await fetch("http://127.0.0.1:8000/history");
    const data = await res.json();

    if (data.success) {
      setHistory(data.history);
    }
  };

  const refreshKubeconfig = async () => {
    const res = await fetch("http://127.0.0.1:8000/kubeconfig/info");
    const data = await res.json();
    setKubeconfig(data);
  };
  const refreshCluster = async () => {
    const res = await fetch("http://127.0.0.1:8000/cluster/status");
    const data = await res.json();
    setCluster(data);
  };

  const executeCommand = async () => {
    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    const data = await res.json();
    setResponse(data);

    refreshHistory();
    refreshCluster();
    refreshResources();

    setLoading(false);
  };

  const clearCache = async () => {
    const res = await fetch("http://127.0.0.1:8000/cache/clear", {
      method: "POST",
    });

    const data = await res.json();
    alert(data.message || data.error);
  };

  const cancelPlan = () => {
    setResponse(null);
    setCommand("");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img
            src="/Kubernetes_logo.svg"
            alt="kubernetes"
            className="sidebar-logo"
          />
          <span>Kubernetes</span>
        </div>

        <div className="status-card">
          <span className={cluster?.connected ? "status-dot" : "status-dot offline"}></span>
          Cluster status
          <strong className={cluster?.connected ? "online-text" : "offline-text"}>
            {cluster?.connected ? "Connected" : "Disconnected"}
          </strong>
        </div>
        <div className="dashboard">
          <div className="kube-card">
            <h3><Settings size={20} /> Kubeconfig</h3>

            {kubeconfig?.success ? (
              <>
                <p><span>Context</span><strong>{kubeconfig.current_context}</strong></p>
                <p><span>Cluster</span><strong>{kubeconfig.cluster}</strong></p>
                <p><span>User</span><strong>{kubeconfig.user}</strong></p>
                <p><span>Namespace</span><strong>{kubeconfig.namespace}</strong></p>
                <p><span>API Server</span><strong className="server-text">{kubeconfig.server}</strong></p>
              </>
            ) : (
              <div className="error-box">
                <X size={18} color="#ff3434"/> {kubeconfig?.error || "Kubeconfig indisponible"}
              </div>
            )}
          </div>
          <div className="metric-card">
            <span>Deployments</span>
            <strong>{cluster?.deployments ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Pods</span>
            <strong>{cluster?.pods ?? 0}</strong>
          </div>
          <div className="metric-card">
            <span>Services</span>
            <strong>{cluster?.services ?? 0}</strong>
          </div>
        </div>

        <div className="history-card">
          <h3><Clock size={20} /> Historique</h3>

          {history.length === 0 ? (
            <p className="empty-text">Aucune commande exécutée.</p>
          ) : (
            history.map((item, index) => (
              <button
                className="history-item"
                key={index}
                onClick={() => setCommand(item.command)}
              >
                <strong>{item.command}</strong>
                <small>{item.plan?.[0]?.action || "action"}</small>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <div className="hero-top">

            {/* LEFT */}
            <div>
              <h1 className="title-with-logo">
                <img src='/Kubernetes_logo.svg' alt="Kubernetes" className="kube-logo" />
                AI Kubernetes Orchestrator
              </h1>
              <p>
                Agent IA pour convertir des commandes naturelles en plans Kubernetes
                validés, sécurisés et exécutables.
              </p>
            </div>

            {/* RIGHT (Controls) */}
            <div className="hero-controls">
              <button
                id="Refresh"
                className="side-btn"
                onClick={() => {
                  refreshCluster();
                  refreshResources();
                  refreshHistory();
                  refreshKubeconfig();
                }}
              >
                <RefreshCw size={16} color="#4b5cf8"/> Refresh
              </button>

              <button className="side-btn" id="Clear" onClick={clearCache}>
                <Trash2 size={16} color="#f83737"/> Clear
              </button>

              <button id="Print" className="side-btn" onClick={() => window.print()}>
                <Printer size={16} color="#0fc51e"/> Print
              </button>
            </div>

          </div>
        </header>
        <section className="command-card">
          <h2><Sparkles size={27} color="#3e1dfa"/> Assistant IA</h2>

          <div className="input-row">
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Ex : deploy nginx with 2 replicas, status nginx..."
            />
            <button className="Execute" onClick={generatePlan} id="Genere"> <Send size={16} color='white'/>Générer</button>
          </div>

          {loading && (
            <div className="loader">
              <Loader size={17} color="#3e1dfa"/> Traitement en cours...
            </div>
          )}
        </section>

        {response && (
          <section className="plan-card">
            <div className="plan-header">
              <h2><FileText size={20} /> Plan IA généré</h2>
              {response.cache_used && <span className="badge">Cache utilisé</span>}
              {response.success ? (
                <span className="badge success">Validation OK</span>
              ) : (
                <span className="badge error">Erreur</span>
              )}
            </div>

            {response.success ? (
              <>
                {response.plan?.map((step, index) => (
                  <div className="step-card" key={index}>
                    <p><strong>Action :</strong> {step.action}</p>
                    {step.name && <p><strong>Nom :</strong> {step.name}</p>}
                    {step.image && <p><strong>Image :</strong> {step.image}</p>}
                    {step.replicas !== undefined && (
                      <p><strong>Replicas :</strong> {step.replicas}</p>
                    )}
                  </div>
                ))}
                {hasDeleteAction && (
                  <div className="delete-warning">
                    <TriangleAlert size={18} color="#f82626"/> Action destructive détectée. Confirme avant d’exécuter.

                    <label className="confirm-delete">
                      <input
                        type="checkbox"
                        checked={deleteConfirmed}
                        onChange={(e) => setDeleteConfirmed(e.target.checked)}
                      />
                      Je confirme la suppression
                    </label>
                  </div>
                )}
                <div className="actions">
                  <button className="btn dry" onClick={dryRunCommand}><TestTubeDiagonal size={17} /> Dry-run</button>
                  <button
                    className="btn execute"
                    onClick={executeCommand}
                    disabled={hasDeleteAction && !deleteConfirmed}
                  >
                    <Play size={17}/> Exécuter
                  </button>
                  <button className="btn cancel" onClick={cancelPlan}>
                    <Ban size={17}/> Annuler
                  </button>
                </div>

                {response.logs && response.logs.length > 0 && (
                  <div className="logs-box">
                    <h3><Scroll size={18}/> Logs Kubernetes</h3>

                    {response.logs.map((line, index) => (
                      <div className="log-line" key={index}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                {response?.dry_run && (
                  <div className="result dry-box">
                    <TestTubeDiagonal size={17} color="#54d123"/> Mode simulation — aucune action exécutée
                  </div>
                )}
              </>
            ) : (
              <div className="result error-box">
                <X size={18} color="#ff2828"/> {response.error || response.message}
              </div>
            )}
          </section>
        )}


        <section className="resources-card">
          <div className="resources-header">
            <h2><Database size={20} />  Kubernetes Resources</h2>
          </div>

          <div className="resource-section">
            <h3>Pods</h3>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Namespace</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Node</th>
                  </tr>
                </thead>

                <tbody>
                  {resources.pods.map((pod, index) => (
                    <tr key={index}>
                      <td>{pod.namespace}</td>
                      <td>{pod.name}</td>
                      <td>
                        <span className={pod.status === "Running" ? "pill ok" : "pill warn"}>
                          {pod.status}
                        </span>
                      </td>
                      <td>{pod.node}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="resource-section">
            <h3>Deployments</h3>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Namespace</th>
                    <th>Name</th>
                    <th>Replicas</th>
                    <th>Available</th>
                    <th>Ready</th>
                  </tr>
                </thead>

                <tbody>
                  {resources.deployments.map((dep, index) => (
                    <tr key={index}>
                      <td>{dep.namespace}</td>
                      <td>{dep.name}</td>
                      <td>{dep.replicas}</td>
                      <td>{dep.available}</td>
                      <td>{dep.ready}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="resource-section">
            <h3>Services</h3>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Namespace</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Cluster IP</th>
                  </tr>
                </thead>

                <tbody>
                  {resources.services.map((svc, index) => (
                    <tr key={index}>
                      <td>{svc.namespace}</td>
                      <td>{svc.name}</td>
                      <td>
                        <span className="pill info">{svc.type}</span>
                      </td>
                      <td>{svc.cluster_ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;