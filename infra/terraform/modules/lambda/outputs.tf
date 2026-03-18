output "lambda_arn" {
  value = aws_lambda_function.this.arn
}

output "function_name" {
  value = aws_lambda_function.this.function_name
}

output "invoke_arn" {
  value = aws_lambda_function.this.invoke_arn
}

output "security_group_id" {
  description = "Security group ID for the Lambda function"
  value       = aws_security_group.this.id
}

output "role_name" {
  description = "IAM role name for the Lambda function"
  value       = aws_iam_role.this.name
}