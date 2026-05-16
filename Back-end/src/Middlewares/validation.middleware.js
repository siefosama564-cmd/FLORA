import joi from "joi";
import mongoose, { Types } from "mongoose";
import { genderEnum } from "../DB/Models/user.model.js";



export const validation = (schema) => {
  return (req, res, next) => {
    const validationError = [];
    for (const key of Object.keys(schema)) {
      const validationResults = schema[key].validate(req[key], {
        abortEarly: false,
      });
      if (validationResults.error) {
        validationError.push({ key, details: validationResults.error.details });
      }
    }
    console.log("Validation Errors:", JSON.stringify(validationError, null, 2));
    if(validationError.length){
      return res
         .status(400)
      .json({ message: "validation error", details: validationError });
    }
    return next()
  };
};
export const generalFields = {
  firstname: joi.string().max(20).min(2).messages({
    "string.min": "first name must be at least 2 charactres",
    "string.max": "first name must be at most 20 charactres",
    "any.required": "first name required",
  }),
  lastname: joi.string().min(2).max(20).messages({
    "string.min": "last name must be at least 2 charactres",
    "string.max": "last name must be at most 20 charactres",
    "any.required": "last name required",
  }),
  email: joi.string().email({
    minDomainSegments: 2,
    maxDomainSegments: 5,
    tlds: { allow: ["com", "net", "org"] },
  }),
  phone: joi
    .string()
    .pattern(/^01[0125][0-9]{8}$/)
    .messages({
      "string.pattern": "",
      "string.empty": "",
    }),
  password: joi.string(),
  confirmPassword: joi.string().valid(joi.ref("password")).messages({
    "any.only": "Confirmation password must match password",
  }),
  id: joi.string().custom((value, helper) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return helper.message("invalid id format");
    }
    return value;
  }),
  otp: joi.string(),
  gender: joi
    .string()
    .valid(...Object.values(genderEnum))
    .default(genderEnum.MALE),
  file: joi.object({
    fieldname: joi.string(),
    originalname: joi.string(),
    size: joi
      .number()
      .max(5 * 1024 * 1024)
      .messages({
        "number.max": "Image size should not exceed 5MB",
      })
      .positive(),
    mimetype: joi
      .string()
      .valid("image/jpeg", "image/png", "image/jpg")
      .messages({
        "any.only": "Only JPEG, JPG, and PNG images are allowed ",
      }),
    destination: joi.string(),
    path: joi.string(),
    finalPath: joi.string(),
  }),
};
