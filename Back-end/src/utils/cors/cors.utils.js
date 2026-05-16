// cors.utils.js
export const corsOption = () => {
    return {
        origin: function (origin, callback) {
            // اسمح بأي Origin في مرحلة التطوير عشان نتخطى المشكلة
            callback(null, true);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
    };
};