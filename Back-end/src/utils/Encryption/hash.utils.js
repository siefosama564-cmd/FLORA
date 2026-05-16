import bcrypt from "bcrypt"

export const hash = async ({
    plainText="",
    saltRounds=Number(process.env.SALTROUNDS)
}={}) => {
    return await bcrypt.hash(plainText,saltRounds)
}

export const compare = async ({
    hash="",
    plainText=""
}) => {
    return await bcrypt.compare(plainText,hash)
}