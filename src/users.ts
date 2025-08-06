import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true }
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user profile
router.put('/me', authenticateToken, async (req: any, res) => {
  const { fullName, phoneNumber, profile } = req.body;
  
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName || undefined,
        phoneNumber: phoneNumber || undefined,
        profile: profile ? {
          upsert: {
            create: {
              bio: profile.bio,
              skills: profile.skills,
              experienceYears: profile.experienceYears,
              licenseNumber: profile.licenseNumber
            },
            update: {
              bio: profile.bio,
              skills: profile.skills,
              experienceYears: profile.experienceYears,
              licenseNumber: profile.licenseNumber
            }
          }
        } : undefined
      },
      include: { profile: true }
    });
    
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (for viewing profiles)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        primaryRole: true,
        profilePictureUrl: true,
        profile: {
          select: {
            skills: true,
            experienceYears: true,
            isVerified: true,
            bio: true
          }
        },
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 