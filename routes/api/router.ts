import { Router } from 'express';

// controllers
import ControllerAuth from '../../controllers/api/ControllerAuth';
// middlewares
import MiddlewareAuth from '../../middlewares/Auth';


import ServiceAuth from '../../services/ServiceAuth';

// repositories
import RepoUsers from '../../repositories/RepoUsers';


const router = Router();

const middlewareAuth = new MiddlewareAuth();

// Auth
const repoUser = new RepoUsers();
const serviceAuth = new ServiceAuth(repoUser);
const controllerAuth = new ControllerAuth(serviceAuth);

// auth
router.post('/auth/login', controllerAuth.login());
router.post(
  '/auth/register-admin',
  middlewareAuth.authorizeSuperAdmin,
  controllerAuth.registerAdmin()
);


export default router;
