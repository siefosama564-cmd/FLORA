import { Router } from "express";
import * as userServices from "./user.service.js";

import {
  fileValidation,
  localFileUpload,
} from "../../utils/multer/local.multer.js";

import {
  authentication,
  authorization,
  tokenTypeEnum,
} from "../../Middlewares/auth.middleware.js";
import { validation } from "../../Middlewares/validation.middleware.js";
import {
  freezeAccountSchema,
  profileImageSchema,
  restoreAccountSchema,
} from "./user.validation.js";
import { cloudFileUploadMulter } from "../../utils/multer/cloud.multer.js";
import { roleEnum } from "../../DB/Models/user.model.js";
const router = Router();

router.get("/users", authentication(), userServices.getAllUsers);

router.patch(
  "/profile-image",
  authentication(),
  // localFileUpload({ customPath: "user", validation: fileValidation.images }).single("profileImage"),
  cloudFileUploadMulter({customPath:"user",validation:fileValidation.images}).single("profileImage"),
userServices.profileImage
);



router.patch(
  "/cover-images",
  authentication(),

//   localFileUpload({
//     customPath: "User",
//     validation: fileValidation.documents,
//   }).array("coverImages",4),
//   validation(profileImageSchema),
cloudFileUploadMulter({customPath:"users",validation:fileValidation.images}).array("coverImages",3),
  userServices.coverImages,
);



router.delete('/freeze-account',
    authentication({tokenType: tokenTypeEnum.ACCESS}),
    authorization({accesRoles: [roleEnum.USER, roleEnum.ADMIN]}),
    validation(freezeAccountSchema),
    userServices.freezeAccount
);

// 2. للآدمين (تجميد يوزر آخر) - المسار: /user/freeze-account/ID_بتاع_اليوزر
router.delete('/freeze-account/:userId',
    authentication({tokenType: tokenTypeEnum.ACCESS}),
    authorization({accesRoles: [roleEnum.USER, roleEnum.ADMIN]}),
    validation(freezeAccountSchema),
    userServices.freezeAccount
);


router.delete("/:userId/restore-account",
    authentication({ tokenType: tokenTypeEnum.ACCESS }),
    authorization({ accessRoles: [roleEnum.USER, roleEnum.ADMIN] }),
    validation(restoreAccountSchema),
    userServices.restoreAccount
)


export default router;
