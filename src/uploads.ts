import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';
import AWS from 'aws-sdk';

const router = Router();
const prisma = new PrismaClient();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1'
});

// Get S3 pre-signed upload URL
router.post('/request-url', authenticateToken, async (req: any, res) => {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ message: 'File name and type are required' });
  }

  try {
    const key = `uploads/${req.user.id}/${Date.now()}-${fileName}`;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME || 'ibuildz-uploads',
      Key: key,
      ContentType: fileType,
      Expires: 3600 // 1 hour
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    res.json({
      uploadUrl,
      key
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
});

// Get S3 pre-signed download URL
router.post('/download-url', authenticateToken, async (req: any, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ message: 'File key is required' });
  }

  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME || 'ibuildz-uploads',
      Key: key,
      Expires: 3600 // 1 hour
    };

    const downloadUrl = await s3.getSignedUrlPromise('getObject', params);

    res.json({
      downloadUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate download URL' });
  }
});

export default router; 