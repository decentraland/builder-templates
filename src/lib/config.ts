import dotenv from "dotenv";
dotenv.config();

export const BUILDER_SERVER_URL = process.env.BUILDER_SERVER_URL!;
export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
export const S3_REGION = process.env.S3_REGION!;
export const S3_UPLOAD_CONCURRENCY =
  parseInt(process.env.S3_UPLOAD_CONCURRENCY || "20") || 20;
export const AWS_ACCESS_SECRET = process.env.AWS_ACCESS_SECRET!;
export const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
export const AWS_STORAGE_URL = process.env.AWS_STORAGE_URL;
