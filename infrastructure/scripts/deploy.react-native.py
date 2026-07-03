import sys
import os
import json
import boto3
import mimetypes

# ------------------------------------------------------------ Inputs
BUCKET_NAMES = {
    'www-app': 'app'
}
FOLDERS = ['www-app']
ENVIRONMENTS = ['stg', 'prd']

if len(sys.argv) != 3:
    print("Usage: deploy.react-native.py <folder> <environment>")
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


def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv(f"TF_{env.upper()}__AWS_ACCESS_KEY"),
        aws_secret_access_key=os.getenv(f"TF_{env.upper()}__AWS_SECRET_KEY")
    )


def get_cloudfront_client():
    return boto3.client(
        'cloudfront',
        aws_access_key_id=os.getenv(f"TF_{env.upper()}__AWS_ACCESS_KEY"),
        aws_secret_access_key=os.getenv(f"TF_{env.upper()}__AWS_SECRET_KEY")
    )


def clear_s3(bucket_name):
    try:
        client = get_s3_client()
        response = client.list_objects_v2(Bucket=bucket_name)

        if 'Contents' in response:
            objects = [{'Key': obj['Key']} for obj in response['Contents']]
            client.delete_objects(Bucket=bucket_name, Delete={'Objects': objects})
            print(f"Bucket {bucket_name} cleared")
        else:
            print(f"Bucket {bucket_name} is already empty")
    except Exception as e:
        print(f"Error clearing S3: {e}")
        exit(-1)


def clear_cache_cdn(cdn_id):
    try:
        client = get_cloudfront_client()

        client.create_invalidation(
            DistributionId=cdn_id,
            InvalidationBatch={
                'Paths': {
                    'Quantity': 1,
                    'Items': ['/*']
                },
                'CallerReference': str(hash(f"clear-cache-{cdn_id}-{os.urandom(16)}"))
            }
        )
        print(f"Cache cleared for CDN {cdn_id}")
    except Exception as e:
        print(f"Error clearing cache for CDN {cdn_id}: {e}")
        exit(-1)


def upload_to_s3(bucket_name, folder_path):
    try:
        client = get_s3_client()

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
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        exit(-1)

# ------------------------------------------------------------ Script

bucket_suffix = BUCKET_NAMES.get(folder, folder)
bucket_name = f"{config['APP_NAME']}-{env}-{bucket_suffix}"
project_path = f"{home_code}/{folder}"
dist_path = f"{project_path}/dist"

execute(f"cd {project_path} && npm install")

# Bake the API base URL into the web build (Expo public env convention).
os.environ["EXPO_PUBLIC_API_URL"] = config.get("API_URL", "")

# Expo web export -> static site in dist/
execute(f"cd {project_path} && npx expo export --platform web")

# Clear existing S3 contents
clear_s3(bucket_name)

# Deploy folder to S3
upload_to_s3(bucket_name, dist_path)

# Clear CDN cache
clear_cache_cdn(config[f"{bucket_suffix.upper().replace('-', '_')}_CDN_ID"])
