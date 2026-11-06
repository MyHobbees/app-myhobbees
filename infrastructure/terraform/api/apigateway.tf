#######################################################
################# API Gateway #########################
#######################################################

resource "aws_apigatewayv2_api" "Api" {
  name          = "${var.app}-${var.env}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "Lambda" {
  api_id                 = aws_apigatewayv2_api.Api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.Api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "CatchAll" {
  api_id    = aws_apigatewayv2_api.Api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.Lambda.id}"
}

resource "aws_apigatewayv2_route" "Root" {
  api_id    = aws_apigatewayv2_api.Api.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.Lambda.id}"
}

resource "aws_apigatewayv2_stage" "Default" {
  api_id      = aws_apigatewayv2_api.Api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 50
    throttling_burst_limit = 100
  }
}

resource "aws_lambda_permission" "ApiGateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.Api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.Api.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_api.Api.api_endpoint
}

output "api_lambda_name" {
  value = aws_lambda_function.Api.function_name
}
