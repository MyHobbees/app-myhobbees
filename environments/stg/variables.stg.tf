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
  default = "stg"
}

variable "cdn_price_class" {
  default = "PriceClass_100"
}

variable "asset_endpoint" {
  default = "https://d21jy08alsmk2z.cloudfront.net"
}

variable "back_office_endpoint" {
  default = "https://d2w680tajopann.cloudfront.net"
}

variable "app_endpoint" {
  default = "https://d1r0g3y5j3csmo.cloudfront.net"
}
