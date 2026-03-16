output "cluster_id" {
  value = aws_ecs_cluster.this.id
}

output "security_group_id" {
  description = "Security group ID for the ECS task"
  value       = aws_security_group.this.id
}