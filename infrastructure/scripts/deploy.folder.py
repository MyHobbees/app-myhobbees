import sys
import os
import json
import boto3
import mimetypes

# ------------------------------------------------------------ Inputs

FOLDERS = ['assets']
ENVIRONMENTS = ['stg', 'prd']

if len(sys.argv) != 3:
    print("Usage: deploy.folder.py <folder> <environment>")
    exit(-1)

folder = sys.argv[1]
env = sys.argv[2]

if folder not in FOLDERS:
    print(f"Invalid folder: {folder}")
    exit(-1)

if env not in ENVIRONMENTS:
    print(f"Invalid environment: {env}")
    exit(-1)

# ------------------------------------------------------------ Paths

home_repo = os.getcwd()
home_code = f"{home_repo}/code"
home_env = f"{home_repo}/environments/{env}"
home_infra = f"{home_repo}/infrastructure"
home_terraform = f"{home_repo}/infrastructure/terraform"
home_scripts = f"{home_repo}/infrastructure/scripts"

# ------------------------------------------------------------ Variables files

with open(f'{home_env}/deploy.{env}.json', 'r') as config_file:
    config = json.load(config_file)

try:
    import dotenv
    dotenv.load_dotenv(f"{home_env}/.env.{env}.deploy")
    print(f"Loaded .env file")
except:
    print(f"No .env file found")

# ------------------------------------------------------------ Methods

def execute(command):
    if os.system(command) != 0:
        exit(-1)


def upload_to_s3(bucket_name, folder_path):
    try:
        client = boto3.client(
            's3',
            aws_access_key_id=os.getenv(f"TF_{env.upper()}__AWS_ACCESS_KEY"),
            aws_secret_access_key=os.getenv(f"TF_{env.upper()}__AWS_SECRET_KEY")
        )

        for root, dirs, files in os.walk(folder_path):
            for filename in files:
                try:
                    extension = os.path.splitext(filename)[-1]
                    content_type = mimetypes.types_map[extension]
                except Exception:
                    content_type = 'text/plain'

                local_path = os.path.join(root, filename)
                relative_path = os.path.relpath(local_path, folder_path)
                client.upload_file(local_path, bucket_name, relative_path, ExtraArgs={
                    'ContentType': content_type,
                    'ACL': "public-read"
                })
        
        print(f"Folder uploaded to S3")
    except:
        print(f"Error uploading to S3")
        exit(-1)

# ------------------------------------------------------------ Script

# Deploy folder to S3
upload_to_s3(f"{config['APP_NAME']}-{env}-{folder}", f"{home_code}/{folder}")
