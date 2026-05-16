import { successResponse } from "../../utils/successResponse.js";
import * as dbServices from "../../DB/dbService.js";
import { roleEnum, userModel } from "../../DB/Models/user.model.js";
import { cloudinaryConfig } from "../../utils/multer/cloudinary.config.js";

// export const uploadProfileImage = async (req, res, next) => {
//   const { _id } = req.user;
//   if (!req.file) return next(new Error("please upload image"));

//   const user = await dbServices.findByIdAndUpdate({
//     model: userModel,
//     id: { _id },
//     data: { profileImage: req.file.finalPath },
//   });

//   return successResponse({
//     res,
//     status: 200,
//     message: "image uploaded",
//     data: {user},
//   });
// };
export const getAllUsers = async (req, res, next) => {
  const users = await dbServices.find({
    model: userModel,
  });

  return successResponse({
    res,
    status: 200,
    message: "get users success",
    data: { users },
  });
};

// export const profileImage = async (req, res, next) => {
//   const { public_id, secure_url } = await cloudinaryConfig().uploader.upload(
//     req.file.path,
//     {
//       folder: `sara7aAPP/users/${req.user._id}`,
//     },
//   );

//   const user = await dbServices.findOneAndUpdate({
//     model: userModel,
//     filter: { _id: req.user._id },
//     data: { cloudProfileImage: { public_id, secure_url } },
//   });

//   if (req.user.cloudProfileImage?.public_id) {
//     await cloudinaryConfig().uploader.destroy(
//       req.user.cloudProfileImage.public_id,
//     );
//   }

//   return successResponse({
//     res,
//     status: 201,
//     message: "image updated successfully",
//     data: { user },
//   });
// };

export const profileImage = async (req, res, next) => {
  if (!req.file) {
    return next(new Error("Please upload an image", { cause: 400 }));
  }
  const { secure_url, public_id } = await cloudinaryConfig().uploader.upload(
    req.file.path,
    {
      folder: `Sara7aApp/users/${req.user._id}`,
    },
  );

  const user = await dbServices.findByIdAndUpdate({
    model: userModel,
    id: req.user._id,
    data: { cloudProfileImage: { secure_url, public_id } },
  });

  if (req.user.cloudProfileImage?.public_id) {
    await cloudinaryConfig().uploader.destroy(
      req.user.cloudProfileImage.public_id,
    );
  }

  return successResponse({
    res,
    status: 201,
    message: "image updated successfully",
    data: { user },
  });
};

export const coverImages = async (req, res, next) => {
  let attachments = [];
  for (const file of req.files) {
    const { secure_url, public_id } = await cloudinaryConfig().uploader.upload(
      file.path,
      {
        folder: `sara7aApp/users/${req.user._id}`,
      },
    );
    attachments.push({ secure_url, public_id });
  }

  const user = await dbServices.findOneAndUpdate({
    model: userModel,
    filter: { _id: req.user._id },
    data: { cloudCoverImages: attachments },
  });

  return successResponse({
    res,
    status: 201,
    message: "cover images updated successfully",
    data: { user },
  });
};

// export const freezeAccount = async (req, res, next) => {
//   const { userId } = req.params;
//   if (userId && req.user.role !== roleEnum.ADMIN) {
//     return next(new Error("you are not authorized to freeze Account"));
//   }

//   const updateUser = await dbServices.findOneAndUpdate({
//     model: userModel,
//     filter: { _id: userId || req.user._id, freezeAt: { $exists: false } },
//     data: { freezeAt: Date.now(), freezeBy: req.user._id },
//   });
//   return updateUser
//     ? successResponse({
//         res,
//         status:200,
//         message: "account freezed successfully",
//         data: { user: updateUser },
//       })
//     : next(new Error("invalid account"));
// };

export const freezeAccount = async (req, res, next) => {
  const { userId } = req.params;

  if (userId && role.user !== roleEnum.ADMIN) {
    return next(
      new Error("you are not authorized to freeze account", { cause: 403 }),
    );
  }

  const updateUser = await dbServices.findOneAndUpdate({
    model: userModel,
    filter: { _id: userId || req.user._id },
    data: { freezeAt: Date.now(), freezeBy: req.user._id },
  });

  return updateUser
    ? successResponse({
        res,
        status: 200,
        message: "account freezed successfully",
        data: { user: updateUser },
      })
    : next(new Error("invalid account"));
};

// export const restoreAccount = async (req, res, next) => {
//   const { userId } = req.params;
//   if (userId && req.user.role !== roleEnum.ADMIN) {
//     return next(new Error("you are not authorized to freeze Account"));
//   }

//   const updateUser = await dbServices.findOneAndUpdate({
//     model: userModel,
//     filter: {
//       _id: userId || req.user._id,
//       freezeAt: { $exists: true },
//       freezeBy: { $exists: true },
//     },
//     data: {
//       $unset: {
//         freezeAt: true,
//         freezeBy: true,
//       },
//       restoreAt: new Date(),
//       restoredBy: req.user._id,
//     },
//   });
//   return updateUser
//     ? successResponse({
//         res,
//         status,
//         message: "account restored successfully",
//         data: { user: updateUser },
//       })
//     : next(new Error("invalid account"));
// };

export const restoreAccount = async (req, res, next) => {
  const { userId } = req.params;
  if (userId && role.user !== roleEnum.ADMIN) {
    return next(
      new Error("you are not authorized to restore this account", {
        cause: 403,
      }),
    );
  }

  const checkUser = await dbServices.findOneAndUpdate({
    model: userModel,
    filter: {
      _id: userId || req.user._id,
      freezeAt: { $exists: true },
      freezeBy: { $exists: true },
    },
    data: { $unset: { freezeBy: true, freezeAt: true } },
  });
  return checkUser
    ? successResponse({
        res,
        message: "account restored successfully",
        data: { checkUser },
      })
    : next(
        new Error("you are not authorized to restore this account", {
          cause: 403,
        }),
      );
};
