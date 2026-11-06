# Infrastructure

## Tooling

- Terraform, version pinned via `tfenv`, state in a shared S3 backend (`AWS__TFSTATE_BUCKET`/`AWS__TFSTATE_REGION`)
- Split into three independent modules under `infrastructure/terraform/`: `fronts`, `database`, `api`, each applied separately per environment by `infrastructure/scripts/terraform.py <module> <stg|prd>`

## Topology

```mermaid
flowchart TD
    cf1[CloudFront] --> s3app[S3: app + back-office]
    cf2[CloudFront] --> s3assets[S3: assets, public]
    apigw[API Gateway HTTP API] --> lambda[Lambda: Go api, arm64]
    lambda --> rds[(RDS Postgres)]
    rds --- sg[security group: 5432 from allowed CIDRs]
```

## Conventions

- Most resources in `fronts` and `api` (the S3 buckets/CloudFront distributions, the Lambda function, the API Gateway) are written but commented out in the `.tf` files; only the `database` module's VPC lookup, security group, parameter group, and subnet group are live. Enabling a resource is a deliberate uncomment-and-apply step, not automatic.
- `www-shop` has no Terraform of its own; it deploys through Shopify Oxygen instead.
