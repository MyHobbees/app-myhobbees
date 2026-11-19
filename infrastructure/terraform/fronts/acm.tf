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

# Kept for CI-log visibility only — the CloudFront wiring below references
# aws_acm_certificate.BackOffice.arn directly in HCL, not this output.
output "back_office_cert_arn" {
  value = aws_acm_certificate.BackOffice.arn
}

# Both environments' certificates are already confirmed ISSUED (validated
# live against AWS before this resource was added), so this resolves on
# its first real apply instead of polling. The 10m timeout (well under the
# provider's 75m default) still protects CI if a *future* cert replacement
# (e.g. the create_before_destroy recreate above, or the ACM recycle after
# 72h pending) ever lands without its validation CNAME in place at the
# registrar first — that stays a possible operator slip, not something
# this resource can enforce on its own.
resource "aws_acm_certificate_validation" "BackOffice" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.BackOffice.arn
  validation_record_fqdns = [tolist(aws_acm_certificate.BackOffice.domain_validation_options)[0].resource_record_name]

  timeouts {
    create = "10m"
  }
}
