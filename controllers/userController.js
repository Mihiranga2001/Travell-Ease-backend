import User from "../models/User.js";

export function getUsers(req,res){
    User.find().then((users) => {
        res.json(users);
    });
}

export function createUser(req,res){
    console.log(req.body);

    const user = new User(req.body);
    user.save().then(() => {
        res.json({
            message: "User created successfully"
        });
    });
}

export function deleteUser(req,res){
    res.json({
        message : "User deleted successfully"
    });
}

export function updateUser(req,res){
    res.json({
        message : "User updated successfully"
    });
}