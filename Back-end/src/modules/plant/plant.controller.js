import { Router } from "express";
import * as plantServices from "./plant.service.js";
import { validation } from "../../Middlewares/validation.middleware.js";
import * as plantValidators from "./plant.validate.js";
import { authentication } from "../../Middlewares/auth.middleware.js";
import { localFileUpload, fileValidation } from "../../utils/multer/local.multer.js"; // تأكد من المسار عندك
import { cloudFileUploadMulter } from "../../utils/multer/cloud.multer.js";

const router = Router();

router.post("/diagnose",
    authentication(), 
    cloudFileUploadMulter({
        validation: ["image/jpeg", "image/png", "image/jpg"] 
    }).single("plantImage"), 
    validation(plantValidators.diagnoseSchema), 
    plantServices.diagnosePlant
);

router.get("/history",
    authentication(),
    plantServices.getMyHistory
);


router.get("/:id",
    authentication(),
    validation(plantValidators.getByIdSchema),
    plantServices.getPlantDetails
);

export default router;