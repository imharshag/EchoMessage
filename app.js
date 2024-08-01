const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const crypto = require('crypto');

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/home', async (req, res) => {
    try {
        let posts = await postModel.find().populate('user');
        res.render('home', { posts: posts });
    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
});

app.get("/register", (req, res) => {
    res.render("register");
  });


app.get("/", (req, res) => {
    res.redirect("/register");
  });
  

  app.post("/register", async (req, res) => {
    let { email, name, username, age, password } = req.body;
  
    // Check if all fields are filled
    if (!email || !name || !username || !age || !password) {
      return res.redirect(`/register?error=All fields are required`);
    }
  
    let user = await userModel.findOne({ email });
    if (user) {
      return res.redirect(`/register?error=User already exists`);
    }
  
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return res.redirect(`/register?error=Error generating salt`);
  
      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) return res.redirect(`/register?error=Error hashing password`);
  
        try {
          let newUser = await userModel.create({
            username,
            name,
            email,
            age,
            password: hash,
          });
  
          let token = jwt.sign({ email, userid: newUser._id }, "shhh");
          res.cookie("token", token);
          return res.redirect(`/login?success=Registration successful`);
        } catch (err) {
          return res.redirect(`/register?error=Error creating user`);
        }
      });
    });
  });
  
  

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/home");
});

app.get("/profile", isloggedIn,async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts"); 
  res.render("profile",{user});
});

app.get("/like/:id", async (req, res) => {
    // try {
        let post = await postModel.findOne({ _id: req.params.id });

        console.log(req.user)

    //     if (!post) {
    //         return res.status(404).send("Post not found");
    //     }

    //     // Ensure user is authenticated
    //     if (!req.user) {
    //         return res.status(401).send("You must be logged in to like posts");
    //     }

    //     // Handle likes for authenticated users
    //     const userId = req.user.userid;
    //     const userIndex = post.likes.indexOf(userId);

    //     if (userIndex === -1) {
    //         // Add like if not already present
    //         post.likes.push(userId);
    //     } else {
    //         // Remove like if already present
    //         post.likes.splice(userIndex, 1);
    //     }

    //     await post.save();
    //     res.redirect("/home");  // Redirect to the home page or any other page you prefer
    // } catch (error) {
    //     res.status(500).send("An error occurred");
    // }
});


app.get("/edit/:id", isloggedIn, async (req, res) =>{
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    res.render("edit", {post});
})

app.post("/update/:id", isloggedIn, async(req,res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});

    res.redirect("/profile");

})

app.post("/post", isloggedIn, async(req,res) =>{
    let user = await userModel.findOne({email: req.user.email});
    let{content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content: content
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  // Check if both email and password are provided
  if (!email || !password) {
    return res.redirect("/login?error=All fields are required");
  }

  // Check if user exists
  let user = await userModel.findOne({ email });
  if (!user) {
    return res.redirect("/login?error=Invalid email or password");
  }

  // Compare passwords
  bcrypt.compare(password, user.password, (err, result) => {
    if (err) return res.redirect("/login?error=Error comparing passwords");

    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shhh");
      res.cookie("token", token);
      return res.redirect("/profile");
    } else {
      return res.redirect("/login?error=Invalid email or password");
    }
  });
});



function isloggedIn(req, res, next) {
  if (!req.cookies.token || req.cookies.token === "") {
    return res.send("You must be logged in");
  } else {
    try {
      let data = jwt.verify(req.cookies.token, "shhh");
      req.user = data;
      next();
    } catch (err) {
      return res.status(500).send("Invalid token");
    }
  }
}

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
