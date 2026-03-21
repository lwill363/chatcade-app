resource "aws_security_group" "this" {
  name        = "${var.name}-lambda-sg"
  description = "Security group for ${var.name} Lambda"
  vpc_id      = var.vpc_id

  # Lambda almost always needs outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-lambda-sg"
  }
}

resource "aws_iam_role" "this" {
  name = "${var.name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_exec_basic_access" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_exec_vpc_access" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "this" {
  depends_on = [aws_cloudwatch_log_group.this]
  function_name = var.name

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.this.id]
  }

  runtime     = "nodejs24.x"
  handler     = "index.handler"
  role        = aws_iam_role.this.arn
  timeout     = var.timeout
  memory_size = var.memory_size

  # Your zip file from CI/CD
  filename         = var.filename
  source_code_hash = filebase64sha256(var.filename)

  environment {
    variables = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "${var.name}-errors"
  alarm_description   = "Lambda errors for ${var.name}"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = var.name }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alarm_sns_arn != "" ? [var.alarm_sns_arn] : []
  ok_actions    = var.alarm_sns_arn != "" ? [var.alarm_sns_arn] : []
}