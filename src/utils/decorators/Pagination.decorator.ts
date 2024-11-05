import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Pagination = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): { page: number; limit: number; offset: number } => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    let page = 1;
    let limit = 10;
    if (query.all != null && query.all != undefined) {
      return {
        page: undefined,
        limit: undefined,
        offset: undefined,
      };
    }
    if (query.page != null && query.page != undefined) {
      page = parseInt(query.page as string);
    }
    if (query.limit != null && query.limit != undefined) {
      limit = parseInt(query.limit as string);
    }
    const offset = (page - 1) * limit;
    return {
      page,
      limit,
      offset,
    };
  },
);
