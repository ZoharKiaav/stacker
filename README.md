<div align="center">
  <a href="https://proniit.co.za">
    <img src="https://proniit.co.za/wp-content/uploads/2026/02/proniit-cloud-vps-managed-web-hosting-logo-250.png" alt="Open Source Alternative to Vercel, Netlify and Heroku. built on Dokploy for VPStack™ Deployment." width="100%"  />
  </a>
  </br>
</div>
<br />
# 🚀 Stacker™

**Stacker** is a Proniit Cloud (Pty) Ltd fork of Dokploy, reimagined as a practical, self-hosted PaaS for launching business-ready application stacks — fast, repeatable, and client-ready.

Stacker™ is being built as the engine behind **Stacker™ One-Click Deployment** — curated, one-click VPStacks™ tailored for small businesses, B2B workflows, and managed cloud services.

### 🧭 Product vs Platform — short and clear

**VPStack™ = Product (what you deploy).**  
A VPStack™ is a *curated, deployable bundle* — apps, config, domains, secrets, health checks, and support notes packaged as a repeatable product for customers or clients.

**Stacker™ = Platform (what runs the products).**  
Stacker™ is the *PaaS and tooling* that authors, validates, deploys, and manages VPStacks™ across infrastructure.

**Why this matters:** VPStacks are the customer-facing SKUs you ship; Stacker is the control plane that makes one-click delivery possible.

---

### 🔍 Quick comparison table

| **Aspect** | **VPStack™ (Product)** | **Stacker™ (Platform)** |
|---|---:|---:|
| **What it is** | Packaged bundle of apps, config, domains, secrets, docs | PaaS tooling, registry, CLI/API, and orchestration engine |
| **Audience** | SMEs, agencies, clients who need ready solutions | Operators, maintainers, platform builders |
| **Contents** | Containers; env vars; routes; runbooks | Deployment engine; validation; automation; routing |
| **Role** | Deployed and operated for customers | Authoring, provisioning, and lifecycle management |
| **Reusability** | Template for repeatable business workflows | Hosts and delivers VPStack templates at scale |

---

### 🧩 What is a VPStack™?

A **VPStack™** is more than a single app — it's a **business-purpose bundle** that packages everything needed to run a real-world solution:

- **Apps**; Docker containers and services
- **Configuration**; environment variables and secrets
- **Routing**; domains, TLS, and public URLs
- **Health checks**; monitoring and readiness probes
- **Support notes**; docs and runbooks for operators
- **Repeatable templates**; for common business workflows

**Why VPStacks** — because launching a website plus CRM plus billing should feel like one click, not a week of DevOps.
---

### ✨ Key Features

- **Self-hosted**: Run on your infrastructure or a managed provider.  
- **Docker-first**: Designed around containerized apps and stacks.  
- **Business-ready**: Curated stacks for SMEs and agencies.  
- **One-click intent**: Templates that reduce setup friction.  
- **Registry of VPStacks**: A growing library of repeatable, tested templates.

---

### 🔧 Status 

**Active development** by Proniit Cloud (Pty) Ltd.  
Not yet recommended as a general public distribution — we’re polishing branding, docs, security, and provisioning flows before a broad release. Expect steady improvements and early-adopter guidance.

---

### 🛠️ Maintainer

**Proniit Cloud (Pty) Ltd**  
Website: https://proniit.co.za · https://proniit.com  
Project lead: **Zohar Kiaav** — https://zoharkiaav.co.za

---

### 📦 Stacks™ — curated multi-app bundles

**Stacks™** are opinionated, curated VPStacks™ built for practical business use:

- Designed for SMEs that want tools, not DevOps  
- Include apps, domains, secrets, and support notes  
- Packaged to be mapped to billing and provisioning systems

**Example use cases:** client onboarding bundles, marketing site + CRM + analytics, support portal + ticketing + knowledge base.

---

### ⚙️ Current workflow

1. **Define** the stack in `stack.json`.  
2. **Manually test** deployment in VPStacker.  
3. **Verify** app URLs, secrets, routes, and health checks.  
4. **Map** the stack to a FOSSBilling product.  
5. **Automate** provisioning only after manual proof is reliable.

This keeps reliability high while we build automation safely.

---

### 🌱 First stack

**ClientOps Starter** — a starter VPStack designed to get a client-facing operations suite online quickly.

---

### 🗺️ Diagram — how VPStacks and Stacker fit together

  [ VPStack™ (product) ]  <-- defined in stack.json, includes apps/config/docs
            │
            │  packaged templates / registry
            ▼
  [ Stacker™ (platform) ]  <-- registry, CLI/API, validation, orchestration
            │
            │  deploys to
            ▼
  [ Node(s) / Cluster ]  <-- Docker runtime, Traefik routing, storage, TLS
            │
            ▼
  End users / Clients (websites, APIs, dashboards)

---

### 🤝 Get involved

Want to help shape VPStacks, test templates, or contribute docs and examples? Open a PR, file an issue, or reach out via the Proniit channels. Early contributors help steer the project and get first access to new templates.

---

### Quick links 🔗

- GitHub: https://github.com/ZoharKiaav/stacker  
- Proniit: https://proniit.co.za

---

**Stacker™** — make deployments delightful again. 🚀