variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "chatcade"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "project_ssm_ps_root_path" {
  type    = string
  default = "/chatcade/prod"
}

variable "image_uri" {
  type = string
}

variable "alarm_email" {
  description = "Email address to notify when a Lambda error alarm fires. Leave empty to disable notifications."
  type        = string
  default     = "REDACTED_EMAIL"
}