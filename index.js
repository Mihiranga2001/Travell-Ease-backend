import express from "express"
import mongoose from "mongoose"
import User from "./models/User.js"
import userRouter from "./Routes/userRouter.js"
import jwt from "jsonwebtoken"
import cors from "cors"
import dotenv from "dotenv"
dotenv.config()


const mongoURI = process.env.MONGO_URI

mongoose.connect(mongoURI).then(
    ()=>{
        console.log("connected the mongodb database")
    }
)

const app =  express()

app.use(cors())

app.use(express.json())

app.use((req,res,next)=>{
    const authorizationHeader = req.header("Authorization")
    if(authorizationHeader != null){
        const token = authorizationHeader.replace("Bearer ","")
        jwt.verify(token,process.env.JWT_SECRET_KEY,
            (error,content)=>{
                if(content == null){
                    res.status(403).json({
                        message : "invalid token"
                    })
                }else{
                    req.user = content
                    next()
                }
            
        })
    }else{
        next()
    }
})


app.use("/api/users",userRouter)

app.listen(3000,()=>{
    console.log("server is running on port 3000")
})
