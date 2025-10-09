# CI/CD Setup Guide

Simple GitHub Actions CI/CD pipeline for your existing Kubernetes cluster with ArgoCD.

## 🎯 What This Does

```
1. Push code to main branch
   ↓
2. GitHub Actions builds Docker image
   ↓
3. Pushes to Docker Hub (with SHA tag + latest)
   ↓
4. Updates k8s/deployment.yaml with new image tag
   ↓
5. Commits changes back to repo
   ↓
6. ArgoCD automatically detects and deploys
```

## ⚙️ Setup (2 Steps)

### 1. Configure GitHub Secrets

Go to: `Settings → Secrets and variables → Actions → New repository secret`

Add these two secrets:

| Secret Name | Value |
|------------|-------|
| `DOCKER_USERNAME` | chiradev |
| `DOCKER_PASSWORD` | Your Docker Hub access token |

**How to get Docker Hub token:**
1. Login to https://hub.docker.com
2. Go to Account Settings → Security → New Access Token
3. Copy the token

### 2. Configuration Complete! ✅

Docker image is already configured as: `chiradev/nextjs-app`

No additional changes needed!

## 🚀 That's It!

Now every time you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will:
- ✅ Build Docker image
- ✅ Push to Docker Hub with SHA tag (e.g., `main-abc1234`)
- ✅ Update `k8s/deployment.yaml` with new image
- ✅ Commit the change automatically
- ✅ ArgoCD syncs to your cluster

## 📊 Monitor Builds

View build status:
- Go to your GitHub repo → Actions tab
- See real-time build logs
- Get deployment summary after each build

## 🔍 Verify Deployment

```bash
# Check ArgoCD detected the change
kubectl get application -n argocd

# Watch pods updating
kubectl get pods -n system-monitor -w

# View deployment history
kubectl rollout history deployment/system-monitor -n system-monitor
```

## 🏷️ Image Tags

Each build creates:
- `chiradev/nextjs-app:main-abc1234` (unique SHA tag)
- `chiradev/nextjs-app:latest` (always latest)

## 🛠️ Troubleshooting

**Build fails on "Push to Docker Hub":**
- Check DOCKER_USERNAME and DOCKER_PASSWORD secrets are correct
- Verify Docker Hub credentials

**Git push fails:**
- GitHub Actions needs write permission (enabled by default)
- Check: Settings → Actions → General → Workflow permissions → "Read and write permissions"

**ArgoCD not syncing:**
- Check ArgoCD sync policy is set to automatic
- Manual sync: `argocd app sync <your-app-name>`

## 📝 Workflow File

The CI/CD pipeline is defined in: `.github/workflows/ci-cd.yml`

**What it does:**
1. Checks out code
2. Builds Docker image
3. Pushes to Docker Hub
4. Updates deployment manifest
5. Commits and pushes changes

## 🎁 Features

- ✅ Automated builds on every push to main
- ✅ SHA-based image tagging for rollbacks
- ✅ Automatic manifest updates
- ✅ Docker layer caching (faster builds)
- ✅ Build summaries in GitHub Actions

## 📚 Next Steps

- [ ] Test the pipeline by making a small change
- [ ] Monitor build in GitHub Actions tab
- [ ] Verify ArgoCD syncs the new image
- [ ] Check pods are updated in cluster

---

**Need help?** Check the workflow logs in GitHub Actions tab.
