import express from 'express';
import * as authenticateToken from '../middleware/authenticateToken';
import * as uploadHandler from '../middleware/uploadHandler';
import * as adminController from '../controllers/adminController';
import * as adminFileController from '../controllers/adminFileController';
import * as userController from '../controllers/userController';

const router = express.Router();

/* Admin Sign Up */
router.post('/admin/signup', adminController.signUp);
/* Admin Sign In */
router.post('/admin/signin', adminController.signIn);
/* Admin Sign Out */
router.post('/admin/signout', adminController.signOut);
/* Admin Refresh Token */
router.post('/admin/refresh_token', adminController.refreshToken);

/* Admin Upload Files */
router.post(
  '/admin/files',
  authenticateToken.isAdmin,
  uploadHandler.upload.array('images', 5),
  uploadHandler.convertImage,
  uploadHandler.errorHandling,
  adminFileController.upload,
);

/* User Sign Up */
router.post('/user/signup', userController.signUp);
/* User Sign In */
router.post('/user/signin', userController.signIn);
/* User Sign Out */
router.post('/user/signout', userController.signOut);
/* User Refresh Token */
router.post('/user/refresh_token', userController.refreshToken);

export default router;
