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
