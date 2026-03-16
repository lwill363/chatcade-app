variable "name" { type = string }

variable "lambda_integrations" {
  description = "Map of route keys to lambda targets"
  type = map(object({
    function_name = string
    invoke_arn    = string
  }))
}

variable "throttling_burst_limit" {
  description = "Maximum concurrent requests allowed (token bucket burst)"
  type        = number
  default     = 200
}

variable "throttling_rate_limit" {
  description = "Steady-state requests per second allowed"
  type        = number
  default     = 100
}