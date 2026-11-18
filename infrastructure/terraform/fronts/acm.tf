resource "aws_acm_certificate" "BackOffice" {
  provider          = aws.us_east_1
  domain_name       = var.back_office_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

output "back_office_cert_validation_name" {
  value = tolist(aws_acm_certificate.BackOffice.domain_validation_options)[0].resource_record_name
}

output "back_office_cert_validation_value" {
  value = tolist(aws_acm_certificate.BackOffice.domain_validation_options)[0].resource_record_value
}

output "back_office_cert_validation_type" {
  value = tolist(aws_acm_certificate.BackOffice.domain_validation_options)[0].resource_record_type
}

output "back_office_cert_arn" {
  value = aws_acm_certificate.BackOffice.arn
}
