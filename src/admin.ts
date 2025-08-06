import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Verify user (admin only)
router.post('/users/:id/verify', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  const { isVerified } = req.body;
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.profile.upsert({
      where: { userId: id },
      update: { isVerified },
      create: {
        userId: id,
        isVerified
      }
    });

    res.json({ message: `User verification status updated to ${isVerified}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        primaryRole: true,
        profilePictureUrl: true,
        createdAt: true,
        profile: {
          select: {
            isVerified: true,
            experienceYears: true,
            skills: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get platform statistics (admin only)
router.get('/stats', authenticateToken, requireRole(['admin']), async (req: any, res) => {
  try {
    const [
      totalUsers,
      totalProjects,
      verifiedUsers,
      activeProjects,
      completedProjects
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.profile.count({ where: { isVerified: true } }),
      prisma.project.count({ where: { status: 'active' } }),
      prisma.project.count({ where: { status: 'completed' } })
    ]);

    res.json({
      stats: {
        totalUsers,
        totalProjects,
        verifiedUsers,
        activeProjects,
        completedProjects
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 