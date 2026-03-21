variable "name" {
  type = string
}
variable "filename" {
  type = string
}
variable "timeout" {
  type = number
}
variable "memory_size" {
  type = number
}
variable "environment" {
  type    = map(string)
  default = {}
}
variable "vpc_id" {
  type = string
}
variable "subnet_ids" {
  type = list(string)
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "alarm_sns_arn" {
  description = "SNS topic ARN for error alarm notifications. If empty, alarm is created without notifications."
  type        = string
  default     = ""
}