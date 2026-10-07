import { Router } from 'express';
import {
  createCanvas,
  listCanvases,
  getCanvas,
  updateCanvas,
  deleteCanvas,
  restoreCanvas,
} from '../controllers/canvas.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createCanvas);
router.get('/', listCanvases);
router.get('/:id', getCanvas);
router.put('/:id', updateCanvas);
router.delete('/:id', deleteCanvas);
router.post('/:id/restore', restoreCanvas);

export default router;
