import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_SERVICE_PROJECT_ID,
  credentials: {
    private_key: process.env.GCP_SERVICE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GCP_SERVICE_CLIENT_EMAIL,
  },
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export default bucket;
