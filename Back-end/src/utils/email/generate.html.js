export const template = ({code, firstName="Farmer", subject}) => `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fbf9; }
    .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0ede0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .email-header { background-color: #2d5a27; color: #ffffff; text-align: center; padding: 30px; }
    .email-header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; }
    .email-body { padding: 30px; color: #333333; line-height: 1.8; text-align: center; }
    .email-body h2 { color: #2d5a27; margin-top: 0; }
    .otp-code { display: inline-block; background-color: #f1f8f1; color: #2d5a27; border: 2px dashed #2d5a27; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: bold; margin: 25px 0; letter-spacing: 8px; }
    .email-footer { text-align: center; padding: 20px; background-color: #f4f4f4; font-size: 13px; color: #777777; border-top: 1px solid #eeeeee; }
    .email-footer a { color: #2d5a27; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>🌱 FLORA</h1>
    </div>
    <div class="email-body">
      <h2>Hello ${firstName},</h2>
      <p>We received a request regarding your account security for <strong>${subject}</strong>. Please use the following verification code:</p>
      <div class="otp-code">${code}</div>
      <p>This code is valid for a limited time. If you did not make this request, please secure your account immediately.</p>
      <p style="margin-top: 40px;">Best regards,<br><strong>FLORA Engineering Team</strong></p>
    </div>
    <div class="email-footer">
      <p>&copy; 2026 FLORA AI Project. All rights reserved.</p>
      <p><a href="#">Support Center</a> | <a href="#">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;