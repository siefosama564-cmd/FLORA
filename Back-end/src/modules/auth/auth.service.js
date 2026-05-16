import { customAlphabet } from "nanoid";
import * as dbServices from "../../DB/dbService.js";
import { encrypt } from "../../utils/Encryption/encryption.utils.js";
import { compare, hash } from "../../utils/Encryption/hash.utils.js";
import { eventEmitter } from "../../utils/event/email.event.js";

import { successResponse } from "../../utils/successResponse.js";

import { userModel } from "../../DB/Models/user.model.js";
import { getNewLoginCredientials } from "../../utils/token/token.utils.js";
import { tokenModel } from "../../DB/models/token.model.js";
import {
  decodedToken,
  tokenTypeEnum,
} from "../../Middlewares/auth.middleware.js";

export const signUp = async (req, res, next) => {
  const { firstname, lastname, phone, email, password, confirmPassword } =
    req.body;
  const userExists = await dbServices.findOne({
    model: userModel,
    filter: { email },
  });
  if (userExists) return next(new Error("user already exists", { cause: 409 }));

  const hashPassword = await hash({ plainText: password });

  const hashPhone = encrypt(phone);

  const otp = customAlphabet("123456789", 5)();
  console.log(otp);

  const otpExpires = new Date(Date.now() + 1000 * 60 * 5);

  const user = await dbServices.create({
    model: userModel,
    data: [
      {
        firstname,
        lastname,
        phone: hashPhone,
        email,
        password: hashPassword,
        confirmEmailOTPExpires: otpExpires,
        confirmEmailOTP: await hash({ plainText: otp }),
      },
    ],
  });

  if (!user) return next(new Error("fail to create user", { cause: 400 }));
  eventEmitter.emit("confirmEmail", { to: email, otp });

  return successResponse({
    res,
    status: 201,
    message: "user created successfully",
    data: user,
  });
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await dbServices.findOne({
    model: userModel,
    filter: { email },
  });
  if (!user) return next(new Error("user not found"));

  if (!user.confirmEmail) {
    return next(new Error("Please confirm your email first", { cause: 403 }));
  }

  if (user.freezeAt)
    return next(new Error("account is frozen"), { cause: 403 });

  if (!(await compare({ hash: user.password, plainText: password })))
    return next(new Error("wrong password"));

  const { accessToken, refreshToken } = await getNewLoginCredientials(user);

  return successResponse({
    res,
    message: "welcome to Flora",
    data: {
      accessToken,
      refreshToken,
      userName: user.firstname,
      userRole: user.role,
    },
  });
};

export const confirmEmail = async (req, res, next) => {
  const { email, otp } = req.body;

  const checkUser = await dbServices.findOne({
    model: userModel,
    filter: {
      email,
      confirmEmailOTP: { $exists: true },
      confirmEmailOTPExpires: { $exists: true },
    },
  });
  if (!checkUser)
    return next(
      new Error("user not found or email already exists", { cause: 400 }),
    );

  if (checkUser.confirmEmailOTPExpires < Date.now())
    return next(new Error(" otp expired", { cause: 400 }));

  if (!(await compare({ hash: checkUser.confirmEmailOTP, plainText: otp })))
    return next(new Error(" invalid", { cause: 400 }));

  await dbServices.updateOne({
    model: userModel,
    filter: { email },
    data: {
      $unset: { confirmEmailOTP: true, confirmEmailOTPExpires: true },
      $set: { confirmEmail: Date.now() },
    },
  });

  return successResponse({
    res,
    message: "email confirmed successfully",
  });
};

// export const logout = async (req, res) => {
//   const { jti, exp } = req.decoded;

//   const { _id } = req.user;

//   await dbServices.create({
//     model: tokenModel,
//     data: [
//       {
//         jwtid: jti,
//         expiresIn: new Date(exp * 1000),
//         userId: _id,
//       },
//     ],
//   });

//   return successResponse({
//     res,
//     status: 200,
//     message: "Logged out successfully",
//   });
// };

export const logout = async (req, res) => {
  const { jti, exp } = req.decoded;
  const { _id } = req.user;

  await dbServices.create({
    model: tokenModel,
    data: [
      {
        jwtid: jti,
        expiresIn: new Date(1000 * exp),
        userId: _id,
      },
    ],
  });

  return successResponse({
    res,
    status: 200,
    message: "Logged out successfully",
  });
};

