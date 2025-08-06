import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Add document record
router.post('/:projectId', authenticateToken, async (req: any, res) => {
  const { documentName, s3Key, fileType } = req.body;
  const { projectId } = req.params;

  if (!documentName || !s3Key || !fileType) {
    return res.status(400).json({ message: 'Document name, S3 key, and file type are required' });
  }

  try {
    // Check if user has access to this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = project.clientId === req.user.id || project.members.length > 0;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const document = await prisma.document.create({
      data: {
        projectId,
        uploaderId: req.user.id,
        documentName,
        s3Key,
        fileType
      },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    res.status(201).json({ document });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get documents for a project
router.get('/:projectId', authenticateToken, async (req: any, res) => {
  const { projectId } = req.params;

  try {
    // Check if user has access to this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const hasAccess = project.clientId === req.user.id || project.members.length > 0;

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const documents = await prisma.document.findMany({
      where: { projectId },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update document status
router.put('/:documentId/status', authenticateToken, async (req: any, res) => {
  const { status } = req.body;
  const { documentId } = req.params;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: req.user.id }
            }
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only project owner can update document status
    if (document.project.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can update document status' });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: { status },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    res.json({ document: updatedDocument });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 