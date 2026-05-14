import express from "express"
import mongoose from "mongoose"
import User from "./models/User.js"
import userRouter from "./Routes/userRouter.js"


const mongoURI = "mongodb+srv://admin:123@cluster0.wqdmimu.mongodb.net/?appName=Cluster0"

mongoose.connect(mongoURI).then(
    ()=>{
        console.log("connected the mongodb database")
    }
)

const app =  express()

app.use(express.json())

app.get("/",(req,res)=>{
    //console.log(req)
    //console.log(req.body)
    //console.log("get request recieved")
    //res.json({
        //message : "good morning " + req.body.name
    //})
    User.find().then(
        (users)=>{
            res.json(users)
        }
    )
})

app.post("/",(req,res)=>{
    console.log(req.body)
    const user = new User(req.body)
    user.save().then(
        ()=>{
            res.json({
                message : "user created succesfully"
            })
            
        }
    )
})

app.use("/users",userRouter)

app.listen(3000,()=>{
    console.log("server is running on port 3000")
})
