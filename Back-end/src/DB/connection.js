import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            serverSelectionTimeoutMS: 3000
        })
        console.log("Database connected successfully ")
    } catch (error) {
        console.error("Failed to connect to DB ")
        console.error(error.message)
    }
}
