import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Find workers by skill/location
router.get('/', authenticateToken, async (req: any, res) => {
  const { skill, location, role } = req.query;

  try {
    const whereClause: any = {
      primaryRole: { not: 'client' }
    };

    if (role) {
      whereClause.primaryRole = role;
    }

    if (skill) {
      whereClause.profile = {
        skills: {
          path: ['$.' + skill],
          not: null
        }
      };
    }

    if (location) {
      whereClause.location = {
        path: ['$.city'],
        equals: location
      };
    }

    const workers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        primaryRole: true,
        profilePictureUrl: true,
        location: true,
        profile: {
          select: {
            skills: true,
            experienceYears: true,
            isVerified: true,
            bio: true
          }
        },
        createdAt: true
      },
      orderBy: [
        { profile: { isVerified: 'desc' } },
        { createdAt: 'desc' }
      ]
    });

    res.json({ workers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get worker details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const worker = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        fullName: true,
        primaryRole: true,
        profilePictureUrl: true,
        location: true,
        profile: {
          select: {
            skills: true,
            experienceYears: true,
            isVerified: true,
            bio: true,
            licenseNumber: true
          }
        },
        projects: {
          where: { status: 'completed' },
          select: {
            id: true,
            title: true,
            status: true,
            ratings: {
              where: { rateeId: req.params.id },
              select: {
                ratingValue: true,
                comment: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Calculate average rating
    const allRatings = worker.projects.flatMap(project => project.ratings);
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, rating) => sum + rating.ratingValue, 0) / allRatings.length 
      : 0;

    res.json({ 
      worker: {
        ...worker,
        averageRating: Math.round(averageRating * 10) / 10,
        totalProjects: worker.projects.length,
        totalReviews: allRatings.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 