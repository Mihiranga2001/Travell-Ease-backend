import mongoose from "mongoose";
import express from "express";
import User from "../models/User.js";
import { createUser, deleteUser, getUsers, updateUser } from "../controllers/userController.js";

const userRouter = express.Router()// express create a extra village for me

userRouter.get("/",getUsers);

userRouter.post("/",createUser);

userRouter.delete("/",deleteUser);

userRouter.put("/",updateUser);

export default userRouter;