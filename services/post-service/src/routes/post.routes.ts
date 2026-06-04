import { Router } from 'express';
import { asyncHandler, validate, requireUser } from '@linkedin-clone/shared';
import { postController } from '../controllers/post.controller';
import { reactionController } from '../controllers/reaction.controller';
import { commentController } from '../controllers/comment.controller';
import { hashtagController } from '../controllers/hashtag.controller';
import {
  createPostSchema,
  updatePostSchema,
  idParams,
  commentIdParams,
  hashtagNameParams,
  feedQuery,
  reactSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../validators/post.validators';

export const postRouter = Router();

// Identity injected by the gateway; all post routes require an authenticated user.
postRouter.use(requireUser);

// ─── Feed & hashtags (literal paths first) ─────────────────
postRouter.get('/feed', validate({ query: feedQuery }), asyncHandler(postController.feed));
postRouter.get('/hashtags/trending', asyncHandler(hashtagController.trending));
postRouter.get('/hashtags/:name', validate({ params: hashtagNameParams, query: feedQuery }), asyncHandler(hashtagController.byName));

// ─── Comment edit/delete (two-segment literal before /:id) ─
postRouter.put('/comments/:commentId', validate({ params: commentIdParams, body: updateCommentSchema }), asyncHandler(commentController.update));
postRouter.delete('/comments/:commentId', validate({ params: commentIdParams }), asyncHandler(commentController.remove));

// ─── Posts ─────────────────────────────────────────────────
postRouter.post('/', validate({ body: createPostSchema }), asyncHandler(postController.create));
postRouter.get('/:id', validate({ params: idParams }), asyncHandler(postController.getById));
postRouter.put('/:id', validate({ params: idParams, body: updatePostSchema }), asyncHandler(postController.update));
postRouter.delete('/:id', validate({ params: idParams }), asyncHandler(postController.remove));

// ─── Reactions ─────────────────────────────────────────────
postRouter.post('/:id/react', validate({ params: idParams, body: reactSchema }), asyncHandler(reactionController.react));
postRouter.delete('/:id/react', validate({ params: idParams }), asyncHandler(reactionController.unreact));

// ─── Comments on a post ────────────────────────────────────
postRouter.get('/:id/comments', validate({ params: idParams, query: feedQuery }), asyncHandler(commentController.list));
postRouter.post('/:id/comments', validate({ params: idParams, body: createCommentSchema }), asyncHandler(commentController.create));
