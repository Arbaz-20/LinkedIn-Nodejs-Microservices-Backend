import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { searchController } from '../controllers/search.controller';
import { searchQuery, autocompleteQuery } from '../validators/search.validators';

export const searchRouter = Router();

// Identity is injected by the gateway; every route requires an authenticated user.
searchRouter.use(requireUser);

searchRouter.get('/users', validate({ query: searchQuery }), asyncHandler(searchController.users));
searchRouter.get('/posts', validate({ query: searchQuery }), asyncHandler(searchController.posts));
searchRouter.get('/jobs', validate({ query: searchQuery }), asyncHandler(searchController.jobs));
searchRouter.get('/companies', validate({ query: searchQuery }), asyncHandler(searchController.companies));
searchRouter.get(
  '/autocomplete',
  validate({ query: autocompleteQuery }),
  asyncHandler(searchController.autocomplete),
);
