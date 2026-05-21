import User from "../models/User.js";

export function getUsers(req,res){
    User.find().then((users) => {
        res.json(users);
    })
    .catch(()=>{
        res.status(500).json({
            message: "Failed to fetch users"
        });
    });
}

export function createUser(req,res){

    const user = new User(req.body);
    user.save().then(() => {
        res.json({
            message: "User created successfully"
        });
    })
    .catch(()=> {
        res.status(500).json({
            message: "Failed to create user"
        });
    });
}

export function updateUser(req,res){

    const userId = req.params.Id;
    User.findByIdAndUpdate(userId,req.body).then(() => {
        res.json({
            message : "User updated successfully"
        });
    })
    .catch(() => {
        res.status(500).json({
            message: "Failed to update user"
        });
    }); 
}

export function deleteUser(req,res){

    const userId = req.params.Id;
    User.findByIdAndDelete(userId).then(() => {
        res.json({
            message : "User deleted successfully"
        });
    })
    .catch(() => {
        res.status(500).json({
            message: "Failed to delete user"
        });
    });
}

