import { Router } from "express";
import * as messageServices from './message.service.js'; 
import { validation } from "../../Middlewares/validation.middleware.js";
import * as messageValidators from "./message.validate.js";
import { authentication } from "../../Middlewares/auth.middleware.js";

const router = Router();

// 1. تجربة الـ Router
router.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to FLORA Chat System' });
});

// 2. إرسال رسالة
// التأكد إن الـ sendMessageSchema متوافق مع (content, conversationId)
router.post('/send',
    authentication(), 
    validation(messageValidators.sendMessageSchema),
    messageServices.sendMessage
);

// 3. جلب كل المحادثات (اللازمة للقائمة الجانبية في الفرونت)
router.get('/conversations',
    authentication(),
    messageServices.getUserConversations
);

// 4. جلب رسايل محادثة معينة (History)
router.get('/history/:conversationId',
    authentication(),
    validation(messageValidators.getChatHistorySchema),
    messageServices.getChatHistory
);

export default router;