resource "aws_acm_certificate" "BackOffice" {
  provider          = aws.us_east_1
  domain_name       = var.back_office_domain
  validation_method = "DNS"

  # AWS destroys a DNS-validated certificate left in PENDING_VALIDATION for
  # 72h. Until the validation CNAME below is live at the registrar, every
  # fronts apply in that window just recreates it with a fresh validation
  # record — harmless (this resource has no dependents yet), but expected.
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

# Not consumed by this phase: the step-2 CloudFront wiring will reference
# aws_acm_certificate.BackOffice.arn directly in HCL, not this output. Kept
# so the ARN is visible in `terraform apply`/CI logs without a separate
# `terraform output` call.
output "back_office_cert_arn" {
  value = aws_acm_certificate.BackOffice.arn
}
