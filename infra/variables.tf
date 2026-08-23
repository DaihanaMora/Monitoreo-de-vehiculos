variable "github_repo" {
  description = "Repositorio de GitHub conectado al proyecto de Vercel, formato \"usuario/repo\"."
  type        = string
  default     = "DaihanaMora/Monitor-de-Veh-culo-en-Tiempo-Real"
}

variable "traccar_server_url" {
  description = "Servidor Traccar de destino del proxy serverless."
  type        = string
  default     = "https://demo4.traccar.org"
}
