import express from "express"

let app =  express()

app.use(express.json())

app.get("/",(req,res)=>{
    console.log(req)
    console.log(req.body)
    console.log("get request recieved")
    res.json({
        message : "good morning " + req.body.name
    })
})

app.listen(3000,()=>{
    console.log("server is running on port 3000")
})
