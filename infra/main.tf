# ==========================================================================
# IaC del despliegue — provider oficial de Terraform para Vercel
# (vercel/vercel, verificado v5.10.0 vigente en registry.terraform.io,
# mantenido por Vercel mismo). Declara el proyecto y sus variables de
# entorno como código en vez de configurarlos a mano en el dashboard.
#
# Sigue siendo Vercel Hobby (gratis, sin tarjeta) — este Terraform no
# despliega a ninguna plataforma de pago; solo gestiona la configuración
# del mismo proyecto Vercel que ya existe.
#
# Requiere: variable de entorno VERCEL_API_TOKEN (Account Settings → Tokens
# en vercel.com) al correr `terraform init && terraform plan`.
# ==========================================================================

terraform {
  required_version = ">= 1.7"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.10"
    }
  }
}

provider "vercel" {
  # El token se toma automáticamente de la variable de entorno
  # VERCEL_API_TOKEN — no se hardcodea aquí.
}

resource "vercel_project" "monitor" {
  name        = "monitor-vehiculo-tiempo-real"
  framework   = "vite"
  node_version = "22.x" # mismo runtime pinneado en el Dockerfile (spine)

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = "main"
  }

  environment = [
    {
      key    = "TRACCAR_SERVER_URL"
      value  = var.traccar_server_url
      target = ["production", "preview", "development"]
    }
  ]
}

output "vercel_project_id" {
  value = vercel_project.monitor.id
}

output "vercel_project_url" {
  value = "https://${vercel_project.monitor.name}.vercel.app"
}
