variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "task_command" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "image" {
  type = string
}

variable "environment" {
  type    = map(string)
  default = {}
}

variable "secrets" {
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

variable "ssm_arn_url" {
  type = string
}