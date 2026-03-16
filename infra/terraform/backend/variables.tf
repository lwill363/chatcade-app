variable "project_name" {
  type    = string
  default = "chatcade"
}

variable "region" {
  description = "AWS region to deploy backend resources"
  type        = string
  default     = "us-east-1"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Terraform = "true"
    Owner     = "platform"
  }
}