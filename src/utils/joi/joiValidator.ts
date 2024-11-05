import { BadRequestException } from "@nestjs/common";
import Joi from "joi";

export const joiValidator = (input: any, schema: Joi.ObjectSchema<any>) => {
    const error = schema.validate(input).error;
    if (error) {
        throw new BadRequestException(error.message);
    }
    return true;
};
