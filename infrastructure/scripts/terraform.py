import os
import sys
import json

# ------------------------------------------------------------ Inputs
SERVICES = ['fronts', 'database', 'api']
ENVIRONMENTS = ['stg', 'prd']
SERVICE_SECRETS = {
    'database': ['db_password'],
    'api':      ['db_app_password', 'jwt_secret', 'shopify_store_domain', 'shopify_client_id', 'shopify_client_secret', 'admin_email', 'admin_password_hash']
}

if len(sys.argv) != 3:
  print('Usage: terraform.py <service> <environment>')
  exit(-1)

service = sys.argv[1]
env = sys.argv[2]

if service not in SERVICES:
  print(f"Invalid service: {service}")
  exit(-1)

if env not in ENVIRONMENTS:
  print(f"Invalid environment: {env}")
  exit(-1)

def execute(command):
  if os.system(command) != 0:
    exit(-1)

def tf_var(name, value):
  return f"-var='{name}={value}'"

# ------------------------------------------------------------ Paths
home_repo = os.getcwd()
home_code = f"{home_repo}/code"
home_env = f"{home_repo}/environments/{env}"
home_infra = f"{home_repo}/infrastructure"
home_terraform = f"{home_repo}/infrastructure/terraform"
home_scripts = f"{home_repo}/infrastructure/scripts"

# ------------------------------------------------------------ Variables files
with open(f'{home_env}/terraform.{env}.json', 'r') as config_file:
    config = json.load(config_file)

try:
    import dotenv
    dotenv.load_dotenv(f"{home_env}/.env.{env}.terraform")
    print(f"Loaded .env file")
except:
    print(f"No .env file found")

# ------------------------------------------------------------ Script

# clear
execute(f"cd {home_terraform}/{service} && rm -rf .terraform tmp variables.*.tf")

# import varaibles.tf
execute(f"cd {home_terraform}/ && cp {home_env}/variables.{env}.tf ./{service}/.")

execute(f"tfenv use {config['TERRAFORM_VERSION']}")

backend_bucket = os.getenv("AWS__TFSTATE_BUCKET")
backend_key = f"{config['APP_NAME']}/{env}/terraform.{service}.tfstate"
backend_region = os.getenv("AWS__TFSTATE_REGION")
backend_access_key = os.getenv(f"TF_{env.upper()}__AWS_ACCESS_KEY")
backend_secret_key = os.getenv(f"TF_{env.upper()}__AWS_SECRET_KEY")
backend_config = f'-backend-config="bucket={backend_bucket}" -backend-config="key={backend_key}" -backend-config="region={backend_region}" -backend-config="access_key={backend_access_key}" -backend-config="secret_key={backend_secret_key}"'

execute(f"cd infrastructure/terraform/{service} && terraform init {backend_config}")

for secret in SERVICE_SECRETS.get(service, []):
    if not os.getenv(f"TF_{env.upper()}__{secret.upper()}"):
        print(f"Missing environment variable: TF_{env.upper()}__{secret.upper()}")
        exit(-1)

apply_vars = [
    tf_var("aws_access_key", backend_access_key),
    tf_var("aws_secret_key", backend_secret_key),
] + [
    tf_var(secret, os.getenv(f"TF_{env.upper()}__{secret.upper()}"))
    for secret in SERVICE_SECRETS.get(service, [])
]

execute(f"cd infrastructure/terraform/{service} && terraform apply --auto-approve {' '.join(apply_vars)}")

execute(f"cd {home_terraform}/{service} && rm -rf .terraform tmp variables.*.tf")