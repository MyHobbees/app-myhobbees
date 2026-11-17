#######################################################
################# Staging DB control (prd only) #######
#######################################################

# Deliberate, narrow exception to stg/prd isolation: lets the prd Lambda
# start the stopped stg RDS instance from the back-office. Scoped to
# exactly 3 actions on exactly 1 instance ARN — never rds:* or a wildcard
# resource. See aidd_docs/memory/infra.md.

data "aws_caller_identity" "current" {}

resource "aws_iam_role_policy" "StagingControl" {
  count = var.env == "prd" ? 1 : 0

  name = "${var.app}-${var.env}-staging-control"
  role = aws_iam_role.LambdaApi.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "rds:StartDBInstance",
        "rds:StopDBInstance",
        "rds:DescribeDBInstances",
      ]
      Resource = "arn:aws:rds:${var.aws_app_region}:${data.aws_caller_identity.current.account_id}:db:${var.app}-stg-database"
    }]
  })
}
