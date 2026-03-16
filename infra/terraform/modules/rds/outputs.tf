output "endpoint" {
  description = "The DNS endpoint for the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "The initial database name"
  value       = aws_db_instance.this.db_name
}

output "security_group_id" {
  description = "The security group used by the RDS instance"
  value       = aws_security_group.this.id
}

output "subnet_group" {
  description = "The DB subnet group name"
  value       = aws_db_subnet_group.this.name
}

output "identifier" {
  description = "The RDS instance identifier"
  value       = aws_db_instance.this.id
}

output "arn" {
  description = "The RDS instance ARN"
  value       = aws_db_instance.this.arn
}
