#######################################################
################# Media buckets (S3) ##################
#######################################################

resource "aws_iam_role_policy" "LambdaMedia" {
  name = "${var.app}-${var.env}-media"
  role = aws_iam_role.LambdaApi.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
      ]
      Resource = [
        "arn:aws:s3:::${var.app}-${var.env}-video/*",
        "arn:aws:s3:::${var.app}-${var.env}-images/*",
      ]
    }]
  })
}
