from planner_executor import CACHE_FILE, HISTORY_FILE, generate_plan_only, execute_plan, save_history
from k8s_module import load_k8s_config, is_cluster_available
from fastapi.middleware.cors import CORSMiddleware
from contextlib import redirect_stdout
from pydantic import BaseModel
from kubernetes import client
from fastapi import FastAPI
import json
import yaml
import io
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommandRequest(BaseModel):
    command: str

class ExecuteRequest(BaseModel):
    command: str

@app.get("/")
def home():
    return {"message": "Backend FastAPI fonctionne"}

@app.post("/cluster/scale")
def scale_deployment_api(data: dict):
    try:
        name = data.get("name")
        namespace = data.get("namespace", "default")
        replicas = int(data.get("replicas", 1))

        load_k8s_config()
        apps_v1 = client.AppsV1Api()

        body = {
            "spec": {
                "replicas": replicas
            }
        }

        apps_v1.patch_namespaced_deployment_scale(
            name=name,
            namespace=namespace,
            body=body
        )

        return {
            "success": True,
            "message": f"{name} scalé à {replicas} replicas"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/cache/clear")
def clear_cache():
    try:
        if os.path.exists(CACHE_FILE):
            os.remove(CACHE_FILE)

        return {
            "success": True,
            "message": "Cache supprimé avec succès."
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/cluster/delete")
def delete_deployment(data: dict):
    try:
        name = data.get("name")
        namespace = data.get("namespace", "default")

        load_k8s_config()
        apps_v1 = client.AppsV1Api()

        apps_v1.delete_namespaced_deployment(
            name=name,
            namespace=namespace
        )

        return {
            "success": True,
            "message": f"{name} supprimé"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/plan")
def generate_plan(req: CommandRequest):
    return generate_plan_only(req.command)

@app.post("/dry-run")
def dry_run(req: CommandRequest):
    result = generate_plan_only(req.command)

    return {
        "success": result["success"],
        "message": "Simulation réussie (aucune action exécutée)." if result["success"] else "Erreur",
        "plan": result.get("plan"),
        "error": result.get("error"),
        "dry_run": True
    }

@app.post("/execute")
def execute_command(req: ExecuteRequest):
    result = generate_plan_only(req.command)

    if not result["success"]:
        return {
            "success": False,
            "message": "Plan invalide, exécution annulée.",
            "error": result.get("error"),
            "plan": result.get("plan"),
            "logs": []
        }

    try:
        output = io.StringIO()

        with redirect_stdout(output):
            load_k8s_config()
            execute_plan(result["plan"])

        logs = output.getvalue().splitlines()

        save_history(req.command, result["plan"])

        return {
            "success": True,
            "message": "Commande exécutée avec succès.",
            "plan": result["plan"],
            "logs": logs
        }

    except Exception as e:
        return {
            "success": False,
            "message": "Erreur pendant l'exécution.",
            "error": str(e),
            "plan": result["plan"],
            "logs": output.getvalue().splitlines() if "output" in locals() else []
        }

@app.get("/history")
def get_history():
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)

        return {
            "success": True,
            "history": history[-10:][::-1]
        }

    except FileNotFoundError:
        return {
            "success": True,
            "history": []
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "history": []
        }

@app.get("/cluster/status")
def cluster_status():
    try:
        load_k8s_config()

        connected = is_cluster_available()

        if not connected:
            return {
                "connected": False,
                "pods": 0,
                "deployments": 0,
                "services": 0
            }

        v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        pods = v1.list_pod_for_all_namespaces()
        deployments = apps_v1.list_deployment_for_all_namespaces()
        services = v1.list_service_for_all_namespaces()

        return {
            "connected": True,
            "pods": len(pods.items),
            "deployments": len(deployments.items),
            "services": len(services.items)
        }

    except Exception as e:
        return {
            "connected": False,
            "error": str(e),
            "pods": 0,
            "deployments": 0,
            "services": 0
        }

@app.get("/cluster/resources")
def cluster_resources():
    try:
        load_k8s_config()

        if not is_cluster_available():
            return {
                "success": False,
                "error": "Cluster Kubernetes indisponible",
                "pods": [],
                "deployments": [],
                "services": []
            }

        v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        pods_data = []
        pods = v1.list_pod_for_all_namespaces()
        for pod in pods.items:
            pods_data.append({
                "namespace": pod.metadata.namespace,
                "name": pod.metadata.name,
                "status": pod.status.phase,
                "node": pod.spec.node_name or "-"
            })

        deployments_data = []
        deployments = apps_v1.list_deployment_for_all_namespaces()
        for dep in deployments.items:
            deployments_data.append({
                "namespace": dep.metadata.namespace,
                "name": dep.metadata.name,
                "replicas": dep.spec.replicas or 0,
                "available": dep.status.available_replicas or 0,
                "ready": dep.status.ready_replicas or 0
            })

        services_data = []
        services = v1.list_service_for_all_namespaces()
        for svc in services.items:
            services_data.append({
                "namespace": svc.metadata.namespace,
                "name": svc.metadata.name,
                "type": svc.spec.type,
                "cluster_ip": svc.spec.cluster_ip
            })

        return {
            "success": True,
            "pods": pods_data,
            "deployments": deployments_data,
            "services": services_data
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "pods": [],
            "deployments": [],
            "services": []
        }

@app.get("/kubeconfig/info")
def kubeconfig_info():
    try:
        kubeconfig_path = os.path.expanduser("~/.kube/config")

        with open(kubeconfig_path, "r", encoding="utf-8") as f:
            kubeconfig = yaml.safe_load(f)

        current_context = kubeconfig.get("current-context")

        context_data = next(
            (ctx for ctx in kubeconfig.get("contexts", []) if ctx["name"] == current_context),
            None
        )

        if not context_data:
            return {"success": False, "error": "Contexte courant introuvable"}

        cluster_name = context_data["context"].get("cluster")
        user_name = context_data["context"].get("user")
        namespace = context_data["context"].get("namespace", "default")

        cluster_data = next(
            (c for c in kubeconfig.get("clusters", []) if c["name"] == cluster_name),
            None
        )

        server = cluster_data["cluster"].get("server") if cluster_data else "Unknown"

        return {
            "success": True,
            "current_context": current_context,
            "cluster": cluster_name,
            "user": user_name,
            "namespace": namespace,
            "server": server
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
