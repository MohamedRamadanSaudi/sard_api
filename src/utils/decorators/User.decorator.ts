import { ExecutionContext, createParamDecorator } from '@nestjs/common';

type Payload = {
    id: string;
    email: string;
    role: string;
};


export const User = createParamDecorator(
  (data: keyof Payload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: Payload = request.user;
    return data ? user?.[data] : user;
  },
);
