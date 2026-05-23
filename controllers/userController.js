import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function getAllUsers(req,res){
    if(!isAdmin(req)){
		res.status(401).json({
			message : "Unauthorized"
		})
		return
	}

	try{
		const users = await User.find()
		res.json(users)
	}catch(error){
		res.status(500).json({
			message : "Error fetching users",
			error : error.message
		})
	}
}

export function createUser(req,res){
    const data = req.body;

    const hashedPassword = bcrypt.hashSync(data.password,10);

    const user = new User({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phoneNumber: data.phoneNumber,
        profilePhoto: data.profilePhoto,
        bio: data.bio,
        location: data.location,
        interests: data.interests,
        isVerified: data.isVerified,
        isBlocked: data.isBlocked
    });

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

export function loginUser(req, res) {
	const email = req.body.email;
	const password = req.body.password;
	User.find({ email: email }).then((users) => {
		if (users[0] == null) {
			res.status(404).json({
				message: "User not found",
			});
		} else {
			const user = users[0];

			if (user.isBlocked) {
				res.status(403).json({
					message: "User is blocked. Contact admin.",
				});
				return;
			}

			const isPasswordCorrect = bcrypt.compareSync(password, user.password);

            if (isPasswordCorrect) {
                const payload = {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };

                const token = jwt.sign(payload, "secretkey2001", {
                    expiresIn: "150h",
                });

                res.json({
                    message: "Login successful",
                    token: token,
                    role: user.role,
                });
            } else {
                res.status(401).json({
                    message: "Invalid password",
                });
            }
        }
    });
}

export function isAdmin(req) {
	if (req.user == null) {
		return false;
	}
	if (req.user.role != "admin") {
		return false;
	}

	return true;
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

