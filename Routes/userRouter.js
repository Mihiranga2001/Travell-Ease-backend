import mongoose from "mongoose";
import express from "express";
import User from "../models/User.js";
import { createUser, loginUser, deleteUser, getAllUsers, updateUser } from "../controllers/userController.js";

const userRouter = express.Router()// express create a extra village for me

userRouter.get("/",getAllUsers);

userRouter.post("/",createUser);

userRouter.post("/login",loginUser);

userRouter.delete("/",deleteUser);

userRouter.put("/",updateUser);

export default userRouter;