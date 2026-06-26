import crypto from 'node:crypto'
import fs from 'node:fs'

const encryption_key = Buffer.from(process.env.ENCRYPTION_SECRET_KEY)
const Iv_length = Number(process.env.IV_LENGTH)
const Iv = crypto.randomBytes(Iv_length)

export const encrypt = (plaintext) => {
    const cipher = crypto.createCipheriv("aes-256-cbc", encryption_key, Iv)
    let encrypted = cipher.update(plaintext, "utf-8", "hex")
    encrypted += cipher.final("hex")
    return Iv.toString("hex") + ':' + encrypted
}

export const decrypt = (decryptdata) => {
    const [ivhex, cipherText] = decryptdata.split(":")
    const Iv = Buffer.from(ivhex, "hex")
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryption_key, Iv)
    let decrypted = decipher.update(cipherText, "hex", "utf-8")
    decrypted += decipher.final("utf-8")
    return decrypted
}

// --- Asymmetric Encryption Logic ---

const publicKeyPath = process.env.VERCEL ? "/tmp/public_key.pem" : "public_key.pem";
const privateKeyPath = process.env.VERCEL ? "/tmp/private_key.pem" : "private_key.pem";

if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
    console.log('Keys already exist');
} else {
    // التصحيح هنا: الأسامي لازم تكون publicKey و privateKey
    // وتصحيح modulusLength لـ 2048 بدلاً من 2408
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048, 
        publicKeyEncoding: {
            type: "pkcs1",
            format: "pem"
        },
        privateKeyEncoding: {
            type: "pkcs1",
            format: "pem"
        }
    })

    // كتابة الملفات بالأسامي الصحيحة
    fs.writeFileSync(publicKeyPath, publicKey)
    fs.writeFileSync(privateKeyPath, privateKey)
    console.log('New RSA Keys generated successfully');
}

export const asymtricEncryption = (plainText) => {
    const bufferedText = Buffer.from(plainText, "utf-8")
    const encryptedData = crypto.publicEncrypt({
        key: fs.readFileSync(publicKeyPath, "utf-8"),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, bufferedText)
    return encryptedData.toString("hex")
}

export const asymtricdecryption = (cipherText) => {
    const bufferedCipherText = Buffer.from(cipherText, "hex")
    const decryptedData = crypto.privateDecrypt({
        key: fs.readFileSync(privateKeyPath, "utf-8"),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    }, bufferedCipherText)
    return decryptedData.toString("utf-8")
}