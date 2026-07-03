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
  default = true
}

variable "db_app_username" {
  default = "myhobbees"
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

variable "api_url" {
  default = ""
}
