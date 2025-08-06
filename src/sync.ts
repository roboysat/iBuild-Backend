import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Offline data sync
router.post('/', authenticateToken, async (req: any, res) => {
  const { changes } = req.body;

  if (!changes || !Array.isArray(changes)) {
    return res.status(400).json({ message: 'Changes array is required' });
  }

  try {
    const results = [];
    const conflicts = [];

    for (const change of changes) {
      const { action, entity, data, timestamp } = change;

      try {
        switch (action) {
          case 'create':
            switch (entity) {
              case 'project':
                const project = await prisma.project.create({
                  data: {
                    ...data,
                    clientId: req.user.id
                  }
                });
                results.push({ id: project.id, action: 'created' });
                break;
              case 'progress_update':
                const update = await prisma.progressUpdate.create({
                  data: {
                    ...data,
                    userId: req.user.id
                  }
                });
                results.push({ id: update.id, action: 'created' });
                break;
              default:
                conflicts.push({ change, reason: 'Unknown entity type' });
            }
            break;

          case 'update':
            switch (entity) {
              case 'project':
                const updatedProject = await prisma.project.update({
                  where: { id: data.id },
                  data: data
                });
                results.push({ id: updatedProject.id, action: 'updated' });
                break;
              case 'user':
                const updatedUser = await prisma.user.update({
                  where: { id: req.user.id },
                  data: data
                });
                results.push({ id: updatedUser.id, action: 'updated' });
                break;
              default:
                conflicts.push({ change, reason: 'Unknown entity type' });
            }
            break;

          case 'delete':
            switch (entity) {
              case 'project':
                await prisma.project.delete({
                  where: { id: data.id }
                });
                results.push({ id: data.id, action: 'deleted' });
                break;
              default:
                conflicts.push({ change, reason: 'Unknown entity type' });
            }
            break;

          default:
            conflicts.push({ change, reason: 'Unknown action' });
        }
             } catch (err: any) {
         conflicts.push({ change, reason: err.message });
       }
    }

    // Get authoritative state for client
    const authoritativeState = {
      projects: await prisma.project.findMany({
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
          members: true,
          progressUpdates: true,
          documents: true
        }
      }),
      user: await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true }
      })
    };

    res.json({
      result: 'sync_completed',
      results,
      conflicts,
      authoritativeState
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 