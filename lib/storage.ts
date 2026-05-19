import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT!,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

const BUCKET = process.env.STORAGE_BUCKET ?? 'photos';

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export function publicUrl(key: string): string {
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `${process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL}/${key}`;
}
