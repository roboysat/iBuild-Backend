import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Create a new project
router.post('/', authenticateToken, async (req: any, res) => {
  const { title, description, location, address, estimatedBudget } = req.body;
  
  if (!title) {
    return res.status(400).json({ message: 'Project title is required' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        clientId: req.user.id,
        title,
        description,
        location: location ? JSON.parse(JSON.stringify(location)) : null,
        address,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all projects for current user
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { clientId: req.user.id },
          {
            members: {
              some: {
                userId: req.user.id
              }
            }
          }
        ]
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                primaryRole: true
              }
            }
          }
        },
        _count: {
          select: {
            documents: true,
            progressUpdates: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                primaryRole: true,
                profilePictureUrl: true
              }
            }
          }
        },
        documents: {
          include: {
            uploader: {
              select: {
                id: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        progressUpdates: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePictureUrl: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const hasAccess = project.clientId === req.user.id || 
                     project.members.some(member => member.userId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req: any, res) => {
  const { title, description, status, estimatedBudget, actualCost } = req.body;

  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can update project' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title: title || undefined,
        description: description || undefined,
        status: status || undefined,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
        actualCost: actualCost ? parseFloat(actualCost) : undefined
      }
    });

    res.json({ project: updatedProject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', authenticateToken, async (req: any, res) => {
  const { userId, roleInProject } = req.body;

  if (!userId || !roleInProject) {
    return res.status(400).json({ message: 'User ID and role are required' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.clientId !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can add members' });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: req.params.id,
        userId,
        roleInProject
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            primaryRole: true,
            profilePictureUrl: true
          }
        }
      }
    });

    res.status(201).json({ member });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'User is already a member of this project' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Add progress update
router.post('/:id/progress', authenticateToken, async (req: any, res) => {
  const { updateText, photoUrl } = req.body;

  if (!updateText) {
    return res.status(400).json({ message: 'Update text is required' });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
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

    const update = await prisma.progressUpdate.create({
      data: {
        projectId: req.params.id,
        userId: req.user.id,
        updateText,
        photoUrl
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true
          }
        }
      }
    });

    res.status(201).json({ update });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get marketplace projects (for service providers)
router.get('/marketplace/open', authenticateToken, requireRole(['architect', 'contractor', 'interior_designer']), async (req: any, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: 'planning',
        clientId: { not: req.user.id } // Don't show own projects
      },
      include: {
        client: {
          select: {
            id: true,
            fullName: true,
            primaryRole: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 