import User from "../models/User.js";
import bcrypt from "bcrypt";

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
                res.json({
                    message: "Login successful",
                    user: user,
                });
            } else {
                res.status(401).json({
                    message: "Invalid credentials",
                });
            }
        }
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