// export const forgetPassword = async (req, res, next) => {
//   const { email } = req.body;
//   const otp = customAlphabet("123456789", 5)();
//   const hashOTP = await hash({ plainText: otp });

//   const expireOTP = new Date(Date.now() + 1000 * 60 * 5);

//   const user = await dbServices.findOneAndUpdate({
//     model: userModel,
//     filter: { email, confirmEmail: { $exists: true } },
//     data: { forgetPasswordOTP: hashOTP, confirmPasswordExpires: expireOTP },
//   });

//   if (!user)
//     return next(new Error("user not found or email not confirmed yet"), {
//       cause: 404,
//     });

//   eventEmitter.emit("resetPassword", { to: email, otp });

//   return successResponse({
//     res,
//     message: "check your box",
//   });
// };

// export const resetPassword = async (req, res, next) => {
//   const { email, otp, password } = req.body;
//   const user = await dbServices.findOne({
//     model: userModel,
//     filter: { email, forgetPasswordOTP: { $exists: true } },
//   });
//   if (!user)
//     return next(new Error("user not found or password already reseted"));

//   const compareOTP = await compare({
//     plainText: otp,
//     hash: user.forgetPasswordOTP,
//   });
//   if (!compareOTP) return next(new Error("invalid otp"), { cause: 400 });

//   if (user.confirmPasswordExpires < Date.now()) {
//     return next(new Error(" otp expired"), { cause: 400 });
//   }
//   const hashPassword = await hash({ plainText: password });
//   const resetPassword = await dbServices.findOneAndUpdate({
//     model: userModel,
//     filter: { email },
//     data: {
//       $unset: { forgetPasswordOTP: true, confirmPasswordExpires: true },
//       password: hashPassword,
//     },
//   });

//   return successResponse({
//     res,
//     status: 200,
//     message: "reset password successfully",
//   });
// };

export const forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  const checkUser = await dbServices.findOne({
    model: userModel,
    filter: { email, confirmEmail: { $exists: true } },
  });
  if (!checkUser)
    return next(
      new Error("user not found or email didnt confirmed yet", { cause: 400 }),
    );

  const otp = customAlphabet("1234567890", 5)();
  const otpExpires = new Date(Date.now() + 1000 * 60 * 5);
  console.log(otpExpires);
  console.log(otp);

  await dbServices.updateOne({
    model: userModel,
    filter: {
      email,
    },
    data: {
      forgetPasswordOTP: await hash({ plainText: otp }),
      confirmPasswordExpires: otpExpires,
    },
  });

  eventEmitter.emit("resetPassword", { to: email, otp });

  return successResponse({
    res,
    message: "check your box",
  });
};

export const resetPassword = async (req, res, next) => {
  const { otp, password, email } = req.body;

  const check = await dbServices.findOne({
    model: userModel,
    filter: {
      email,
      forgetPasswordOTP: { $exists: true },
      confirmPasswordExpires: { $exists: true },
    },
  });
  if (!check)
    return next(
      new Error("user not found  or password already reseted ", { cause: 400 }),
    );

  if (check.confirmPasswordExpires < Date.now())
    return next(new Error("otp expired", { cause: 400 }));

  if (!(await compare({ hash: check.forgetPasswordOTP, plainText: otp })))
    return next(new Error("invalid otp", { cause: 400 }));

  await dbServices.findOneAndUpdate({
    model: userModel,
    filter: { email },
    data: {
      $unset: { forgetPasswordOTP: true, confirmPasswordExpires: true },
      $set: {confirmPassword:new Date()},
      password:await hash({plainText:password})
    },
  });

  return successResponse({
    res,
    message: "password updated successfully",
  });
};




export const refreshToken = async (req, res, next) => {
  const { user, decoded } =
    (await decodedToken({
      authorization: req.headers.authorization,
      tokenType: tokenTypeEnum.REFRESH,
      next,
    })) || {};

  if (!user) return;

  const { accessToken } = await getNewLoginCredientials(user);

  return successResponse({
    res,
    data: { accessToken },
    message: "Token refreshed successfully",
  });
};
