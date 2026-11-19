#######################################################
################# Lambda API ##########################
#######################################################

data "archive_file" "Placeholder" {
  type        = "zip"
  output_path = "${path.module}/../../../code/api/placeholder.zip"

  source {
    filename = "bootstrap"
    content  = "#!/bin/sh\necho 'placeholder - deploy with deploy.api.py'\nexit 1\n"
  }
}

resource "aws_iam_role" "LambdaApi" {
  name = "${var.app}-${var.env}-api-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "LambdaBasicExecution" {
  role       = aws_iam_role.LambdaApi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "Api" {
  name              = "/aws/lambda/${var.app}-${var.env}-api"
  retention_in_days = 7
}

resource "aws_lambda_function" "Api" {
  function_name = "${var.app}-${var.env}-api"
  role          = aws_iam_role.LambdaApi.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 512

  filename         = data.archive_file.Placeholder.output_path
  source_code_hash = data.archive_file.Placeholder.output_base64sha256

  environment {
    variables = {
      APP_ENV     = var.env
      DB_HOST     = var.db_host
      DB_PORT     = tostring(var.db_port)
      DB_NAME     = "${replace(var.app, "-", "_")}_${var.env}"
      DB_USERNAME = var.db_app_username
      DB_PASSWORD = var.db_app_password
      JWT_SECRET  = var.jwt_secret

      SHOPIFY_STORE_DOMAIN  = var.shopify_store_domain
      SHOPIFY_CLIENT_ID     = var.shopify_client_id
      SHOPIFY_CLIENT_SECRET = var.shopify_client_secret

      ADMIN_EMAIL         = var.admin_email
      ADMIN_PASSWORD_HASH = var.admin_password_hash

      CREDENTIAL_SHARE_SECRET = var.credential_share_secret

      POSTHOG_PERSONAL_API_KEY = var.posthog_personal_api_key
      POSTHOG_PROJECT_ID       = var.posthog_project_id
      POSTHOG_HOST             = var.posthog_host

      STAGING_DB_IDENTIFIER = var.env == "prd" ? "${var.app}-stg-database" : ""
      GITHUB_ACTIONS_TOKEN  = var.env == "prd" ? var.github_actions_token : ""

      MEDIA_VIDEO_BUCKET = "${var.app}-${var.env}-video"
      MEDIA_IMAGE_BUCKET = "${var.app}-${var.env}-images"

      MEDIA_VIDEO_CDN_DOMAIN = var.media_video_cdn_domain
      MEDIA_IMAGE_CDN_DOMAIN = var.media_image_cdn_domain

      CLOUDFRONT_VIDEO_KEY_ID      = var.cloudfront_video_key_id
      CLOUDFRONT_VIDEO_PRIVATE_KEY = var.cloudfront_video_private_key
    }
  }

  depends_on = [aws_cloudwatch_log_group.Api]

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
