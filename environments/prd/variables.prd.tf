variable "aws_access_key" {
  type = string
}

variable "aws_secret_key" {
  type = string
}

variable "aws_app_region" {
  default = "eu-west-3"
}

variable "app" {
  default = "myhobbees"
}

variable "env" {
  default = "prd"
}

variable "cdn_price_class" {
  default = "PriceClass_100"
}

variable "asset_endpoint" {
  default = "https://devd7vxbxd4bd.cloudfront.net"
}

variable "back_office_endpoint" {
  default = "https://dxmnr83d63iwn.cloudfront.net"
}

variable "back_office_domain" {
  default = "back-office.myhobbees.fr"
}

variable "app_endpoint" {
  default = "https://d11j0hqi56qruk.cloudfront.net"
}

variable "shop_endpoint" {
  default = "https://shop.myhobbees.com"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = ""
}

variable "db_username" {
  default = "myhobbees"
}

variable "db_host" {
  default = "myhobbees-prd-database.crqio8s068o9.eu-west-3.rds.amazonaws.com"
}

variable "db_port" {
  default = 5432
}

variable "db_engine_version" {
  default = "18.3"
}

variable "db_instance_class" {
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  default = 20
}

variable "db_allowed_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "db_backup_retention" {
  default = 7
}

variable "db_deletion_protection" {
  default = false
}

variable "db_app_username" {
  # Must match the role infrastructure/scripts/migrate.py::ensure_app_user
  # actually creates ("{APP_NAME}_app"), not the RDS master username
  # (var.db_username) — they used to share the same literal default, so the
  # Lambda silently authenticated as the master role with the app
  # password and failed (SQLSTATE 28P01) as soon as the two secrets diverged.
  default = "myhobbees_app"
}

variable "db_app_password" {
  type      = string
  sensitive = true
  default   = ""
}

variable "jwt_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "shopify_store_domain" {
  type    = string
  default = ""
}

variable "shopify_client_id" {
  type    = string
  default = ""
}

variable "shopify_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "admin_email" {
  type    = string
  default = ""
}

variable "admin_password_hash" {
  type      = string
  sensitive = true
  default   = ""
}

variable "credential_share_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "posthog_personal_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "posthog_project_id" {
  type    = string
  default = ""
}

variable "posthog_host" {
  default = "https://eu.posthog.com"
}

variable "api_url" {
  default = "https://u9xmeddydf.execute-api.eu-west-3.amazonaws.com"
}

variable "github_actions_token" {
  type      = string
  sensitive = true
  default   = ""
}
