# IaC — despliegue en Vercel

Este directorio declara el proyecto de Vercel (framework, runtime de Node,
repositorio conectado, variables de entorno) como código con el provider
oficial `vercel/vercel` de Terraform, en vez de configurarlo a mano en el
dashboard. Sigue apuntando a Vercel Hobby — gratis, sin tarjeta de crédito
(ver decisión en la spine de arquitectura).

## Requisitos

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.7
- Un token de API de Vercel: Account Settings → Tokens en vercel.com

## Uso

```bash
export VERCEL_API_TOKEN="tu-token"

cd infra
terraform init
terraform plan
terraform apply
```

Si el proyecto ya existe en Vercel (creado a mano antes de este IaC), hay
que importarlo primero para que Terraform no intente crear uno duplicado:

```bash
terraform import vercel_project.monitor <project-id>
```

`<project-id>` se obtiene en Project Settings → General, en el dashboard de
Vercel.

## Qué gestiona

- El proyecto (`vercel_project.monitor`): nombre, framework (`vite`),
  versión de Node (`22.x`, misma que el Dockerfile) y el repositorio de
  GitHub conectado.
- La variable de entorno `TRACCAR_SERVER_URL` para production/preview/
  development, con el mismo valor por defecto que `.env.example`.

Lo que **no** gestiona (fuera de alcance de este IaC): dominios custom,
protección por contraseña, ni ninguna configuración de equipo/facturación
— no aplica en el plan Hobby.
