const ADMIN_USERNAME = "admin"
const ADMIN_PASSWORD = "1234"

const express = require('express');
const app = express();
const port = process.env.port || 3000;

const mongoose = require('mongoose');
const multer = require('multer')
const nodemailer = require('nodemailer')
const session = require('express-session')

require('dotenv').config();

async function main() {
    // await mongoose.connect('mongodb://127.0.0.1:27017/bookstore')
    await mongoose.connect(process.env.MONGODB_URI)
}

main()
    .then(() => { console.log("DB Connected") })
    .catch((err) => { console.log(err) })


const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    authorName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },

    description: {
        type: String
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String
    }


});
const Book = mongoose.model("Book", bookSchema);

const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());




app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next()
    } else {
        res.redirect('/admin/login');
        // res.send('Access Denied')
    }
}


app.get('/', (req, res) => {
    res.render('home.ejs');
});

app.get('/admin/login', (req, res) => {
    // res.render('adminlogin')
    if (req.session.isAdmin) {
        return res.redirect('/books');
    }
    res.render('adminlogin', { isAdmin: false });
})

app.post('/admin/login', (req, res) => {
    const username = req.body.username
    const password = req.body.password

    if (username == ADMIN_USERNAME && password == ADMIN_PASSWORD) {
        req.session.isAdmin = true
        // res.redirect('/books')
        return res.send(`<script>
                alert("Admin Login Successful!");
                window.location.href = "/books";
            </script>`);
    }

    else {
        res.send(`<script>
            alert("Invalid Username or Password!");
            window.location.href = "/admin/login";
        </script>`);
    //     res.send("Invalid username or password")
    } 
})

app.get('/admin/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
})


app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.get('/books', async (req, res) => {
    const books = await Book.find()
    res.render('books', { books, isAdmin: !!req.session.isAdmin });
});

app.get('/books/new', isAdmin,(req, res) => {
    res.render('newbook')
});

app.post('/books/new', isAdmin, upload.single('img'), async (req, res) => {
    const book = new Book({
        title: req.body.title,
        authorName: req.body.authorName,
        price: req.body.price,
        description: req.body.description,
        category: req.body.category,
        image: '/uploads/' + req.file.filename
        // image: req.file ? '/uploads/' + req.file.filename : ''
    })
    await book.save()
    res.redirect('/books')
});
app.get('/books/edit/:id', isAdmin, async (req, res) => {
    const book = await Book.findById(req.params.id);

    if (!book) {
        return res.status(404).send('Book not found');
    }

    res.render('editbook', { book });
});

app.post('/books/:id/edit', isAdmin, async (req, res) => {

    await Book.findByIdAndUpdate(
        req.params.id,
        {
            title: req.body.title,
            authorName: req.body.authorName,
            price: req.body.price,
            description: req.body.description,
            category: req.body.category
        }
    );
    res.redirect('/books');
});

app.post('/books/delete/:id', isAdmin, async (req, res) => {
    await Book.findByIdAndDelete(req.params.id);
    res.redirect('/books');

});


app.get('/category', async (req, res) => {
    const books = await Book.find()
    const category = [...new Set(books.map(book => book.category))];
    res.render('category', { books, category })

});
app.get('/category/:category', async (req, res) => {
    const category = req.params.category
    const books = await Book.find({ category: category })
    res.render('category', { books })
})



const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'deepika9950sharma@gmail.com',
        pass: 'oyge hnma qrtf besu'
    }
})

app.get('/contact', (req, res) => {
    res.render('contact')
});

app.post('/contact', (req, res) => {

    const name = req.body.name
    const email = req.body.email
    const mob = req.body.mob
    const message = req.body.message

    transport.sendMail({
        to: 'deepika9950sharma@gmail.com',
        subject: 'New Message',
        text:
            `  
            Name:${name}
            Email:${email}
            Mobile:${mob}
            Message:${message}
        `
    }).then(() => {
        console.log(err)
        res.send("Error not set")
    })
        .catch((err) => {
            res.send(`
            <script>
                alert("Message sent successfully!");
                window.location.href = "/contact";
            </script>
        `);
        })
});



// Cart Page
app.get('/cart', (req, res) => {
    res.render('cart');
});

// Get cart books from MongoDB
app.post('/cart/details', async (req, res) => {
    try {
        const ids = req.body.ids || [];

        const books = await Book.find({
            _id: { $in: ids }
        });

        res.json(books);
    } catch (error) {
        res.status(500).json({
            message: 'Error loading cart books'
        });
    }
});



app.listen(port, () => {
    console.log(`Server run Succesfully ${port}`);
});