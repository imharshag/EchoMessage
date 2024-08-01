const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const app = express();

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedUsernames = [
  "01JST21IS001",
  "01JST21IS002",
  "01JST21IS003",
  "01JST21IS004",
  "01JST21IS005",
  "01JST21IS006",
  "01JST21IS007",
  "01JST21IS008",
  "01JST21IS009",
  "01JST21IS010",
  "01JST21IS011",
  "01JST21IS012",
  "01JST21IS013",
  "01JST21IS014",
  "01JST21IS015",
  "01JST21IS016",
  "01JST21IS017",
  "01JST21IS018",
  "01JST21IS019",
  "01JST21IS020",
  "01JST21IS021",
  "01JST21IS022",
  "01JST21IS023",
  "01JST21IS024",
  "01JST21IS025",
  "01JST21IS026",
  "01JST21IS027",
  "01JST21IS028",
  "01JST21IS029",
  "01JST21IS030",
  "01JST21IS031",
  "01JST21IS032",
  "01JST21IS033",
  "01JST21IS034",
  "01JST21IS035",
  "01JST21IS036",
  "01JST21IS037",
  "01JST21IS038",
  "01JST21IS039",
  "01JST21IS040",
  "01JST21IS041",
  "01JST21IS042",
  "01JST21IS043",
  "01JST21IS044",
  "01JST21IS045",
  "01JST21IS046",
  "01JST21IS047",
  "01JST21IS048",
  "01JST21IS049",
  "01JST21IS050",
  "01JST21IS051",
  "01JST21IS052",
  "01JST21IS053",
  "01JST21IS054",
  "01JST21IS055",
  "01JST21IS056",
  "01JST21IS057",
  "01JST21IS058",
  "01JST21IS059",
  "01JST21IS060",
];

app.get("/home", async (req, res) => {
  try {
    let posts = await postModel.find().populate("user");
    res.render("home", { posts: posts });
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
  let { email, name, username, password } = req.body;

  console.log("Received data:", { email, name, username, password });

  // Check if all fields are filled
  if (!email || !name || !username || !password) {
    console.log("Error: All fields are required");
    return res.redirect(`/register?error=All fields are required`);
  }

  if (!allowedUsernames.includes(username)) {
    console.log("Error: Invalid username");
    return res.redirect(`/register?error=Invalid username`);
  }

  // Check if the username already exists
  let existingUser = await userModel.findOne({ username });
  if (existingUser) {
    console.log("Error: Username already taken");
    return res.redirect(`/register?error=Username already taken`);
  }

  let user = await userModel.findOne({ email });
  if (user) {
    console.log("Error: User already exists");
    return res.redirect(`/register?error=User already exists`);
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      console.log("Error generating salt:", err);
      return res.redirect(`/register?error=Error generating salt`);
    }

    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) {
        console.log("Error hashing password:", err);
        return res.redirect(`/register?error=Error hashing password`);
      }

      try {
        let newUser = await userModel.create({
          username,
          name,
          email,
          password: hash,
        });

        console.log("User created successfully:", newUser);

        let token = jwt.sign({ email, userid: newUser._id }, "shhh");
        res.cookie("token", token);
        return res.redirect(`/login`);
      } catch (err) {
        console.log("Error creating user:", err);
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

app.get("/profile", isloggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user });
});

app.get("/edit/:id", isloggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");

  res.render("edit", { post });
});

app.post("/update/:id", isloggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );

  res.redirect("/profile");
});

app.post("/post", isloggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    user: user._id,
    content: content,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

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
