import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Sorting = createParamDecorator(
  (
    data: { defaultSortBy: string; defaultSortOrder: string },
    ctx: ExecutionContext,
  ): { sortBy: string; sortOrder: string } => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    let sortBy = data.defaultSortBy || 'createdAt';
    let sortOrder = data.defaultSortOrder || 'DESC';
    if (query.sortBy != null && query.sortBy != undefined) {
      sortBy = query.sortBy;
    }
    if (query.sortOrder != null && query.sortOrder != undefined) {
      sortOrder = query.sortOrder;
    }
    return {
      sortBy,
      sortOrder,
    };
  },
);
