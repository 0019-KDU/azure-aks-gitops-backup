# CI/CD Pipeline Flow & Troubleshooting

## 🔄 How the Pipeline Works

### Step-by-Step Process:

1. **Push to main branch**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```

2. **GitHub Actions Triggers** (`.github/workflows/ci-cd.yml`)
   - Builds Docker image
   - Tags with SHA: `chiradev/nextjs-app:main-abc1234`
   - Also tags: `chiradev/nextjs-app:latest`
   - Pushes to Docker Hub

3. **Updates Deployment Manifest**
   - Modifies `k8s/deployment.yaml`
   - Changes image tag from `:latest` to `:main-abc1234`
   - Commits and pushes back to repo

4. **ArgoCD Detects Change**
   - Watches the Git repository
   - Sees the updated deployment.yaml
   - Syncs to Kubernetes cluster

5. **Kubernetes Rolling Update**
   - Pulls new image from Docker Hub
   - Creates new pods with new version
   - Terminates old pods
   - Zero downtime deployment

## ✅ Verifying New Features Are Deployed

### Check GitHub Actions:
```bash
# Go to: https://github.com/0019-KDU/azure-aks-gitops-backup/actions
# Verify build completed successfully
```

### Check Docker Hub:
```bash
# Go to: https://hub.docker.com/r/chiradev/nextjs-app/tags
# Verify new tag exists (main-abc1234)
```

### Check Git Repository:
```bash
# View deployment.yaml
cat k8s/deployment.yaml | grep image:

# Should show:
# image: chiradev/nextjs-app:main-abc1234
```

### Check ArgoCD:
```bash
# View ArgoCD application status
kubectl get application -n argocd

# Or use ArgoCD CLI
argocd app get <your-app-name>

# Check sync status
argocd app sync <your-app-name>
```

### Check Kubernetes Pods:
```bash
# Watch pods being updated
kubectl get pods -n <your-namespace> -w

# Check pod image
kubectl get pods -n <your-namespace> -o jsonpath='{.items[*].spec.containers[*].image}'

# Should show: chiradev/nextjs-app:main-abc1234

# Check pod age (new pods should be recent)
kubectl get pods -n <your-namespace>
```

### Force Pod Restart (if needed):
```bash
# Restart deployment to pull new image
kubectl rollout restart deployment/system-monitor -n <your-namespace>

# Watch rollout status
kubectl rollout status deployment/system-monitor -n <your-namespace>
```

### Check Pod Logs:
```bash
# View logs from new pods
kubectl logs -f deployment/system-monitor -n <your-namespace>
```

## 🐛 Troubleshooting: New Features Not Showing

### Issue 1: ArgoCD Not Syncing

**Check:**
```bash
kubectl get application -n argocd
argocd app get <your-app-name>
```

**Fix:**
```bash
# Manual sync
argocd app sync <your-app-name>

# Force sync
argocd app sync <your-app-name> --force
```

### Issue 2: Old Pods Still Running

**Check:**
```bash
# Check pod creation time
kubectl get pods -n <your-namespace>

# Check image being used
kubectl describe pod <pod-name> -n <your-namespace> | grep Image:
```

**Fix:**
```bash
# Force rolling restart
kubectl rollout restart deployment/system-monitor -n <your-namespace>

# Delete old pods manually
kubectl delete pod <pod-name> -n <your-namespace>
```

### Issue 3: Image Not Updated

**Check:**
```bash
# Check deployment manifest
kubectl get deployment system-monitor -n <your-namespace> -o yaml | grep image:

# Check if it shows the SHA tag or just :latest
```

**Fix:**
```bash
# If still showing :latest, ArgoCD didn't sync
# Check ArgoCD application and force sync
argocd app sync <your-app-name> --prune
```

### Issue 4: Browser Caching

**Fix:**
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Open in incognito/private window

### Issue 5: LoadBalancer Not Updated

**Check:**
```bash
# Get LoadBalancer IP
kubectl get svc system-monitor -n <your-namespace>

# Check endpoints
kubectl get endpoints system-monitor -n <your-namespace>
```

**Fix:**
```bash
# Restart service if needed
kubectl delete svc system-monitor -n <your-namespace>
kubectl apply -f k8s/service.yaml
```

## 📊 Monitoring Deployment

### Real-time Monitoring:
```bash
# Watch all resources
watch kubectl get all -n <your-namespace>

# Watch pods with image info
watch 'kubectl get pods -n <your-namespace> -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image,STATUS:.status.phase,AGE:.metadata.creationTimestamp'
```

### View Deployment History:
```bash
# View rollout history
kubectl rollout history deployment/system-monitor -n <your-namespace>

# View specific revision
kubectl rollout history deployment/system-monitor -n <your-namespace> --revision=2
```

### Rollback if Needed:
```bash
# Rollback to previous version
kubectl rollout undo deployment/system-monitor -n <your-namespace>

# Rollback to specific revision
kubectl rollout undo deployment/system-monitor -n <your-namespace> --to-revision=1
```

## 🎯 Expected Behavior After Push

**Timeline:**
1. **0-2 min**: GitHub Actions builds Docker image
2. **2-3 min**: Image pushed to Docker Hub
3. **3-4 min**: Deployment manifest updated and committed
4. **4-5 min**: ArgoCD detects change
5. **5-7 min**: New pods created, old pods terminated
6. **7-8 min**: New version live!

**Total time: ~8 minutes from push to live**

## 🔍 Debug Checklist

- [ ] GitHub Actions completed successfully
- [ ] New Docker image tag exists on Docker Hub
- [ ] k8s/deployment.yaml shows new image tag (main-abc1234)
- [ ] ArgoCD application status is "Synced"
- [ ] Pods are running with new image
- [ ] Pods are recently created (check AGE)
- [ ] LoadBalancer service is working
- [ ] Browser cache cleared

## 📝 Quick Commands Reference

```bash
# Full deployment verification
echo "=== GitHub Actions ===" && \
echo "Check: https://github.com/0019-KDU/azure-aks-gitops-backup/actions" && \
echo "" && \
echo "=== Current Image ===" && \
kubectl get deployment system-monitor -n <your-namespace> -o jsonpath='{.spec.template.spec.containers[0].image}' && \
echo "" && \
echo "" && \
echo "=== Pod Status ===" && \
kubectl get pods -n <your-namespace> && \
echo "" && \
echo "=== LoadBalancer IP ===" && \
kubectl get svc system-monitor -n <your-namespace> -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## 💡 Pro Tips

1. **Always verify the image tag changed** in `k8s/deployment.yaml` after CI/CD runs
2. **Watch pod creation** with `-w` flag to see real-time updates
3. **Check ArgoCD UI** for visual representation of sync status
4. **Use `kubectl describe pod`** to see detailed events and errors
5. **Force restart** if ArgoCD synced but pods didn't update

---

**Need more help?** Check the logs and pod events for detailed error messages.
