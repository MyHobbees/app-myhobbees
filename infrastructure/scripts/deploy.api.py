import os
import sys
import json
import zipfile
import subprocess
import boto3

ENVIRONMENTS = ['stg', 'prd']

if len(sys.argv) != 2:
    print("Usage: deploy.api.py <environment>")
    exit(-1)

env = sys.argv[1]
if env not in ENVIRONMENTS:
    print(f"Invalid environment: {env}")
    exit(-1)

home_repo = os.getcwd()
home_api = f"{home_repo}/code/api"
home_env = f"{home_repo}/environments/{env}"

with open(f'{home_env}/deploy.{env}.json', 'r') as f:
    config = json.load(f)

try:
    import dotenv
    dotenv.load_dotenv(f"{home_env}/.env.{env}.deploy")
    print("Loaded .env file")
except Exception:
    print("No .env file found")


def build_binary():
    """Cross-compile the API to a linux/arm64 `bootstrap` binary."""
    build_env = os.environ.copy()
    build_env.update({'GOOS': 'linux', 'GOARCH': 'arm64', 'CGO_ENABLED': '0'})

    result = subprocess.run(
        ['go', 'build', '-tags', 'lambda.norpc', '-o', 'dist/bootstrap', './cmd/api'],
        cwd=home_api, env=build_env
    )
    if result.returncode != 0:
        print("Go build failed")
        exit(-1)


client = boto3.client(
    'lambda',
    region_name='eu-west-3',
    aws_access_key_id=os.getenv(f"TF_{env.upper()}__AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv(f"TF_{env.upper()}__AWS_SECRET_KEY")
)


def zip_and_deploy(lambda_name):
    zip_path = f"{home_api}/dist/api.zip"
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        info = zipfile.ZipInfo('bootstrap')
        info.external_attr = 0o755 << 16
        with open(f"{home_api}/dist/bootstrap", 'rb') as f:
            zf.writestr(info, f.read())
    with open(zip_path, 'rb') as f:
        client.update_function_code(
            FunctionName=lambda_name,
            ZipFile=f.read(),
            Publish=True
        )
    print(f"Deployed Lambda: {lambda_name}")
    os.remove(zip_path)


build_binary()

app = config['APP_NAME']
zip_and_deploy(f"{app}-{env}-api")
